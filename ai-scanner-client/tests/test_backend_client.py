import json
from uuid import UUID

import httpx

from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.models import MarkerContent

DOCUMENT_ID = UUID("15d79d83-e70c-4afb-8ab7-c291b26a2843")
MARKER_ID = UUID("4b284755-6379-420f-88be-2a67dfc7a928")
SCANNER_ID = UUID("ca3999a4-1479-41ed-b03e-604b6cd3a7a8")
OWNER_ID = UUID("bbc167e5-a0b0-4c45-ac6c-ee722ac83540")
SESSION_ID = UUID("7ebf4db5-284d-42c2-8c59-424ef0e870aa")


def test_get_identity_sends_scanner_key() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["X-Scanner-Key"] == "scn_test"
        assert request.url.path == "/scanner-auth/me"
        return httpx.Response(
            200,
            json={
                "id": str(SCANNER_ID),
                "ownerId": str(OWNER_ID),
                "name": "Pi",
                "createdAt": "2026-01-01T00:00:00Z",
                "lastSeenAt": "2026-01-02T00:00:00Z",
                "revokedAt": None,
            },
        )

    with ScannerBackendClient(
        "http://backend:3000",
        "scn_test",
        transport=httpx.MockTransport(handler),
    ) as client:
        identity = client.get_identity()

    assert identity.id == SCANNER_ID
    assert identity.owner_id == OWNER_ID


def test_update_marker_uses_backend_contract() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert request.method == "PATCH"
        assert request.url.path == f"/documents/{DOCUMENT_ID}/markers/{MARKER_ID}"
        assert body["version"] == 3
        assert body["content"] == [{"type": "inlineMath", "value": "8"}]
        return httpx.Response(
            200,
            json={
                "operationId": body["operationId"],
                "documentId": str(DOCUMENT_ID),
                "markerId": str(MARKER_ID),
                "version": 4,
                "applied": True,
            },
        )

    with ScannerBackendClient(
        "http://backend:3000",
        "scn_test",
        transport=httpx.MockTransport(handler),
    ) as client:
        result = client.update_marker(
            DOCUMENT_ID,
            MARKER_ID,
            version=3,
            content=[MarkerContent(type="inlineMath", value="8")],
        )

    assert result.version == 4
    assert result.applied is True


def test_get_active_scan_session_uses_scanner_contract() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/scanner-auth/scan-sessions/active"
        assert request.headers["X-Scanner-Key"] == "scn_test"
        return httpx.Response(
            200,
            json={
                "id": str(SESSION_ID),
                "documentId": str(DOCUMENT_ID),
                "scannerId": str(SCANNER_ID),
                "status": "active",
                "createdAt": "2026-10-05T10:00:00Z",
                "completedAt": None,
            },
        )

    with ScannerBackendClient(
        "http://backend:3000",
        "scn_test",
        transport=httpx.MockTransport(handler),
    ) as client:
        session = client.get_active_scan_session()

    assert session.id == SESSION_ID
    assert session.document_id == DOCUMENT_ID


def test_finish_scan_session_uses_scanner_contract() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "PATCH"
        assert request.url.path == f"/scanner-auth/scan-sessions/{SESSION_ID}"
        assert json.loads(request.content) == {"status": "completed"}
        return httpx.Response(
            200,
            json={
                "id": str(SESSION_ID),
                "documentId": str(DOCUMENT_ID),
                "scannerId": str(SCANNER_ID),
                "status": "completed",
                "createdAt": "2026-10-05T10:00:00Z",
                "completedAt": "2026-10-05T10:05:00Z",
            },
        )

    with ScannerBackendClient(
        "http://backend:3000",
        "scn_test",
        transport=httpx.MockTransport(handler),
    ) as client:
        session = client.finish_scan_session(SESSION_ID)

    assert session.status == "completed"
    assert session.completed_at is not None
