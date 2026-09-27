"""Hindu festival calendar API."""

from fastapi import APIRouter, Query
from datetime import date
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/festivals", tags=["festivals"])

FESTIVALS_2026 = [
    {"name": "Makar Sankranti", "date": "2026-01-14", "description": "Harvest festival marking Sun's northward journey", "type": "harvest"},
    {"name": "Vasant Panchami", "date": "2026-02-01", "description": "Celebration of spring and Goddess Saraswati", "type": "seasonal"},
    {"name": "Maha Shivaratri", "date": "2026-02-15", "description": "Great night of Lord Shiva", "type": "religious"},
    {"name": "Holi", "date": "2026-03-10", "description": "Festival of colors celebrating spring", "type": "celebration"},
    {"name": "Ugadi", "date": "2026-03-20", "description": "Hindu New Year (Karnataka, Andhra, Telangana)", "type": "new_year"},
    {"name": "Ram Navami", "date": "2026-03-26", "description": "Birthday of Lord Rama", "type": "religious"},
    {"name": "Hanuman Jayanti", "date": "2026-04-03", "description": "Birthday of Lord Hanuman", "type": "religious"},
    {"name": "Akshaya Tritiya", "date": "2026-04-20", "description": "Auspicious day for new beginnings", "type": "auspicious"},
    {"name": "Buddha Purnima", "date": "2026-05-01", "description": "Birth anniversary of Gautama Buddha", "type": "religious"},
    {"name": "Ganga Dussehra", "date": "2026-05-06", "description": "Celebration of River Ganga's descent to Earth", "type": "religious"},
    {"name": "Vat Purnima", "date": "2026-05-21", "description": "Festival for married women", "type": "religious"},
    {"name": "Jagannath Rath Yatra", "date": "2026-06-17", "description": "Chariot festival of Lord Jagannath", "type": "religious"},
    {"name": "Guru Purnima", "date": "2026-07-10", "description": "Honoring spiritual teachers and gurus", "type": "religious"},
    {"name": "Kamika Ekadashi", "date": "2026-07-24", "description": "Sacred Ekadashi for spiritual purification", "type": "religious"},
    {"name": "Nag Panchami", "date": "2026-08-05", "description": "Worship of serpent deities", "type": "religious"},
    {"name": "Karva Chauth", "date": "2026-08-15", "description": "Fast observed by married women for husbands", "type": "celebration"},
    {"name": "Dussehra", "date": "2026-10-01", "description": "Victory of good over evil, burning of Ravana", "type": "celebration"},
    {"name": "Navaratri", "date": "2026-09-22", "description": "Nine nights of Goddess Durga worship", "type": "religious"},
    {"name": "Diwali", "date": "2026-10-20", "description": "Festival of lights, victory of light over darkness", "type": "celebration"},
    {"name": "Govardhan Puja", "date": "2026-10-21", "description": "Day after Diwali, worship of Mount Govardhan", "type": "religious"},
    {"name": "Bhai Dooj", "date": "2026-10-22", "description": "Celebration of brother-sister bond", "type": "celebration"},
    {"name": "Chhath Puja", "date": "2026-10-26", "description": "Worship of Sun God and Chhathi Maiya", "type": "religious"},
    {"name": "Guru Nanak Jayanti", "date": "2026-11-05", "description": "Birth anniversary of Guru Nanak Dev Ji", "type": "religious"},
    {"name": "Advent of Christmas", "date": "2026-12-25", "description": "Christmas celebration", "type": "celebration"},
]

@router.get("/list")
async def list_festivals(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2024, le=2030),
):
    """List Hindu festivals, optionally filtered by month and year."""
    today = date.today()
    if year is None:
        year = today.year
    if month is None:
        month = today.month

    filtered = [
        f for f in FESTIVALS_2026
        if f["date"].startswith(f"{year}-{month:02d}")
    ]

    # If no festivals for requested month, show all for that year
    if not filtered and month:
        filtered = [f for f in FESTIVALS_2026 if f["date"].startswith(f"{year}-")]

    return {
        "month": month,
        "year": year,
        "festivals": filtered,
    }
