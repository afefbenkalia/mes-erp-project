import smtplib
import logging
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("email_service")


# ─────────────────────────────────────────────────────────────────────────────
#  TEMPLATE PARTAGÉ
# ─────────────────────────────────────────────────────────────────────────────

def _build_email(accent: str, title: str, subtitle: str, body: str) -> str:
    """
    Génère un email HTML responsive avec la charte graphique SITEX.

    accent   : couleur de l'indicateur coloré sous le header (ex: "#22c55e")
    title    : titre principal affiché dans le header
    subtitle : sous-titre grisé sous le titre
    body     : contenu HTML inséré dans la zone blanche centrale
    """
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f1f5f9;padding:36px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;">

        <!-- ══ HEADER ══ -->
        <tr><td style="
              background:linear-gradient(150deg,#1a2c4e 0%,#243b61 55%,#2e4a78 100%);
              border-radius:14px 14px 0 0;
              padding:40px 44px 32px;
              text-align:center;">

          <!-- Logo SITEX -->
          <table cellpadding="0" cellspacing="0" border="0"
                 style="margin:0 auto 22px;">
            <tr><td style="
                  background:rgba(255,255,255,0.10);
                  border:1.5px solid rgba(255,255,255,0.22);
                  border-radius:10px;
                  padding:10px 24px;
                  text-align:center;">
              <span style="font-size:24px;font-weight:800;color:#ffffff;
                           letter-spacing:3px;line-height:1;">SITEX</span>
              <div style="font-size:10px;color:rgba(255,255,255,0.50);
                          letter-spacing:2px;text-transform:uppercase;
                          margin-top:3px;">Sousse &nbsp;·&nbsp; MES System</div>
            </td></tr>
          </table>

          <h1 style="margin:0 0 8px;font-size:21px;font-weight:700;
                     color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">
            {title}
          </h1>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.60);
                    line-height:1.5;">
            {subtitle}
          </p>

          <!-- Barre accentuée -->
          <div style="margin-top:22px;height:3px;
                      background:linear-gradient(90deg,transparent 0%,{accent} 50%,transparent 100%);
                      border-radius:2px;"></div>
        </td></tr>

        <!-- ══ CONTENU ══ -->
        <tr><td style="
              background:#ffffff;
              padding:40px 44px;
              border-left:1px solid #e2e8f0;
              border-right:1px solid #e2e8f0;">
          {body}
        </td></tr>

        <!-- ══ FOOTER ══ -->
        <tr><td style="
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-top:none;
              border-radius:0 0 14px 14px;
              padding:20px 44px;
              text-align:center;">
          <p style="margin:0 0 5px;font-size:12px;color:#94a3b8;">
            © 2026 SITEX Sousse &nbsp;·&nbsp; MES Platform v2.0
          </p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;">
            Cet email a été généré automatiquement — merci de ne pas y répondre.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
#  COMPOSANTS HTML RÉUTILISABLES
# ─────────────────────────────────────────────────────────────────────────────

def _greeting(prenom: str, nom: str) -> str:
    return f"""<p style="margin:0 0 20px;font-size:16px;color:#1e293b;font-weight:600;">
      Bonjour {prenom} {nom},
    </p>"""


def _info_row(label: str, value: str) -> str:
    return f"""
      <tr>
        <td style="padding:8px 14px 8px 0;font-size:13px;color:#64748b;
                   white-space:nowrap;vertical-align:top;width:170px;">{label}</td>
        <td style="padding:8px 0;font-size:13px;color:#1e293b;
                   font-weight:600;word-break:break-all;">{value}</td>
      </tr>"""


