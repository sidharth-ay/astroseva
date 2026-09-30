"""Personalized astrology reports API."""

from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter
from pydantic import BaseModel
from typing import Optional
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude
from ..services.ai_service import generate_prediction, generate_fallback_prediction
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

class ReportRequest(BaseModel):
    birth_data: BirthData
    report_type: str  # "career", "finance", "health", "marriage", "love", "education", "brihat_kundli"

RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

HOUSE_NAMES = {
    1: "Self", 2: "Wealth", 3: "Siblings", 4: "Home & Property",
    5: "Children", 6: "Enemies & Disease", 7: "Marriage & Partnership",
    8: "Longevity & Transformation", 9: "Dharma & Fortune", 10: "Career & Status",
    11: "Gains & Income", 12: "Losses & Foreign Travel",
}

@router.post("/generate")
@limiter.limit("30/minute")
async def generate_report(request: Request, payload: ReportRequest):
    """Generate a personalized astrology report."""
    try:
        bd = payload.birth_data
        # The birth coordinates must be passed: the ascendant depends on where
        # on Earth the birth happened, and it drives the house placement the
        # report is built from. Omitting them fell back to the Delhi default.
        positions = get_planetary_positions(
            year=bd.birth_date.year, month=bd.birth_date.month, day=bd.birth_date.day,
            hour=bd.birth_time.hour, minute=bd.birth_time.minute,
            timezone_offset=bd.timezone_offset,
            latitude=bd.latitude,
            longitude=bd.longitude,
        )

        asc_sign = int(positions["ascendant"] / 30)
        planet_signs = {p["planet"]: RASHI_NAMES[p["sign"]] for p in positions["planets"]}
        planet_houses = {}
        for p in positions["planets"]:
            h = get_house_from_longitude(p["longitude"], positions["ascendant"])
            planet_houses[p["planet"]] = h

        # Build birth details for AI
        birth_details = {
            "name": bd.name,
            "birth_date": str(bd.birth_date),
            "birth_time": str(bd.birth_time),
            "birth_place": bd.birth_place,
            "ascendant": RASHI_NAMES[asc_sign],
            "moon_sign": planet_signs.get("Moon", "unknown"),
            "sun_sign": planet_signs.get("Sun", "unknown"),
            "planetary_positions": "\n".join([
                f"{p['planet']}: {RASHI_NAMES[p['sign']]} (House {planet_houses.get(p['planet'], '?')}){' Retrograde' if p['retrograde'] else ''}"
                for p in positions["planets"]
            ]),
        }

        if payload.report_type == "brihat_kundli":
            # Comprehensive Brihat Kundli report — use local fallback for speed
            report_sections = []
            for rtype in ["career", "finance", "health", "marriage", "love", "education"]:
                content = generate_fallback_prediction(
                    {"name": bd.name, "ascendant": RASHI_NAMES[asc_sign]},
                    rtype,
                )
                report_sections.append({"title": rtype.title(), "content": content})

            # Add house analysis (string values — frontend renders them as text)
            house_analysis = {}
            for h_num, h_name in HOUSE_NAMES.items():
                planets_in = [p for p, h in planet_houses.items() if h == h_num]
                occupants = ", ".join(planets_in) if planets_in else "Empty"
                house_analysis[f"House {h_num} ({h_name})"] = (
                    f"Occupants: {occupants}. "
                    f"Sign on cusp: {RASHI_NAMES[(asc_sign + h_num - 1) % 12]}."
                )

            summary = (
                f"Brihat Kundli for {bd.name} — {RASHI_NAMES[asc_sign]} ascendant, "
                f"Moon in {planet_signs.get('Moon', 'unknown')}, "
                f"Sun in {planet_signs.get('Sun', 'unknown')}. "
                "Six life-area analyses and a twelve-house breakdown follow below."
            )

            return {
                "report_type": "brihat_kundli",
                "birth_data": {"name": bd.name, "date": str(bd.birth_date), "time": str(bd.birth_time), "place": bd.birth_place},
                "content": summary,
                "sections": report_sections,
                "house_analysis": house_analysis,
                "ai_model": "astroseva-local",
            }
        else:
            # Single-type report — cache 24h (same pattern as predictions)
            # The report is built from the chart, which depends on the exact
            # birth instant. The key omitted the UTC offset, so the same local
            # clock time in two zones collided and shared one cached report.
            cache_key = (
                f"report:{bd.birth_date}:{bd.birth_time}:{bd.latitude}:"
                f"{bd.longitude}:{bd.timezone_offset}:"
                f"{payload.report_type}"
            )
            cached = await cache_service.get(cache_key)
            if cached:
                return cached
            result = await generate_prediction(birth_details, payload.report_type, "en")
            response = {
                "report_type": payload.report_type,
                "birth_data": {"name": bd.name, "date": str(bd.birth_date), "time": str(bd.birth_time), "place": bd.birth_place},
                "content": result["content"],
                "ai_model": result["model"],
            }
            await cache_service.set(cache_key, response, expiry=86400)
            return response
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Error generating report.")
