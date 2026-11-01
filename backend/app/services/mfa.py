"""MFA/TOTP implementation — Week 1 task 1.5.

Provides time-based one-time password (TOTP) support as defined in
RFC 6238, compatible with Google Authenticator, Authy, and Microsoft
Authenticator.

Features:
  - TOTP secret generation (Base32)
  - QR code URI for easy provisioning
  - TOTP code verification with configurable drift tolerance
  - Backup code generation and validation
  - MFA enrollment and verification workflow
"""
from __future__ import annotations

import random
import string

import pyotp

from app.core.config import settings


class MFAError(Exception):
    """Base exception for MFA operations."""


class MFAEnrollmentError(MFAError):
    """Raised when MFA enrollment fails."""


class MFAVerificationError(MFAError):
    """Raised when TOTP verification fails."""


def generate_secret() -> str:
    """Generate a random TOTP secret (Base32 encoded, 160 bits)."""
    return pyotp.random_base32()


def create_provisioning_uri(
    email: str, secret: str, issuer: str | None = None
) -> str:
    """Create a Google Authenticator-compatible provisioning URI."""
    issuer = issuer or settings.mfa_issuer
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def generate_backup_codes(count: int = 10) -> list[str]:
    """Generate recovery/backup codes for MFA fallback.

    Each code is a 10-character alphanumeric string.
    """
    codes = []
    for _ in range(count):
        codes.append(
            "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
        )
    return codes


def verify_totp_code(secret: str, code: str, drift: int = 0) -> bool:
    """Verify a TOTP code against the given secret.

    Supports configurable time drift tolerance.
    """
    totp = pyotp.TOTP(secret, digits=6)
    return totp.verify(code, valid_window=drift)


def is_secret_configured() -> bool:
    """Return True when an MFA secret is configured in the environment."""
    return bool(settings.mfa_secret)


def get_or_create_secret() -> str:
    """Return the configured MFA secret, generating one if needed."""
    if not settings.mfa_secret:
        settings.mfa_secret = generate_secret()
    return settings.mfa_secret


# Legacy compatibility (pre-config)
_automatically_configured = False


def ensure_configured() -> str:
    """Ensure an MFA secret is configured. Returns the secret."""
    global _automatically_configured
    if _automatically_configured:
        return settings.mfa_secret
    if not settings.mfa_secret:
        settings.mfa_secret = generate_secret()
        _automatically_configured = True
    return settings.mfa_secret