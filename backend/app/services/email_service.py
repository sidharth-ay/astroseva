"""Email service seam using the standard library.

This provides the delivery mechanism for password resets, email verification,
and administrative notifications. It deliberately avoids pulling in an external
SaaS SDK (like SendGrid or Resend) so that the application remains self-contained
and can use any standard SMTP provider.

During development and testing, `EMAIL_ENABLED` defaults to false: emails are
rendered and logged to stdout but not sent, so a developer can click a password
reset link in their terminal without needing SMTP credentials.
"""

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "0").lower() in ("1", "true", "yes")
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@astroseva.com")
SMTP_TLS = os.getenv("SMTP_TLS", "1").lower() in ("1", "true", "yes")


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Send an email, or log it if email is disabled.
    
    Returns True if the email was "sent" (or logged successfully), False if it
    failed. This must never raise into the request path: a failed email should
    not turn a successful user registration into a 500 error.
    """
    if not EMAIL_ENABLED:
        logger.info(
            "EMAIL DISABLED. Would have sent to %s:\n"
            "Subject: %s\n"
            "----------------------------------------\n"
            "%s\n"
            "----------------------------------------",
            to_email,
            subject,
            text_body,
        )
        return True

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(text_body)

    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        if SMTP_PORT == 465:
            # Implicit TLS
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # Explicit TLS (STARTTLS) or unencrypted
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                if SMTP_TLS:
                    server.starttls()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False
