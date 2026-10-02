"""Response models for API outputs."""

from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


class PlanetResponse(BaseModel):
    """Single planet position response."""
    planet: str
    longitude: float
    sign: int
    sign_name: str
    sign_degree: float
    retrograde: bool
    dignity: str
    is_own_sign: bool
    house: int | None = None


class KundliResponse(BaseModel):
    """Complete Kundli generation response."""
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    latitude: float
    longitude: float
    # Echoed so a client that re-sends these details for a follow-up call -- the
    # dosha panel inside the Kundli page does exactly that -- uses the offset the
    # chart was actually computed with. It used to hardcode 5.5, which quietly
    # charted every non-Indian birth at the wrong offset.
    timezone_offset: float
    # The IANA zone the offset was resolved from, when one was supplied. Passed
    # back so a re-sent request resolves the same historical offset rather than
    # trusting whatever offset the client happens to have stored.
    timezone_iana: str | None = None
    ayanamsa: float
    ascendant: float
    asc_sign: int
    asc_sign_name: str
    asc_sign_degree: float
    planets: list[PlanetResponse]
    houses: dict[int, list[str]]
    chart: dict[int, dict[str, Any]]
    retrograde_planets: list[str]
    exalted_planets: list[str]
    debilitated_planets: list[str]
    dasha_info: dict[str, Any] | None = None
    extras: dict[str, Any] | None = None
    created_at: datetime = Field(default_factory=datetime.now)


class MatchingResponse(BaseModel):
    """Marriage matching response."""
    boy_name: str
    girl_name: str
    total_score: int
    max_score: int
    compatibility_percentage: float
    recommendation: str
    nadi_dosha: bool
    kootas: dict[str, Any]
    boy_nakshatra: dict[str, Any]
    girl_nakshatra: dict[str, Any]


class PredictionResponse(BaseModel):
    """AI prediction response."""
    prediction_type: str
    content: str
    ai_model: str
    tokens_used: int | None = None
    language: str = "en"
    created_at: datetime = Field(default_factory=datetime.now)


class DoshaResponse(BaseModel):
    """Dosha detection response (Manglik, Kaal Sarp, Sade Sati, Pitru; total 0-4)."""
    manglik: dict[str, Any]
    kaal_sarp: dict[str, Any]
    sade_sati: dict[str, Any]
    pitru_dosha: dict[str, Any]
    total_doshas: int


class PanchangResponse(BaseModel):
    """Panchang response."""
    date: str
    tithi: dict[str, Any]
    nakshatra: dict[str, Any]
    yoga: dict[str, Any]
    karana: dict[str, Any]
    vara: dict[str, Any]
    rahu_kaal: dict[str, Any]
    gulika_kaal: dict[str, Any]
    sunrise: str
    sunset: str


class NumerologyResponse(BaseModel):
    """Numerology analysis response."""
    life_path: dict[str, Any]
    destiny: dict[str, Any]
    soul_urge: dict[str, Any]
    personality: dict[str, Any]
    birthday: dict[str, Any]
    name_number: dict[str, Any]
    lucky_numbers: list[int]
    compatibility: dict[str, Any]


class HoroscopeResponse(BaseModel):
    """Daily horoscope response."""
    zodiac_sign: str
    date: str
    prediction: str
    love_rating: int
    career_rating: int
    health_rating: int
    lucky_numbers: list[int]
    lucky_color: str
    ai_model: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: str | None = None
    status_code: int


class ChoghadiyaResponse(BaseModel):
    """Choghadiya response."""
    date: str
    sunrise: str
    sunset: str
    day_choghadiya: list[dict[str, Any]]
    night_choghadiya: list[dict[str, Any]]


class HoraResponse(BaseModel):
    """Hora response."""
    date: str
    day_hora: list[dict[str, Any]]
    night_hora: list[dict[str, Any]]


class GowriResponse(BaseModel):
    """Gowri Panchangam response."""
    date: str
    periods: list[dict[str, Any]]


class GhatiMuhuratResponse(BaseModel):
    """Do Ghati Muhurat response."""
    date: str
    muhurats: list[dict[str, Any]]


class MonthlyPanchangResponse(BaseModel):
    """Monthly Panchang response."""
    month: int
    year: int
    days: list[dict[str, Any]]


class TransitResponse(BaseModel):
    """Transit (Gochar) response."""
    date: str
    transits: list[dict[str, Any]]
    current_signs: dict[str, str]


class GemstoneResponse(BaseModel):
    """Gemstone recommendation response."""
    birth_data: dict[str, Any]
    gemstones: list[dict[str, Any]]
    recommendations: str


class VarshphalResponse(BaseModel):
    """Annual horoscope (Varshphal) response."""
    birth_data: dict[str, Any]
    year: int
    Varshphal_chart: dict[str, Any]
    predictions: dict[str, Any]
    auspicious_months: list[str]
    challenging_months: list[str]


class LoveMatchResponse(BaseModel):
    """Love compatibility response."""
    partner1: str
    partner2: str
    overall_score: float
    romantic_compatibility: float
    emotional_compatibility: float
    intellectual_compatibility: float
    physical_compatibility: float
    recommendations: str


class BabyNameResponse(BaseModel):
    """Baby name suggestion response."""
    gender: str
    names: list[dict[str, Any]]
    lucky_numbers: list[int]
    lucky_letters: list[str]


class FestivalResponse(BaseModel):
    """Festival calendar response."""
    month: int
    year: int
    festivals: list[dict[str, Any]]


class ReportResponse(BaseModel):
    """Personalized report response."""
    report_type: str
    content: str
    ai_model: str
