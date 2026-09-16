"""Marriage Matching (Ashtakoot) API endpoints."""

from fastapi import APIRouter, HTTPException
from datetime import datetime

from ..models.birth_data import MatchingData
from ..models.response import MatchingResponse
from ..core.planets import get_planetary_positions
from ..core.rashis import RASHI_NAMES
from ..core.matching import analyze_matching
from ..services.cache_service import cache_service

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
            detail=f"Error analyzing matching: {str(e)}"
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
