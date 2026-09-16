"""Numerology API endpoints."""

from fastapi import APIRouter, HTTPException
import logging

from ..models.birth_data import NumerologyRequest
from ..models.response import NumerologyResponse
from ..core.numerology import get_numerology_analysis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/numerology", tags=["numerology"])


@router.post("/analyze", response_model=NumerologyResponse)
async def analyze_numerology(request: NumerologyRequest):
    """Perform numerology analysis based on name and birth date."""
    try:
        birth_date_str = request.birth_date.strftime("%d-%m-%Y")
        result = get_numerology_analysis(request.name, birth_date_str)

        return NumerologyResponse(
            life_path=result["life_path"],
            destiny=result["destiny"],
            soul_urge=result["soul_urge"],
            personality=result["personality"],
            birthday=result["birthday"],
            name_number=result["name_number"],
            lucky_numbers=result["lucky_numbers"],
            compatibility=result["compatibility"],
        )

    except Exception as e:
        logger.error(f"Numerology analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error analyzing numerology. Please try again."
        )


@router.get("/life-path/{birth_date}")
async def get_life_path_number(birth_date: str):
    """Calculate Life Path Number from birth date."""
    from ..core.numerology import calculate_life_path_number

    try:
        result = calculate_life_path_number(birth_date)
        return result
    except Exception as e:
        logger.error(f"Life path calculation error: {e}")
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use DD-MM-YYYY."
        )


@router.get("/destiny/{name}")
async def get_destiny_number(name: str):
    """Calculate Destiny Number from name."""
    from ..core.numerology import calculate_destiny_number

    try:
        result = calculate_destiny_number(name)
        return result
    except Exception as e:
        logger.error(f"Destiny number error: {e}")
        raise HTTPException(
            status_code=400,
            detail="Error calculating destiny number. Please try again."
        )
