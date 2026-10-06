from collections.abc import Sequence
from types import TracebackType
from typing import Self
from uuid import UUID, uuid4

import httpx

from ai_scanner_client.models import (
    DocumentMarkers,
    MarkerContent,
    MarkerUpdateResult,
    ScannerIdentity,
    ScanSession,
)


class BackendRequestError(RuntimeError):
    """Raised when the scanner backend returns an unsuccessful response."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(f"Backend request failed with HTTP {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class ScannerBackendClient:
    """Typed client for the scanner-authenticated backend endpoints."""

    def __init__(
        self,
        base_url: str,
        scanner_api_key: str,
        *,
        timeout_seconds: float = 10.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not scanner_api_key:
            raise ValueError("scanner_api_key cannot be empty")
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={
                "Accept": "application/json",
                "X-Scanner-Key": scanner_api_key,
            },
            timeout=timeout_seconds,
            transport=transport,
        )

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def get_identity(self) -> ScannerIdentity:
        response = self._request("GET", "/scanner-auth/me")
        return ScannerIdentity.model_validate(response.json())

    def get_document_markers(self, document_id: UUID) -> DocumentMarkers:
        response = self._request("GET", f"/documents/{document_id}/markers")
        return DocumentMarkers.model_validate(response.json())

    def get_active_scan_session(self) -> ScanSession:
        response = self._request("GET", "/scanner-auth/scan-sessions/active")
        return ScanSession.model_validate(response.json())

    def finish_scan_session(
        self,
        session_id: UUID,
        *,
        status: str = "completed",
    ) -> ScanSession:
        response = self._request(
            "PATCH",
            f"/scanner-auth/scan-sessions/{session_id}",
            json={"status": status},
        )
        return ScanSession.model_validate(response.json())

    def update_marker(
        self,
        document_id: UUID,
        marker_id: UUID,
        *,
        version: int,
        content: Sequence[MarkerContent],
        operation_id: UUID | None = None,
    ) -> MarkerUpdateResult:
        payload = {
            "operationId": str(operation_id or uuid4()),
            "version": version,
            "content": [item.model_dump(by_alias=True) for item in content],
        }
        response = self._request(
            "PATCH",
            f"/documents/{document_id}/markers/{marker_id}",
            json=payload,
        )
        return MarkerUpdateResult.model_validate(response.json())

    def _request(self, method: str, path: str, **kwargs: object) -> httpx.Response:
        try:
            response = self._client.request(method, path, **kwargs)
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise BackendRequestError(
                error.response.status_code,
                self._response_detail(error.response),
            ) from error
        except httpx.HTTPError as error:
            raise BackendRequestError(0, str(error)) from error
        return response

    @staticmethod
    def _response_detail(response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            return response.text or response.reason_phrase
        if isinstance(body, dict) and "message" in body:
            message = body["message"]
            if isinstance(message, list):
                return "; ".join(str(item) for item in message)
            return str(message)
        return str(body)
