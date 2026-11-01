"""MFA/TOTP endpoints — Week 1 task 1.5.

Registration and verification of multi-factor authentication.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.models import User
from app.services import auth
from app.services.mfa import (
    generate_backup_codes,
    get_or_create_secret,
    create_provisioning_uri,
    verify_totp_code,
    MFAError,
)

# Reuse settings from app.core.config
from app.core.config import settings

router = APIRouter(prefix="/mfa", tags=["mfa"])


class MFASetupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=254)
    setup_code: str | None = Field(default=None, description="TOTP code for enrollment")


class MFAVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., min_length=6, max_length=6)
    method: str = Field(default="totp", description="Verification method (totp)")


class BackupCodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=254)


class MFAResponse(BaseModel):
    secret: str
    qr_uri: str
    QRImageDataURI: str = ""
    backup_codes: list[str] = []
    totp_drift: int = 4


class MFAVerifyResponse(BaseModel):
    success: bool
    detail: str = ""


class BackupCodeResponse(BaseModel):
    success: bool
    used_codes: list[str] = []
    remaining: int = 0


@router.post("/enroll", response_model=MFAResponse)
async def enroll_mfa(payload: MFASetupRequest, session: Annotated[AsyncSession, Depends(get_session)]):
    """Enroll a new MFA device for the user."""
    result = await session.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled for this user")

    # Generate secret
    secret = get_or_create_secret()

    # Create provisioning URI
    qr_uri = create_provisioning_uri(payload.email.lower(), secret, settings.mfa_issuer)

    # Generate backup codes
    backup_codes = []
    if settings.mfa_allow_backup_codes:
        backup_codes = generate_backup_codes(count=10)
        from app.core.encryption import encrypt
        user.mfa_backup_codes_enc = encrypt("|".join(backup_codes))

    # Store secret (encrypted)
    from app.core.encryption import encrypt as _enc
    user.mfa_secret_enc = _enc(secret)
    user.mfa_qr_enc = _enc(qr_uri)
    import datetime as _dt
    user.mfa_enabled_at = _dt.datetime.now(_dt.timezone.utc)

    await session.commit()

    # If setup_code provided, verify it
    if payload.setup_code:
        if verify_totp_code(secret, payload.setup_code, drift=settings.mfa_totp_drift):
            user.mfa_enabled = True
            import datetime as _dt
            user.mfa_verified_at = _dt.datetime.now(_dt.timezone.utc)
            await session.commit()
            return MFAResponse(
                secret=secret,
                qr_uri=qr_uri,
                backup_codes=backup_codes,
                totp_drift=settings.mfa_totp_drift,
            )
        else:
            raise HTTPException(status_code=400, detail="Setup code verification failed")

    return MFAResponse(
        secret=secret,
        qr_uri=qr_uri,
        QRImageDataURI="",
        backup_codes=backup_codes,
        totp_drift=settings.mfa_totp_drift,
    )


@router.post("/verify", response_model=MFAVerifyResponse)
async def verify_mfa(payload: MFAVerifyRequest, session: Annotated[AsyncSession, Depends(get_session)]):
    """Verify a TOTP code for MFA."""
    result = await session.execute(select(User).where(User.email == _extract_email(payload)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is not enabled for this user")

    if user.mfa_secret_enc is None:
        raise HTTPException(status_code=400, detail="MFA secret not found")

    # Decrypt secret
    from app.core.encryption import decrypt
    secret = decrypt(user.mfa_secret_enc)
    if secret is None:
        raise HTTPException(status_code=400, detail="Failed to decrypt MFA secret")

    # Verify code
    if verify_totp_code(secret, payload.code, drift=settings.mfa_totp_drift):
        import datetime as _dt
        user.mfa_verified_at = _dt.datetime.now(_dt.timezone.utc)
        await session.commit()
        return MFAVerifyResponse(success=True, detail="MFA verified")
    else:
        raise HTTPException(status_code=400, detail="Invalid MFA code")


@router.post("/backup-codes", response_model=BackupCodeResponse)
async def generate_backup_codes_endpoint(payload: BackupCodeRequest, session: Annotated[AsyncSession, Depends(get_session)]):
    """Invalidate and return new backup codes."""
    result = await session.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is not enabled for this user")

    if user.mfa_backup_codes_enc is None:
        raise HTTPException(status_code=400, detail="Backup codes not generated")

    from app.core.encryption import decrypt
    encrypted = decrypt(user.mfa_backup_codes_enc)
    if encrypted is None:
        raise HTTPException(status_code=400, detail="Failed to decrypt backup codes")

    old_codes = encrypted.split("|")

    # Generate new codes
    new_codes = generate_backup_codes(count=10)
    from app.core.encryption import encrypt
    user.mfa_backup_codes_enc = encrypt("|".join(new_codes))

    await session.commit()

    return BackupCodeResponse(
        success=True,
        used_codes=old_codes,
        remaining=len(new_codes),
    )


def _extract_email(payload: object) -> str:
    """Extract email from the request payload."""
    if isinstance(payload, dict):
        return str(payload.get("email", "")).lower()
    return ""


@router.post("/disable")
async def disable_mfa(claims: Annotated[dict, Depends(auth.require_session)], session: Annotated[AsyncSession, Depends(get_session)]):
    """Disable MFA for the current authenticated user."""
    subject = claims.get("sub", "")
    user = await auth.get_user_by_provider_sub(session, subject)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.mfa_enabled = False
    user.mfa_secret_enc = None
    user.mfa_qr_enc = None
    user.mfa_backup_codes_enc = None
    user.mfa_enabled_at = None
    user.mfa_verified_at = None
    await session.commit()
    return {"success": True, "detail": "MFA disabled"}