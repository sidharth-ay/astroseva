"""File storage for marketplace uploads.

KYC documents, credential scans and profile photos all need somewhere to live.
There is no object storage in this deployment yet, so the default backend writes
to a local directory. The seam is deliberate: when consultation recordings
arrive in a later phase, an S3-compatible backend can be added without touching
any caller, because everything goes through :func:`store_file` / :func:`open_file`
and never touches a path directly.

Nothing here is public. Uploaded files are identity documents, so every key is
namespaced by astrologer id and the directory is not served by the app.
"""

import os
import re
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path

# Outside the package so a mounted volume can be pointed at it.
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", Path(__file__).resolve().parents[2] / "storage"))

# Guard against a caller-supplied name escaping the namespace via ../ or an
# absolute path. Keys are generated, but the validator makes that guarantee
# independent of who calls this.
_SAFE_KEY = re.compile(r"^[a-z0-9]+(/[a-z0-9._-]+)+$")

# A namespace is one or more path segments, e.g. "astrologers" or "astrologers/4".
_SAFE_NAMESPACE = re.compile(r"^[a-z0-9]+(/[a-z0-9]+)*$")

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


class StorageError(Exception):
    """Raised for an invalid key, disallowed type, or oversized upload."""


@dataclass
class StoredFile:
    key: str
    original_filename: str
    content_type: str
    size_bytes: int


def _validate_key(key: str) -> None:
    if not key or not _SAFE_KEY.match(key) or ".." in key:
        raise StorageError(f"Invalid storage key: {key!r}")


def _path_for(key: str) -> Path:
    _validate_key(key)
    path = (STORAGE_ROOT / key).resolve()
    root = STORAGE_ROOT.resolve()
    # Defence in depth: even with a validated key, confirm containment.
    if not str(path).startswith(str(root)):
        raise StorageError(f"Storage key escapes the root: {key!r}")
    return path


def new_key(namespace: str, content_type: str) -> str:
    """A collision-proof key under `namespace`, e.g. 'astrologers/4/ab12.jpg'."""
    if not _SAFE_NAMESPACE.match(namespace or ""):
        raise StorageError(f"Invalid namespace: {namespace!r}")
    ext = ALLOWED_CONTENT_TYPES.get(content_type)
    if not ext:
        raise StorageError(f"Content type not allowed: {content_type}")
    return f"{namespace}/{uuid.uuid4().hex}{ext}"


def read_upload(stream, max_bytes: int | None = None) -> bytes:
    """Read an upload, refusing anything over the limit without buffering it.

    `stream.read()` with no argument returns the whole body. The endpoint did
    that, so the size check in `store_file` ran only after the entire file was
    already in memory: a client could post an arbitrarily large body and the
    server would allocate all of it before rejecting it. The limit is enforced
    here, during the read, by asking for one byte more than is permitted and
    discarding the rest without accumulating it.

    `max_bytes` defaults to `MAX_UPLOAD_BYTES`; the test suite uses it to check
    the boundary without writing a 10 MB file.
    """
    limit = MAX_UPLOAD_BYTES if max_bytes is None else max_bytes
    # One byte over the limit is enough to know it is over.
    data = stream.read(limit + 1)
    if len(data) > limit:
        raise StorageError(
            f"File is over the {limit} byte limit"
        )
    return data


def store_file(namespace: str, content_type: str, filename: str, data: bytes) -> StoredFile:
    """Persist `data`, returning its key and metadata."""
    # Enforce magic bytes based on content type to block spoofed files
    if content_type == "application/pdf" and not data.startswith(b"%PDF"):
        raise StorageError("Invalid PDF signature")
    elif content_type == "image/jpeg" and not data.startswith(b"\xff\xd8\xff"):
        raise StorageError("Invalid JPEG signature")
    elif content_type == "image/png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise StorageError("Invalid PNG signature")
    elif content_type == "image/webp" and not (data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP"):
        raise StorageError("Invalid WebP signature")
    if not data:
        raise StorageError("Refusing to store an empty file")
    # The endpoint now enforces this during the read via `read_upload`; this
    # check remains for any caller that assembles bytes some other way.
    if len(data) > MAX_UPLOAD_BYTES:
        raise StorageError(
            f"File is {len(data)} bytes, over the {MAX_UPLOAD_BYTES} byte limit"
        )
    key = new_key(namespace, content_type)
    path = _path_for(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return StoredFile(
        key=key,
        original_filename=(filename or "")[:255],
        content_type=content_type,
        size_bytes=len(data),
    )


def open_file(key: str) -> bytes:
    path = _path_for(key)
    if not path.is_file():
        raise StorageError(f"No such file: {key}")
    return path.read_bytes()


def delete_file(key: str) -> bool:
    """Delete a stored file. Returns True if something was removed."""
    path = _path_for(key)
    if path.is_file():
        path.unlink()
        return True
    return False


def delete_namespace(namespace: str) -> int:
    """Remove every file under a namespace. Used when an application is rejected."""
    if not _SAFE_NAMESPACE.match(namespace or ""):
        raise StorageError(f"Invalid namespace: {namespace!r}")
    target = (STORAGE_ROOT / namespace).resolve()
    root = STORAGE_ROOT.resolve()
    if not str(target).startswith(str(root)) or not target.is_dir():
        return 0
    count = sum(1 for p in target.rglob("*") if p.is_file())
    shutil.rmtree(target, ignore_errors=True)
    return count
