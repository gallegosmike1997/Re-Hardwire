"""
Field-level encryption for sensitive per-user data (task 2.3).

Provides AES-256-GCM encryption/decryption for text fields stored in the
database. The data encryption key (DEK) is derived from a master key
(FIELD_ENCRYPTION_KEY, base64-encoded 32 bytes) using HKDF, with a random
nonce per field value.

Never log or transmit the master key. Rotate it by re-encrypting all fields
under a new key version; this module supports a single active key plus an
optional previous key for decryption during rotation.
"""
from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

#: Master key from environment (base64-encoded 32 bytes). Required in production.
_MASTER_KEY_B64 = os.getenv("FIELD_ENCRYPTION_KEY", "").strip()
#: Optional previous master key for decryption during key rotation.
_PREVIOUS_MASTER_KEY_B64 = os.getenv("FIELD_ENCRYPTION_KEY_PREVIOUS", "").strip()


def _decode_key(b64: str) -> Optional[bytes]:
    if not b64:
        return None
    try:
        return base64.b64decode(b64, validate=True)
    except Exception:
        return None


@dataclass(frozen=True)
class _KeyMaterial:
    active: Optional[bytes]
    previous: Optional[bytes]


def _key_material() -> _KeyMaterial:
    return _KeyMaterial(
        active=_decode_key(_MASTER_KEY_B64),
        previous=_decode_key(_PREVIOUS_MASTER_KEY_B64),
    )


def _derive_key(master: bytes, nonce: bytes) -> bytes:
    """Derive a per-field data encryption key from the master key + nonce."""
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=nonce,
        info=b"re-hardwire-field-encryption-v1",
    ).derive(master)


def encrypt(plaintext: str) -> str:
    """Encrypt ``plaintext`` and return a base64-encoded token.

    Token format: ``nonce.base64(ciphertext + tag)``. Raises ``ValueError``
    when no active master key is configured.
    """
    km = _key_material()
    if km.active is None:
        raise ValueError(
            "FIELD_ENCRYPTION_KEY is not configured; cannot encrypt field."
        )
    nonce = os.urandom(12)
    dek = _derive_key(km.active, nonce)
    aesgcm = AESGCM(dek)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt(token: str) -> Optional[str]:
    """Decrypt a base64-encoded token produced by :func:`encrypt`.

    Tries the active key first, then the previous key (rotation support).
    Returns ``None`` when decryption fails with all keys.
    """
    km = _key_material()
    if km.active is None and km.previous is None:
        return None
    try:
        raw = base64.b64decode(token, validate=True)
    except Exception:
        return None
    if len(raw) < 13:  # 12-byte nonce + at least 1-byte ciphertext
        return None
    nonce, ct = raw[:12], raw[12:]
    for master in (km.active, km.previous):
        if master is None:
            continue
        try:
            dek = _derive_key(master, nonce)
            aesgcm = AESGCM(dek)
            pt = aesgcm.decrypt(nonce, ct, None)
            return pt.decode("utf-8")
        except Exception:
            continue
    return None


def is_configured() -> bool:
    """Return True when an active master key is configured."""
    return _key_material().active is not None
