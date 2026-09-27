"""Marriage Matching (Ashtakoot) API endpoints."""

import io
import re
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
import logging

from ..models.birth_data import BirthData, MatchingData
from ..models.response import LoveMatchResponse, MatchingResponse
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude
from ..core.rashis import RASHI_NAMES
from ..core.matching import analyze_matching
from ..core.doshas import detect_manglik
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/matching", tags=["matching"])


@router.post("/analyze", response_model=MatchingResponse)
async def analyze_marriage_matching(matching_data: MatchingData):
    """Analyze marriage compatibility between two charts."""
    try:
        # Calculate boy's chart
        boy_positions = get_planetary_positions(
            year=matching_data.boy.birth_date.year,
            month=matching_data.boy.birth_date.month,
            day=matching_data.boy.birth_date.day,
            hour=matching_data.boy.birth_time.hour,
            minute=matching_data.boy.birth_time.minute,
            timezone_offset=matching_data.boy.timezone_offset,
        )

        # Calculate girl's chart
        girl_positions = get_planetary_positions(
            year=matching_data.girl.birth_date.year,
            month=matching_data.girl.birth_date.month,
            day=matching_data.girl.birth_date.day,
            hour=matching_data.girl.birth_time.hour,
            minute=matching_data.girl.birth_time.minute,
            timezone_offset=matching_data.girl.timezone_offset,
        )

        # Get Moon's longitude for matching
        boy_moon_long = None
        girl_moon_long = None
        boy_sign = None
        girl_sign = None

        for planet in boy_positions["planets"]:
            if planet["planet"] == "Moon":
                boy_moon_long = planet["longitude"]
                boy_sign = planet["sign"]
                break

        for planet in girl_positions["planets"]:
            if planet["planet"] == "Moon":
                girl_moon_long = planet["longitude"]
                girl_sign = planet["sign"]
                break

        if boy_moon_long is None or girl_moon_long is None:
            raise HTTPException(
                status_code=400,
                detail="Could not calculate Moon position for one or both charts"
            )

        # Perform matching analysis
        result = analyze_matching(
            boy_longitude=boy_moon_long,
            girl_longitude=girl_moon_long,
            boy_sign=boy_sign,
            girl_sign=girl_sign,
        )

        return MatchingResponse(
            boy_name=matching_data.boy.name,
            girl_name=matching_data.girl.name,
            total_score=result["total_score"],
            max_score=result["max_score"],
            compatibility_percentage=result["compatibility_percentage"],
            recommendation=result["recommendation"],
            nadi_dosha=result["nadi_dosha"],
            kootas=result["kootas"],
            boy_nakshatra=result["boy_nakshatra"],
            girl_nakshatra=result["girl_nakshatra"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Error analyzing matching. Please try again."
        )


@router.get("/sample")
async def get_sample_matching():
    """Get a sample matching analysis for testing."""
    from ..models.birth_data import BirthData

    boy = BirthData(
        name="Rahul",
        birth_date="1990-05-15",
        birth_time="10:30",
        birth_place="Delhi, India",
        latitude=28.6139,
        longitude=77.2090,
        timezone_offset=5.5,
    )
    girl = BirthData(
        name="Priya",
        birth_date="1992-08-20",
        birth_time="14:00",
        birth_place="Mumbai, India",
        latitude=19.0760,
        longitude=72.8777,
        timezone_offset=5.5,
    )

    matching_data = MatchingData(boy=boy, girl=girl)
    return await analyze_marriage_matching(matching_data)


@router.post("/export-pdf")
async def export_matching_pdf(matching_data: MatchingData):
    """Export marriage matching report as PDF, including Manglik cross-check."""
    try:
        result = await analyze_marriage_matching(matching_data)

        def _manglik_status(bd: BirthData) -> str:
            positions = get_planetary_positions(
                year=bd.birth_date.year, month=bd.birth_date.month, day=bd.birth_date.day,
                hour=bd.birth_time.hour, minute=bd.birth_time.minute,
                timezone_offset=bd.timezone_offset,
            )
            planets = positions["planets"]
            asc_sign = int(positions["ascendant"] / 30)
            moon_sign = next((p["sign"] for p in planets if p.get("planet") == "Moon"), 0)
            for p in planets:
                p["house"] = get_house_from_longitude(p["longitude"], positions["ascendant"])
            m = detect_manglik(planets, asc_sign, moon_sign)
            if m.get("is_manglik"):
                return f"Manglik ({m.get('severity', 'Present')})"
            return "Non-Manglik"

        from ..services.pdf_service import generate_matching_pdf
        pdf_bytes = generate_matching_pdf({
            "boy_name": result.boy_name,
            "girl_name": result.girl_name,
            "total_score": result.total_score,
            "max_score": result.max_score,
            "compatibility_percentage": result.compatibility_percentage,
            "recommendation": result.recommendation,
            "nadi_dosha": result.nadi_dosha,
            "kootas": result.kootas,
            "boy_nakshatra": result.boy_nakshatra,
            "girl_nakshatra": result.girl_nakshatra,
            "manglik": {
                "boy": _manglik_status(matching_data.boy),
                "girl": _manglik_status(matching_data.girl),
            },
        })

        filename = re.sub(r"[^a-zA-Z0-9_-]", "_", f"{result.boy_name}_{result.girl_name}")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=matching_{filename}.pdf"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Matching PDF export error: {e}")
        raise HTTPException(status_code=500, detail="Error generating PDF. Please try again.")


