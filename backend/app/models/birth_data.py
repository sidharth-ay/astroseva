"""Birth data models for Vedic Astrology calculations."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time


class BirthData(BaseModel):
    """Birth details required for Kundli generation."""
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
        description="Timezone offset from UTC (e.g., 5.5 for IST)"
    )
    gender: Optional[str] = Field(default=None, description="Gender (male/female)")


class MatchingData(BaseModel):
    """Data for marriage matching analysis."""
    boy: BirthData = Field(..., description="Boy's birth details")
    girl: BirthData = Field(..., description="Girl's birth details")


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
