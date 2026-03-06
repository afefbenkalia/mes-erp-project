# Module Gestion des Machines

Module complet pour la gestion des machines industrielles avec suivi de l'historique des états.

## Structure

```
backend_mes/
├── app/
│   ├── core/
│   │   ├── config.py      # Configuration (DATABASE_URL)
│   │   └── database.py    # Session PostgreSQL / SQLAlchemy
│   └── modules/
│       └── machines/
│           ├── model.py   # Machine, MachineStateHistory
│           ├── schema.py  # Schémas Pydantic
│           ├── service.py # Logique métier / CRUD
│           └── router.py  # Routes API
├── scripts/
│   └── create_machines_tables.sql
├── main.py
└── README_MACHINES.md
```

## Configuration

1. Créer une base PostgreSQL `mes_db` (ou modifier `DATABASE_URL` dans `.env`).
2. Variables d'environnement (optionnel, via `.env`) :
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/mes_db
   ```

## Installation des tables

### Option A : Script SQL

```bash
psql -U postgres -d mes_db -f backend_mes/scripts/create_machines_tables.sql
```

### Option B : SQLAlchemy (main.py)

Les tables sont créées automatiquement au démarrage si `init_db()` est appelée dans `main.py`.

## Lancement de l’API

```bash
cd backend_mes
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Docs : http://localhost:8000/docs

## Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | /api/machines | Liste des machines (avec état actuel) |
| GET | /api/machines/{id} | Détail d'une machine + état actuel |
| POST | /api/machines | Créer une machine |
| PATCH | /api/machines/{id} | Modifier une machine |
| DELETE | /api/machines/{id} | Supprimer une machine |
| GET | /api/machines/{id}/current-state | État actuel (marche / arrêt / panne) |
| GET | /api/machines/{id}/state-history | Historique des états |
| POST | /api/machines/{id}/state-history | Ajouter une entrée d'historique |
| POST | /api/machines/{id}/change-state | Changer l'état (clôture l'actuel + nouveau) |
| PATCH | /api/machines/{id}/state-history/{history_id} | Mettre à jour une entrée d'historique |
| POST | /api/machines/{id}/close-current-state | Clôturer l'état en cours |

## États possibles

- `running` : en marche
- `stopped` : à l'arrêt
- `failure` : en panne

## Exemples

### Créer une machine

```json
POST /api/machines
{
  "name": "Toupie CNC 01",
  "reference": "CNC-001",
  "machine_type": "Toupie CNC",
  "description": "Toupie à commande numérique",
  "location": "Atelier A"
}
```

### Changer l’état (marche → panne)

```json
POST /api/machines/1/change-state
{
  "state": "failure",
  "comment": "Panne capteur pression"
}
```

### Réponse avec état actuel

```json
{
  "id": 1,
  "name": "Toupie CNC 01",
  "reference": "CNC-001",
  "machine_type": "Toupie CNC",
  "current_state": "running",
  "current_state_started_at": "2025-03-02T10:30:00"
}
```
