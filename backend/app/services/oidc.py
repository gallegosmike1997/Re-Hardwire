"""OIDC/OAuth2 identity provider abstraction — Week 1 task 1.1.

Provider-agnostic interface for verifying OIDC ID tokens and resolving
authenticated subject claims.
"""
from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx
import jwt


class AuthProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def issuer(self) -> str:
        pass

    @property
    @abstractmethod
    def jwks_uri(self) -> str:
        pass

    @property
    @abstractmethod
    def client_id(self) -> str:
        pass

    @property
    @abstractmethod
    def client_secret(self) -> str:
        pass

    @property
    @abstractmethod
    def authorization_endpoint(self) -> str:
        pass

    @property
    @abstractmethod
    def token_endpoint(self) -> str:
        pass

    @property
    @abstractmethod
    def userinfo_endpoint(self) -> str:
        pass

    @property
    @abstractmethod
    def supported_login_methods(self) -> list[str]:
        pass

    @property
    @abstractmethod
    def require_email_verified(self) -> bool:
        pass

    @property
    @abstractmethod
    def use_nonce(self) -> bool:
        pass

    @property
    def revocation_endpoint(self) -> Optional[str]:
        return None

    @abstractmethod
    async def get_jwks(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_userinfo(self, id_token: str, access_token: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def revoke_token(self, token: str, token_type_hint: str = "access_token") -> bool:
        pass

    @abstractmethod
    async def authenticate(self, id_token: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def normalize_subject(self, sub: str) -> str:
        pass

    @abstractmethod
    async def register_user(self, email: str, password: str, **claims: Any) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def login_user(self, email: str, password: str, login_method: str = "email_password") -> Dict[str, Any]:
        pass

    @abstractmethod
    async def is_user_registered(self, email: str) -> bool:
        pass


class OIDCAuthProvider(AuthProvider):
    def __init__(
        self,
        name: str,
        issuer: str,
        client_id: str,
        client_secret: str,
        authorization_endpoint: str,
        token_endpoint: str,
        userinfo_endpoint: str,
        *,
        jwks_uri: Optional[str] = None,
        supported_login_methods: Optional[list[str]] = None,
        require_email_verified: bool = False,
        use_nonce: bool = True,
        revoke_endpoint: Optional[str] = None,
    ) -> None:
        self._name = name
        self._issuer = issuer.rstrip("/")
        self._client_id = client_id
        self._client_secret = client_secret
        self._authorization_endpoint = authorization_endpoint
        self._token_endpoint = token_endpoint
        self._userinfo_endpoint = userinfo_endpoint
        self._jwks_uri = jwks_uri or f"{self._issuer}/.well-known/jwks.json"
        self._supported_login_methods = supported_login_methods or ["email_password"]
        self._require_email_verified = require_email_verified
        self._use_nonce = use_nonce
        self._revocation_endpoint = revoke_endpoint
        self._cache: Dict[str, Any] = {}

    @property
    def name(self) -> str:
        return self._name

    @property
    def issuer(self) -> str:
        return self._issuer

    @property
    def jwks_uri(self) -> str:
        return self._jwks_uri

    @property
    def client_id(self) -> str:
        return self._client_id

    @property
    def client_secret(self) -> str:
        return self._client_secret

    @property
    def authorization_endpoint(self) -> str:
        return self._authorization_endpoint

    @property
    def token_endpoint(self) -> str:
        return self._token_endpoint

    @property
    def userinfo_endpoint(self) -> str:
        return self._userinfo_endpoint

    @property
    def supported_login_methods(self) -> list[str]:
        return list(self._supported_login_methods)

    @property
    def require_email_verified(self) -> bool:
        return self._require_email_verified

    @property
    def use_nonce(self) -> bool:
        return self._use_nonce

    @property
    def revocation_endpoint(self) -> Optional[str]:
        return self._revocation_endpoint

    async def get_jwks(self) -> Dict[str, Any]:
        if "jwks" in self._cache:
            return self._cache["jwks"]
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(self._jwks_uri)
            resp.raise_for_status()
            self._cache["jwks"] = resp.json()
            return self._cache["jwks"]

    async def get_userinfo(self, id_token: str, access_token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                self._userinfo_endpoint,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def revoke_token(self, token: str, token_type_hint: str = "access_token") -> bool:
        if not self.revocation_endpoint:
            return False
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._revocation_endpoint,
                data={
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "token": token,
                    "token_type_hint": token_type_hint,
                },
            )
            return resp.status_code in (200, 400, 401)

    async def authenticate(self, id_token: str) -> Dict[str, Any]:
        jwks = await self.get_jwks()
        unverified_header = jwt.get_unverified_header(id_token)
        kid = unverified_header.get("kid")
        signing_key = None
        if kid:
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    signing_key = key
                    break
        if signing_key is None:
            raise ValueError("No matching JWKS key found for token")
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwt.utils.positional_to_str(signing_key))
        payload = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=self._client_id,
            issuer=self._issuer,
            options={"verify_aud": True, "verify_iss": True, "require_exp": True},
        )
        userinfo = await self.get_userinfo(id_token, payload.get("access_token", ""))
        return {
            "id_token": id_token,
            "payload": payload,
            "userinfo": userinfo,
            "issued_at": payload.get("iat") or int(time.time()),
        }

    async def normalize_subject(self, sub: str) -> str:
        return sub.strip().lower() if "@" in sub else sub

    async def register_user(self, email: str, password: str, **claims: Any) -> Dict[str, Any]:
        raise NotImplementedError("Registration is provider-specific; override in subclass.")

    async def login_user(self, email: str, password: str, login_method: str = "email_password") -> Dict[str, Any]:
        raise NotImplementedError("Login is provider-specific; override in subclass.")

    async def is_user_registered(self, email: str) -> bool:
        raise NotImplementedError("User lookup is provider-specific; override in subclass.")