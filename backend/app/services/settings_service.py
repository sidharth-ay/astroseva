"""Stored calculation settings, and the dependency that reads them.

Calculation settings live on the server so that a chart generated from a saved
result and a chart generated on the spot agree; display preferences such as
theme and language stay in the browser. The row is written the first time a
user saves something, so a missing row means the defaults.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from ..core.houses import DEFAULT_HOUSE_SYSTEM, HOUSE_SYSTEMS
from ..db.database import get_db
from ..db.models import UserSettings
from .auth_service import get_current_user


def get_house_system(db: Session, user_id: int | None) -> str:
    """The stored house system for a user, or the default when unset."""
    if user_id is None:
        return DEFAULT_HOUSE_SYSTEM
    row = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if row is None:
        return DEFAULT_HOUSE_SYSTEM
    # A row written before HOUSE_SYSTEMS grew a value must not return a system
    # the engine no longer knows how to compute.
    return row.house_system if row.house_system in HOUSE_SYSTEMS else DEFAULT_HOUSE_SYSTEM


def set_house_system(db: Session, user_id: int, value: str) -> str:
    """Store the house system for a user, creating the row if needed."""
    if value not in HOUSE_SYSTEMS:
        raise ValueError(f"Unknown house system: {value}")
    row = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if row is None:
        row = UserSettings(user_id=user_id)
    row.house_system = value
    db.add(row)
    db.commit()
    db.refresh(row)
    return row.house_system


async def house_system_setting(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> str:
    """The calling user's house system, for injection into a chart endpoint."""
    return get_house_system(db, getattr(user, "id", None))