def _info_card(rows_html: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#f8fafc;border:1px solid #e2e8f0;
                  border-radius:10px;padding:4px 18px;margin:20px 0;">
      {rows_html}
    </table>"""


def _password_box(password: str) -> str:
    return f"""
    <div style="background:#fefce8;border:1.5px solid #fde047;border-radius:10px;
                padding:16px 20px;margin-top:10px;text-align:center;">
      <p style="margin:0 0 6px;font-size:11px;color:#92400e;
                letter-spacing:1px;text-transform:uppercase;font-weight:600;">
        Mot de passe temporaire
      </p>
      <div style="font-family:'Courier New',Courier,monospace;font-size:20px;
                  font-weight:800;color:#1a2c4e;letter-spacing:3px;
                  word-break:break-all;">
        {password}
      </div>
    </div>"""


def _alert_box(color_bg: str, color_border: str, color_text: str,
               icon: str, text: str) -> str:
    return f"""
    <div style="background:{color_bg};border-left:4px solid {color_border};
                border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:{color_text};line-height:1.5;">
        <strong>{icon}</strong>&nbsp; {text}
      </p>
    </div>"""


def _cta_button(url: str, label: str, bg: str = "#2e4a78") -> str:
    return f"""
    <table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
      <tr><td style="border-radius:9px;background:{bg};">
        <a href="{url}"
           style="display:inline-block;padding:14px 34px;font-size:15px;
                  font-weight:700;color:#ffffff;text-decoration:none;
                  letter-spacing:0.3px;border-radius:9px;">
          {label} &nbsp;→
        </a>
      </td></tr>
    </table>"""


def _divider() -> str:
    return """<div style="height:1px;background:#f1f5f9;margin:24px 0;"></div>"""


def _body_text(text: str, muted: bool = False) -> str:
    color = "#64748b" if muted else "#475569"
    return f'<p style="margin:0 0 14px;font-size:14px;color:{color};line-height:1.6;">{text}</p>'


# ─────────────────────────────────────────────────────────────────────────────
#  ENVOI SMTP MUTUALISÉ
# ─────────────────────────────────────────────────────────────────────────────

def _send(to: str, subject: str, html: str) -> None:
    """Envoie un email via SMTP. Lève une exception en cas d'échec."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.SMTP_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)


def _send_with_retry(to: str, subject: str, html: str,
                     retry_count: int, max_retries: int,
                     retry_fn) -> bool:
    """Tente l'envoi et relance jusqu'à max_retries fois en cas d'échec."""
    if not settings.SMTP_ENABLED:
        logger.warning(f"Email service désactivé — envoi ignoré pour {to}")
        return True
    try:
        _send(to, subject, html)
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"Authentification SMTP échouée : {e}")
    except smtplib.SMTPException as e:
        logger.error(f"Erreur SMTP pour {to} : {e}")
    except Exception as e:
        logger.error(f"Erreur inattendue lors de l'envoi à {to} : {e}")

    if retry_count < max_retries:
        logger.info(f"Nouvelle tentative ({retry_count + 1}/{max_retries})…")
        return retry_fn(retry_count + 1)
    return False


# ─────────────────────────────────────────────────────────────────────────────
#  1. EMAIL DE BIENVENUE
# ─────────────────────────────────────────────────────────────────────────────