# ---------------------------------------------------------------------------
# Love compatibility (romantic, emotional, intellectual, physical)
# ---------------------------------------------------------------------------

def _element_score(sign1: int, sign2: int) -> float:
    """Score two signs (0-11) by Vedic element compatibility (0-100)."""
    if sign1 == sign2:
        return 95.0
    el1, el2 = sign1 % 4, sign2 % 4
    if el1 == el2:
        return 85.0
    # Fire (0) <-> Air (2), Earth (1) <-> Water (3) are friendly
    if {el1, el2} in ({0, 2}, {1, 3}):
        return 75.0
    if {el1, el2} in ({0, 1}, {2, 3}):
        return 55.0
    return 40.0


def _planet_sign(planets: list, name: str) -> int:
    for p in planets:
        if p.get("planet") == name:
            return int(p.get("sign", 0))
    return 0


@router.post("/love-match", response_model=LoveMatchResponse)
async def analyze_love_match(payload: dict):
    """Analyze romantic compatibility between two birth charts.

    Request body: { "partner1": BirthData, "partner2": BirthData }
    """
    try:
        try:
            p1 = BirthData(**payload.get("partner1", {}))
            p2 = BirthData(**payload.get("partner2", {}))
        except Exception:
            raise HTTPException(status_code=422, detail="partner1 and partner2 birth details are required")

        def _chart(bd: BirthData) -> dict:
            return get_planetary_positions(
                year=bd.birth_date.year,
                month=bd.birth_date.month,
                day=bd.birth_date.day,
                hour=bd.birth_time.hour,
                minute=bd.birth_time.minute,
                timezone_offset=bd.timezone_offset,
            )

        c1 = _chart(p1)["planets"]
        c2 = _chart(p2)["planets"]

        romantic = _element_score(_planet_sign(c1, "Venus"), _planet_sign(c2, "Venus"))
        emotional = _element_score(_planet_sign(c1, "Moon"), _planet_sign(c2, "Moon"))
        intellectual = _element_score(_planet_sign(c1, "Mercury"), _planet_sign(c2, "Mercury"))
        physical = round(
            (_element_score(_planet_sign(c1, "Mars"), _planet_sign(c2, "Mars")) + emotional) / 2, 1
        )
        overall = round(romantic * 0.3 + emotional * 0.3 + intellectual * 0.2 + physical * 0.2, 1)

        if overall >= 75:
            recommendations = (
                f"{p1.name} and {p2.name} share a naturally harmonious bond. "
                "Venus and Moon placements support mutual affection and emotional security. "
                "Nurture open communication to keep the connection thriving."
            )
        elif overall >= 55:
            recommendations = (
                f"{p1.name} and {p2.name} have a workable bond with complementary strengths. "
                "Patience and honest dialogue will turn differences into growth. "
                "Consider a full Ashtakoot analysis for marriage decisions."
            )
        else:
            recommendations = (
                f"{p1.name} and {p2.name} face elemental friction that needs conscious effort. "
                "Focus on emotional understanding before physical closeness. "
                "Remedies for Venus and Moon, plus guided counseling, are advised."
            )

        return LoveMatchResponse(
            partner1=p1.name,
            partner2=p2.name,
            overall_score=overall,
            romantic_compatibility=romantic,
            emotional_compatibility=emotional,
            intellectual_compatibility=intellectual,
            physical_compatibility=physical,
            recommendations=recommendations,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Love match error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing love match. Please try again.")
