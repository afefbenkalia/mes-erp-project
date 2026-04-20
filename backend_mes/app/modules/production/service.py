import logging

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.production.model import Production, HistoriqueProduction
from app.modules.orders.model import OF
from . import model
from app.integrations.erp_client import send_production_to_erp

logger = logging.getLogger(__name__)


def create_production(db: Session, data):
    """
    Crée une production et déclenche la synchronisation ERP du stock.

    Ordre garanti :
      1. Vérification que l'OF existe.
      2. Création + commit + refresh de la production (prod.id est réel en BDD).
      3. Envoi vers l'ERP APRÈS db.commit() + db.refresh() → prod.id garanti non-None.
      4. Historique en base (non bloquant).

    Garantie critique :
      La production est TOUJOURS sauvegardée même si l'ERP est indisponible.
      Un échec ERP est loggué mais ne lève pas d'exception vers l'appelant.
    """

    # ── 1. Vérification de l'OF ──────────────────────────────────────────────
    of = db.query(OF).filter(OF.id == data.of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF introuvable")

    # ── 2. Création de la production en base ─────────────────────────────────
    prod = Production(
        machine=data.machine,
        produit_fini=data.produit_fini,
        fibre=data.fibre,
        quantite_produit_fini=data.quantite_produit_fini,
        quantite_matiere_premiere=data.quantite_matiere_premiere,
        operateur=data.operateur,
        debut=data.debut,
        fin=data.fin,
        of_id=of.id,
        of_numero=of.numero,
    )

    db.add(prod)
    db.commit()       # ✅ Commit avant tout appel ERP
    db.refresh(prod)  # ✅ prod.id est maintenant l'ID réel généré par la BDD

    logger.info(
        "[PRODUCTION] ✅ Sauvegardée | id=%s of_id=%s produit_fini=%s fibre=%s "
        "qte_produit=%.2f qte_matiere=%.2f",
        prod.id, prod.of_id, prod.produit_fini, prod.fibre,
        prod.quantite_produit_fini, prod.quantite_matiere_premiere,
    )
    print(f"[PRODUCTION] ✅ Production id={prod.id} sauvegardée (of_id={prod.of_id})")

    # ── 3. Synchronisation ERP (non bloquante) ───────────────────────────────
    logger.info("[PRODUCTION] → Déclenchement sync ERP pour production id=%s", prod.id)
    print(f"[PRODUCTION] → Sync ERP pour production id={prod.id} ...")

    try:
        response = send_production_to_erp(prod)

        if response is None:
            logger.error(
                "[PRODUCTION] ⚠ Sync ERP non aboutie pour production id=%s "
                "(ERP injoignable ou payload invalide). Stock ERP non mis à jour.",
                prod.id,
            )
            print(f"[PRODUCTION] ⚠ ERP injoignable — stock NON mis à jour pour production id={prod.id}")
        elif response.status_code < 400:
            logger.info(
                "[PRODUCTION] ✅ Sync ERP réussie pour production id=%s (status=%s)",
                prod.id, response.status_code,
            )
            print(f"[PRODUCTION] ✅ Stock ERP mis à jour pour production id={prod.id}")
        else:
            logger.error(
                "[PRODUCTION] ❌ ERP a rejeté la sync pour production id=%s "
                "(status=%s body=%s)",
                prod.id, response.status_code, response.text,
            )
            print(
                f"[PRODUCTION] ❌ ERP rejet status={response.status_code} "
                f"pour production id={prod.id}"
            )

    except Exception as exc:
        # Sécurité : send_production_to_erp() ne devrait jamais lever,
        # mais on capture au cas où pour protéger la production MES déjà commitée.
        logger.exception(
            "[PRODUCTION] ❌ Exception inattendue lors de la sync ERP pour production id=%s",
            prod.id,
        )
        print(f"[PRODUCTION] ❌ Exception ERP inattendue pour production id={prod.id} : {exc}")

    # ── 4. Historique (non bloquant) ─────────────────────────────────────────
    try:
        hist = HistoriqueProduction(
            machine=prod.machine,
            of_id=prod.of_id,
            quantite_produit_fini=prod.quantite_produit_fini,
            quantite_matiere_premiere=prod.quantite_matiere_premiere,
            evenement="production",
        )
        db.add(hist)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "[PRODUCTION] ⚠ Échec enregistrement historique pour production id=%s", prod.id
        )

    return prod


def create_rebut(db: Session, data):
    production = db.query(Production).filter(Production.id == data.production_id).first()
    if not production:
        raise HTTPException(status_code=404, detail="Production introuvable")

    try:
        rebut = model.Rebut(**data.dict())
        db.add(rebut)
        db.commit()
        db.refresh(rebut)

        hist = model.HistoriqueProduction(
            machine=rebut.machine,
            of_id=production.of_id,
            quantite_produit_fini=rebut.quantite,
            evenement="rebut",
        )
        db.add(hist)
        db.commit()
        return rebut

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Contrainte de base de données invalide pour ce rebut",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erreur base de données lors de la création du rebut",
        )


def get_all_rebuts(db: Session):
    return db.query(model.Rebut).all()


def create_temps(db: Session, data):
    temps = model.TempsMachine(**data.dict())
    db.add(temps)
    db.commit()
    db.refresh(temps)

    hist = model.HistoriqueProduction(
        machine=temps.machine,
        evenement="temps_machine",
    )
    db.add(hist)
    db.commit()
    return temps


def get_all_temps(db: Session):
    return db.query(model.TempsMachine).all()