def send_welcome_email(
    email: str,
    temporary_password: str,
    nom: str,
    prenom: str,
    retry_count: int = 0,
) -> bool:
    """Email de bienvenue envoyé à la création d'un compte."""
    body = f"""
      {_greeting(prenom, nom)}
      {_body_text("Bienvenue sur la plateforme <strong>MES SITEX Sousse</strong>. "
                  "Un compte a été créé pour vous par un administrateur.")}
      {_divider()}
      {_info_card(
          _info_row("Adresse e-mail", email)
      )}
      {_password_box(temporary_password)}
      {_alert_box(
          "#fefce8", "#f59e0b", "#92400e",
          "⚠️ Important",
          "Ce mot de passe est temporaire. Vous devrez le modifier dès votre première connexion."
      )}
      {_divider()}
      {_body_text("Cliquez sur le bouton ci-dessous pour accéder à la plateforme :", muted=True)}
      {_cta_button(f"{settings.FRONTEND_URL}/login", "Accéder à la plateforme")}
      {_divider()}
      {_body_text("Pour toute question, contactez votre administrateur MES.", muted=True)}
    """

    html = _build_email(
        accent="#22c55e",
        title="Bienvenue sur MES SITEX",
        subtitle="Vos identifiants de connexion",
        body=body,
    )

    def retry(n):
        return send_welcome_email(email, temporary_password, nom, prenom, n)

    result = _send_with_retry(
        email,
        "Bienvenue sur MES SITEX — Vos identifiants de connexion",
        html, retry_count, 3, retry,
    )
    if result:
        logger.info(f"Email de bienvenue envoyé à {email}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  2. EMAIL DE RÉINITIALISATION DE MOT DE PASSE
# ─────────────────────────────────────────────────────────────────────────────

def send_password_reset_email(
    email: str,
    temporary_password: str,
    nom: str,
    prenom: str,
    retry_count: int = 0,
) -> bool:
    """Email de réinitialisation de mot de passe envoyé par l'administrateur."""
    body = f"""
      {_greeting(prenom, nom)}
      {_body_text("Votre mot de passe a été <strong>réinitialisé</strong> par un administrateur. "
                  "Un nouveau mot de passe temporaire vous a été attribué.")}
      {_divider()}
      {_info_card(
          _info_row("Adresse e-mail", email)
      )}
      {_password_box(temporary_password)}
      {_alert_box(
          "#fff7ed", "#f97316", "#9a3412",
          "⚠️ Sécurité",
          "Vous devez changer ce mot de passe dès votre prochaine connexion. "
          "Ne le partagez avec personne."
      )}
      {_divider()}
      {_body_text("Cliquez sur le bouton ci-dessous pour vous connecter :", muted=True)}
      {_cta_button(f"{settings.FRONTEND_URL}/login", "Se connecter", bg="#c2410c")}
      {_divider()}
      {_body_text("Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement votre administrateur.", muted=True)}
    """

    html = _build_email(
        accent="#f97316",
        title="Réinitialisation de mot de passe",
        subtitle="Un nouveau mot de passe temporaire vous a été attribué",
        body=body,
    )

    def retry(n):
        return send_password_reset_email(email, temporary_password, nom, prenom, n)

    result = _send_with_retry(
        email,
        "MES SITEX — Réinitialisation de votre mot de passe",
        html, retry_count, 3, retry,
    )
    if result:
        logger.info(f"Email de réinitialisation envoyé à {email}")
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  3. EMAIL D'ALERTE MAINTENANCE
# ─────────────────────────────────────────────────────────────────────────────

def send_maintenance_notification_email(
    email: str,
    payload: dict,
    retry_count: int = 0,
) -> bool:
    """Email d'alerte envoyé aux techniciens lors d'un événement machine."""
    machine_ref = payload.get("machine_reference", "N/A")
    state       = payload.get("state", "N/A")
    message     = payload.get("message", "Alerte maintenance")

    state_colors = {
        "ERREUR":      ("#fef2f2", "#ef4444", "#991b1b"),
        "MAINTENANCE": ("#fff7ed", "#f97316", "#9a3412"),
        "PAUSE":       ("#f1f5f9", "#64748b", "#334155"),
    }
    bg, border, text = state_colors.get(state, ("#f1f5f9", "#64748b", "#334155"))
    accent = border

    state_label = {
        "ERREUR":      "🔴 ERREUR",
        "MAINTENANCE": "🟠 MAINTENANCE",
        "PAUSE":       "⚪ PAUSE",
        "MARCHE":      "🟢 EN MARCHE",
    }.get(state, state)

    body = f"""
      {_body_text(f"Un événement machine a été détecté sur la plateforme MES <strong>SITEX Sousse</strong>.")}
      {_divider()}
      {_info_card(
          _info_row("Machine", f"<code style='font-family:monospace;'>{machine_ref}</code>") +
          _info_row("État détecté",
                    f"<span style='background:{bg};color:{text};border:1px solid {border};"
                    f"padding:3px 10px;border-radius:99px;font-size:12px;"
                    f"font-weight:700;'>{state_label}</span>") +
          _info_row("Message", message)
      )}
      {_alert_box(
          bg, border, text,
          "ℹ️ Action requise",
          "Veuillez prendre en charge cette intervention depuis le module Maintenance de la plateforme."
      )}
      {_divider()}
      {_cta_button(f"{settings.FRONTEND_URL}/dashboard", "Ouvrir le tableau de bord", bg="#1a2c4e")}
      {_divider()}
      {_body_text("Cet email est envoyé automatiquement à chaque changement d'état critique.", muted=True)}
    """

    html = _build_email(
        accent=accent,
        title="Alerte Maintenance",
        subtitle=f"Machine {machine_ref} — état : {state}",
        body=body,
    )

    def retry(n):
        return send_maintenance_notification_email(email, payload, n)

    result = _send_with_retry(
        email,
        f"[MES SITEX] Alerte maintenance — {machine_ref} en {state}",
        html, retry_count, 3, retry,
    )
    if result:
        logger.info(f"Email d'alerte maintenance envoyé à {email} pour {machine_ref}")
    return result
