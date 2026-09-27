"""Response models for API outputs."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
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
    house: Optional[int] = None


class KundliResponse(BaseModel):
    """Complete Kundli generation response."""
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    latitude: float
    longitude: float
    ayanamsa: float
    ascendant: float
    asc_sign: int
    asc_sign_name: str
    asc_sign_degree: float
    planets: List[PlanetResponse]
    houses: Dict[int, List[str]]
    chart: Dict[int, Dict[str, Any]]
    retrograde_planets: List[str]
    exalted_planets: List[str]
    debilitated_planets: List[str]
    dasha_info: Optional[Dict[str, Any]] = None
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
    kootas: Dict[str, Any]
    boy_nakshatra: Dict[str, Any]
    girl_nakshatra: Dict[str, Any]


class PredictionResponse(BaseModel):
    """AI prediction response."""
    prediction_type: str
    content: str
    ai_model: str
    tokens_used: Optional[int] = None
    language: str = "en"
    created_at: datetime = Field(default_factory=datetime.now)


class DoshaResponse(BaseModel):
    """Dosha detection response (Manglik, Sade Sati, Pitru; total 0-3)."""
    manglik: Dict[str, Any]
    sade_sati: Dict[str, Any]
    pitru_dosha: Dict[str, Any]
    total_doshas: int


class PanchangResponse(BaseModel):
    """Panchang response."""
    date: str
    tithi: Dict[str, Any]
    nakshatra: Dict[str, Any]
    yoga: Dict[str, Any]
    karana: Dict[str, Any]
    vara: Dict[str, Any]
    rahu_kaal: Dict[str, Any]
    gulika_kaal: Dict[str, Any]
    sunrise: str
    sunset: str


class NumerologyResponse(BaseModel):
    """Numerology analysis response."""
    life_path: Dict[str, Any]
    destiny: Dict[str, Any]
    soul_urge: Dict[str, Any]
    personality: Dict[str, Any]
    birthday: Dict[str, Any]
    name_number: Dict[str, Any]
    lucky_numbers: List[int]
    compatibility: Dict[str, Any]


class HoroscopeResponse(BaseModel):
    """Daily horoscope response."""
    zodiac_sign: str
    date: str
    prediction: str
    love_rating: int
    career_rating: int
    health_rating: int
    lucky_numbers: List[int]
    lucky_color: str
    ai_model: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    status_code: int


class ChoghadiyaResponse(BaseModel):
    """Choghadiya response."""
    date: str
    sunrise: str
    sunset: str
    day_choghadiya: List[Dict[str, Any]]
    night_choghadiya: List[Dict[str, Any]]


class HoraResponse(BaseModel):
    """Hora response."""
    date: str
    day_hora: List[Dict[str, Any]]
    night_hora: List[Dict[str, Any]]


class GowriResponse(BaseModel):
    """Gowri Panchangam response."""
    date: str
    periods: List[Dict[str, Any]]


class GhatiMuhuratResponse(BaseModel):
    """Do Ghati Muhurat response."""
    date: str
    muhurats: List[Dict[str, Any]]


class MonthlyPanchangResponse(BaseModel):
    """Monthly Panchang response."""
    month: int
    year: int
    days: List[Dict[str, Any]]


class TransitResponse(BaseModel):
    """Transit (Gochar) response."""
    date: str
    transits: List[Dict[str, Any]]
    current_signs: Dict[str, str]


class GemstoneResponse(BaseModel):
    """Gemstone recommendation response."""
    birth_data: Dict[str, Any]
    gemstones: List[Dict[str, Any]]
    recommendations: str


class VarshphalResponse(BaseModel):
    """Annual horoscope (Varshphal) response."""
    birth_data: Dict[str, Any]
    year: int
    Varshphal_chart: Dict[str, Any]
    predictions: Dict[str, Any]
    auspicious_months: List[str]
    challenging_months: List[str]


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
    names: List[Dict[str, Any]]
    lucky_numbers: List[int]
    lucky_letters: List[str]


class FestivalResponse(BaseModel):
    """Festival calendar response."""
    month: int
    year: int
    festivals: List[Dict[str, Any]]


class ReportResponse(BaseModel):
    """Personalized report response."""
    report_type: str
    content: str
    ai_model: str
