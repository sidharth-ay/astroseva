"""Palm image upload, validation, and the unwired analysis seam.

Uploading and analyzing are separate steps on purpose. The upload path is real
and fully validated; analysis goes through a provider seam with nothing
registered, so it answers 501 rather than inventing a reading.
"""

import io

from app.services import palmistry_service
from app.services.palmistry_service import PalmistryResult, analyze_palm

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
HTML = b"<html><body>not an image</body></html>"


def _upload(client, payload, filename="palm.png", content_type="image/png"):
    return client.post(
        "/api/v1/palmistry/upload",
        files={"file": (filename, io.BytesIO(payload), content_type)},
    )


def test_upload_accepts_a_real_png(client):
    resp = _upload(client, PNG)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["key"].startswith("palmistry/")
    assert body["key"].endswith(".png")
    assert body["content_type"] == "image/png"
    assert body["size_bytes"] == len(PNG)


def test_upload_accepts_a_real_jpeg(client):
    resp = _upload(client, JPG, filename="palm.jpg", content_type="image/jpeg")
    assert resp.status_code == 200, resp.text
    assert resp.json()["key"].endswith(".jpg")


def test_a_spoofed_content_type_is_rejected(client):
    """An HTML file labelled as a PNG must not be stored."""
    resp = _upload(client, HTML, filename="evil.png", content_type="image/png")
    assert resp.status_code == 400, resp.text


def test_a_non_image_type_is_rejected_without_reading_it(client):
    resp = _upload(
        client, b"%PDF-1.4 fake", filename="doc.pdf", content_type="application/pdf"
    )
    assert resp.status_code == 400
    assert "JPEG, PNG, or WebP" in resp.json()["detail"]


def test_analyze_without_a_provider_is_honest_about_it(client):
    """No vision model is wired, so this must say so -- not invent a reading."""
    key = _upload(client, PNG).json()["key"]
    resp = client.post("/api/v1/palmistry/analyze", params={"key": key})
    assert resp.status_code == 501, resp.text
    assert "no palmistry provider" in resp.json()["detail"].lower()


def test_analyze_rejects_an_unknown_key(client):
    resp = client.post(
        "/api/v1/palmistry/analyze", params={"key": "palmistry/9999/nope.png"}
    )
    assert resp.status_code == 404


def test_analyze_rejects_another_users_key(client, db_session):
    """Keys live under palmistry/{user_id}; guessing one must not work."""
    from app.db.models import User

    other = User(
        email="palmistry-other@example.com",
        name="Other",
        hashed_password="x",
        role="client",
    )
    db_session.add(other)
    db_session.commit()

    resp = client.post(
        "/api/v1/palmistry/analyze",
        params={"key": f"palmistry/{other.id}/forged.png"},
    )
    assert resp.status_code == 404


def test_the_seam_calls_a_registered_provider():
    """When a provider exists, the seam uses it -- and only it."""

    class Stub:
        name = "stub"
        seen = None

        def analyze(self, image_bytes, content_type):
            type(self).seen = (image_bytes, content_type)
            return PalmistryResult({"line": "life line is long"})

    palmistry_service.register_provider(Stub())
    try:
        result = analyze_palm(b"bytes", "image/png", provider="stub")
        assert result["line"] == "life line is long"
        assert Stub.seen == (b"bytes", "image/png")
    finally:
        palmistry_service._PROVIDERS.pop("stub", None)


def test_an_unknown_provider_name_is_rejected():
    import pytest

    with pytest.raises(LookupError):
        analyze_palm(b"bytes", "image/png", provider="no-such-provider")
