"""Palm image upload and (unwired) analysis endpoints."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from ..core.rate_limit import limiter
from ..db.database import get_db
from ..db.models import User
from ..services.auth_service import get_current_user
from ..services.palmistry_service import analyze_palm
from ..services.storage_service import StorageError, open_file, read_upload, store_file

router = APIRouter(prefix="/api/v1/palmistry", tags=["palmistry"])

# Palm photos only. Documents, archives and executables have no business here,
# and the storage layer would refuse most of them anyway.
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/upload")
@limiter.limit("20/minute")
async def upload_palm_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Store a palm photo and return its reference.

    Validates during the read (size) and at store time (declared type against
    magic bytes), so a renamed executable or an HTML file labelled as an image
    is rejected before anything is kept. Returns a key for `/analyze`, not a
    reading: uploading and analyzing are separate steps on purpose.
    """
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Expected a JPEG, PNG, or WebP image, got {content_type or 'unknown type'!r}.",
        )
    try:
        data = read_upload(file.file)
    except StorageError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    try:
        stored = store_file(
            f"palmistry/{user.id}", content_type, file.filename or "", data
        )
    except StorageError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {
        "key": stored.key,
        "content_type": stored.content_type,
        "size_bytes": stored.size_bytes,
    }


@router.post("/analyze")
@limiter.limit("10/minute")
async def analyze_palm_image(
    request: Request,
    key: str = Query(..., description="Storage key returned by /upload"),
    provider: str | None = Query(default=None, description="Named analysis provider"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze a previously uploaded palm photo.

    Currently answers 501: no analysis provider is registered, and returning
    anything else would mean inventing a reading. The seam
    (`services/palmistry_service.py`) is where a provider goes when one has
    been evaluated.
    """
    try:
        image_bytes = open_file(key)
    except StorageError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    # The key must belong to the caller: uploads live under palmistry/{user_id}.
    if not key.startswith(f"palmistry/{user.id}/"):
        raise HTTPException(status_code=404, detail="No such image.")
    # The content type comes from the key extension, which is trustworthy here
    # because storage_service assigned it *after* validating the declared type
    # against the file magic bytes at upload time.
    extension = key.rsplit(".", 1)[-1].lower() if "." in key else ""
    content_type = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(
        extension, "application/octet-stream"
    )
    try:
        reading = analyze_palm(image_bytes, content_type, provider=provider)
    except LookupError as e:
        raise HTTPException(status_code=501, detail=str(e)) from e
    return {"key": key, "reading": reading}
