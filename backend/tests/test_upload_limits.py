"""An oversized upload must be refused without being buffered.

`upload_document` called `file.file.read()`, which returns the whole body. The
size check in `store_file` therefore ran only after the entire file was already
in memory, so the limit rejected the upload but not the allocation.
"""

import io
import re

import pytest

from app.services.storage_service import (
    MAX_UPLOAD_BYTES,
    StorageError,
    read_upload,
)


def test_read_upload_refuses_oversize():
    """One byte over the limit is enough to reject, and is not accumulated."""
    stream = io.BytesIO(b"x" * 101)
    with pytest.raises(StorageError) as exc:
        read_upload(stream, max_bytes=100)
    assert "limit" in str(exc.value)


def test_read_upload_accepts_exactly_the_limit():
    assert read_upload(io.BytesIO(b"x" * 100), max_bytes=100) == b"x" * 100


def test_read_upload_reads_no_more_than_the_limit_plus_one():
    """The read is bounded; it must not pull the whole stream into memory."""
    stream = io.BytesIO(b"x" * (10 * 1024 * 1024))
    with pytest.raises(StorageError):
        read_upload(stream, max_bytes=1024)
    # A bounded `read(n)` leaves the rest on the stream.
    assert stream.tell() == 1025


def test_read_upload_handles_a_large_but_permitted_body():
    body = b"y" * 5000
    assert read_upload(io.BytesIO(body), max_bytes=5000) == body


def test_read_upload_defaults_to_the_configured_limit():
    assert MAX_UPLOAD_BYTES > 0
    with pytest.raises(StorageError):
        read_upload(io.BytesIO(b"z" * (MAX_UPLOAD_BYTES + 1)))


def test_store_file_still_rejects_oversize_for_other_callers():
    """The check remains for callers that build bytes some other way."""
    from app.services.storage_service import store_file

    with pytest.raises(StorageError):
        store_file("astrologers/1", "image/png", "big.png",
                   b"x" * (MAX_UPLOAD_BYTES + 1))


def test_the_endpoint_does_not_read_the_whole_body():
    """`file.file.read()` with no argument is what this guards against."""
    from pathlib import Path

    source = (
        Path(__file__).resolve().parents[1] / "app" / "api" / "astrologers.py"
    ).read_text(encoding="utf-8")
    # The comment in the file names the old call, so match a real statement:
    # a `.read()` with no argument.
    assert not re.search(r"file\.file\.read\(\)", source), (
        "the unbounded read is back in the upload endpoint"
    )
    assert "read_upload(file.file)" in source
