"""Uploads are validated against their declared content type.

`storage_service` already capped size during the read and refused path
traversal. What it did not do was check that the bytes match the content type
the client declared, so a client could send an HTML or SVG document labelled
`image/png` and have it stored and served under that type -- which is how a
stored-XSS payload reaches a reviewer's browser.

These tests assert the signature check rather than the storage mechanics.
"""

import tempfile
from pathlib import Path

import pytest

from app.services import storage_service


@pytest.fixture
def temp_storage(monkeypatch):
    """Point the storage root at a throwaway directory.

    Copied from test_marketplace_foundation.py rather than moved into conftest:
    that file is the one that established the pattern, and moving it now would
    churn a test that is not about content types.
    """
    with tempfile.TemporaryDirectory() as tmp:
        monkeypatch.setattr(storage_service, "STORAGE_ROOT", Path(tmp))
        yield Path(tmp)


@pytest.mark.parametrize(
    "content_type, payload",
    [
        ("application/pdf", b"not a pdf at all"),
        ("image/png", b"<script>alert(1)</script>"),
        ("image/jpeg", b"\x89PNG\r\n\x1a\n"),  # a PNG claiming to be a JPEG
        ("image/webp", b"RIFFxxxxNOTWEBP"),
    ],
)
def test_a_file_whose_bytes_do_not_match_its_type_is_refused(temp_storage, content_type, payload):
    with pytest.raises(storage_service.StorageError):
        storage_service.store_file("astrologers/1", content_type, "x", payload)


@pytest.mark.parametrize(
    "content_type, payload",
    [
        ("application/pdf", b"%PDF-1.4\n%test"),
        ("image/png", b"\x89PNG\r\n\x1a\n\x00\x00\x00"),
        ("image/jpeg", b"\xff\xd8\xff\xe0\x00\x10JFIF"),
        ("image/webp", b"RIFF\x00\x00\x00\x00WEBPVP8 "),
    ],
)
def test_a_file_with_a_matching_signature_is_accepted(temp_storage, content_type, payload):
    stored = storage_service.store_file("astrologers/1", content_type, "x", payload)
    assert stored.size_bytes == len(payload)


def test_an_empty_file_is_still_refused(temp_storage):
    # The signature check would pass on empty input for some types, and an empty
    # upload is never a useful document.
    with pytest.raises(storage_service.StorageError):
        storage_service.store_file("astrologers/1", "application/pdf", "x", b"")


def test_the_check_runs_before_the_size_check(temp_storage, monkeypatch):
    """A spoofed file must be rejected on signature, not on size.

    Order matters for the error the caller sees: a 20 MB file labelled as a PDF
    should be told it is not a PDF, not that it is too large.
    """
    payload = b"definitely not a pdf" * 1024 * 1024
    with pytest.raises(storage_service.StorageError, match="signature"):
        storage_service.store_file("astrologers/1", "application/pdf", "x", payload)