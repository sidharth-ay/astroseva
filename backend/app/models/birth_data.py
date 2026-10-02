"""Birth data models for Vedic Astrology calculations."""

# `_resolve_timezone` annotates its own return type with this class. On Python
# 3.13 and earlier, annotations are evaluated the moment a function is defined,
# so that self-reference raised NameError while the module was still importing
# -- which is every process that touches the API, not just the tests. Python
# 3.14 evaluates them lazily and hid the bug locally; CI runs 3.12 and caught
# it. Postponing evaluation is the portable fix.
from __future__ import annotations

from pydantic import BaseModel, Field, model_validator
from datetime import date, time

from ..services.timezone_service import resolve_offset


class BirthData(BaseModel):
    """Birth details required for Kundli generation.

    `timezone_offset` is the offset that applies *now* at the birth place, which
    is what the client has always sent. `timezone_iana` is the zone identifier
    from the location dataset, and when it is present it wins: the offset is
    resolved for the actual birth date, so a 1942 Indian birth uses the +6:30
    that was in force then rather than today's +5:30.

    Resolving here rather than in each endpoint means the whole application gets
    historical offsets from one change, and a caller that sends only the old
    field is unaffected.
    """
    name: str = Field(..., min_length=1, max_length=100, description="Person's name")
    birth_date: date = Field(..., description="Birth date (YYYY-MM-DD)")
    birth_time: time = Field(..., description="Birth time (HH:MM)")
    birth_place: str = Field(..., min_length=1, max_length=100, description="Birth place name")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude of birth place")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude of birth place")
    timezone_offset: float = Field(
        default=5.5,
        ge=-12,
        le=14,
        description="UTC offset in force now at the birth place (e.g., 5.5 for IST)"
    )
    timezone_iana: str | None = Field(
        default=None,
        max_length=64,
        description=(
            "IANA zone for the birth place (e.g., 'Asia/Kolkata'), from the "
            "location dataset. When set, the historical offset is derived from "
            "it and `timezone_offset` is only the fallback."
        ),
    )
    gender: str | None = Field(default=None, description="Gender (male/female)")

    @model_validator(mode="after")
    def _resolve_timezone(self) -> BirthData:
        if self.timezone_iana:
            self.timezone_offset = resolve_offset(
                self.timezone_iana,
                self.birth_date,
                self.birth_time,
                fallback=self.timezone_offset,
            )
        return self


class MatchingData(BaseModel):
    """Data for marriage matching analysis."""
    boy: BirthData = Field(..., description="Boy's birth details")
    girl: BirthData = Field(..., description="Girl's birth details")


class LoveMatchData(BaseModel):
    """Data for love compatibility analysis."""
    partner1: BirthData = Field(..., description="First partner's birth details")
    partner2: BirthData = Field(..., description="Second partner's birth details")


class PredictionRequest(BaseModel):
    """Request for AI prediction generation."""
    birth_data: BirthData = Field(..., description="Birth details")
    prediction_type: str = Field(
        ...,
        description="Type of prediction: career, marriage, health, finance, love, education"
    )
    language: str = Field(default="en", description="Language: en (English) or hi (Hindi)")


class NumerologyRequest(BaseModel):
    """Request for numerology analysis."""
    name: str = Field(..., min_length=1, max_length=200, description="Full name")
    birth_date: date = Field(..., description="Birth date (YYYY-MM-DD)")


class HoroscopeRequest(BaseModel):
    """Request for horoscope generation."""
    zodiac_sign: str = Field(
        ...,
        description="Zodiac sign: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces"
    )
    language: str = Field(default="en", description="Language: en or hi")
