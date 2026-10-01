"""User settings: calculation preferences stored on the server."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.houses import DEFAULT_HOUSE_SYSTEM, HOUSE_SYSTEMS
from ..db.database import get_db
from ..services.auth_service import get_current_user
from ..services.settings_service import get_house_system, set_house_system

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    """What the client needs to render the form and label the choices."""

    house_system: str
    house_systems: list[str]
    default_house_system: str


class SettingsUpdate(BaseModel):
    house_system: str = Field(..., description="whole-sign | equal")


def _response(house_system: str) -> SettingsResponse:
    return SettingsResponse(
        house_system=house_system,
        house_systems=list(HOUSE_SYSTEMS),
        default_house_system=DEFAULT_HOUSE_SYSTEM,
    )


@router.get("", response_model=SettingsResponse)
async def read_settings(
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """The calling user's stored calculation settings."""
    return _response(get_house_system(db, getattr(user, "id", None)))


@router.put("", response_model=SettingsResponse)
async def update_settings(
    request: Request,
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Store a calculation setting.

    The value is validated against `HOUSE_SYSTEMS` rather than trusted: an
    unknown house system would be stored and then silently computed with.
    """
    if payload.house_system not in HOUSE_SYSTEMS:
        raise HTTPException(
            status_code=422,
            detail=f"house_system must be one of: {', '.join(HOUSE_SYSTEMS)}",
        )
    # The router is behind `require_auth`, so this is unreachable in practice;
    # without the guard an anonymous user would surface as an IntegrityError.
    if getattr(user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    saved = set_house_system(db, user.id, payload.house_system)
    return _response(saved)
