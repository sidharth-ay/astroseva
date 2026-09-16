"""Kundli (Birth Chart) API endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
import io
import re
import logging

from ..models.birth_data import BirthData
from ..models.response import KundliResponse, PlanetResponse
from ..core.planets import get_planetary_positions, get_retrograde_planets, get_exalted_planets, get_debilitated_planets
from ..core.rashis import RASHI_NAMES
from ..core.houses import get_kundli_chart, get_planets_in_houses
from ..core.nakshatras import get_nakshatra_from_longitude
from ..core.dasha import get_dasha_for_birth
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/kundli", tags=["kundli"])


def _validate_birth_data(birth_data: BirthData) -> None:
    """Validate birth data inputs."""
    if birth_data.latitude < -90 or birth_data.latitude > 90:
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if birth_data.longitude < -180 or birth_data.longitude > 180:
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    if birth_data.timezone_offset < -12 or birth_data.timezone_offset > 14:
        raise HTTPException(status_code=400, detail="Timezone offset must be between -12 and 14")
    if not birth_data.name or len(birth_data.name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Name is required")


def _generate_kundli_data(birth_data: BirthData) -> dict:
    """Generate kundli data from birth details. Shared by generate and PDF export."""
    _validate_birth_data(birth_data)

    # Get planetary positions
    positions = get_planetary_positions(
        year=birth_data.birth_date.year,
        month=birth_data.birth_date.month,
        day=birth_data.birth_date.day,
        hour=birth_data.birth_time.hour,
        minute=birth_data.birth_time.minute,
        timezone_offset=birth_data.timezone_offset,
        latitude=birth_data.latitude,
        longitude=birth_data.longitude,
    )

    # Get ascendant sign
    asc_sign = int(positions["ascendant"] / 30)
    asc_sign_name = RASHI_NAMES[asc_sign]["en"]

    # Format planets
    planets = []
    for p in positions["planets"]:
        sign = p["sign"]
        planet_response = PlanetResponse(
            planet=p["planet"],
            longitude=round(p["longitude"], 4),
            sign=sign,
            sign_name=RASHI_NAMES[sign]["en"],
            sign_degree=round(p["sign_degree"], 2),
            retrograde=p["retrograde"],
            dignity=p["dignity"],
            is_own_sign=p["is_own_sign"],
        )
        planets.append(planet_response)

    # Get houses (whole-sign, AstroSage convention)
    planet_dicts = [{"planet": p.planet, "longitude": p.longitude} for p in planets]
    houses = get_planets_in_houses(planet_dicts, positions["ascendant"])

    # Attach house numbers to PlanetResponse objects
    for p in planets:
        for house_num, planet_names in houses.items():
            if p.planet in planet_names:
                p.house = house_num
                break

    # Get chart
    chart = get_kundli_chart(positions["ascendant"], planet_dicts)

    # Get retrograde, exalted, debilitated
    retrograde = get_retrograde_planets(positions["planets"])
    exalted = get_exalted_planets(positions["planets"])
    debilitated = get_debilitated_planets(positions["planets"])

    # Find Moon longitude for Dasha
    moon_longitude = 0
    for p in positions["planets"]:
        if p["planet"] == "Moon":
            moon_longitude = p["longitude"]
            break

    # Compute Dasha
    birth_dt = datetime(
        birth_data.birth_date.year, birth_data.birth_date.month, birth_data.birth_date.day,
        birth_data.birth_time.hour, birth_data.birth_time.minute,
        tzinfo=timezone.utc
    ) - __import__("datetime").timedelta(hours=birth_data.timezone_offset)

    dasha_info = get_dasha_for_birth(moon_longitude, birth_dt)

    return {
        "positions": positions,
        "planets": planets,
        "houses": houses,
        "chart": chart,
        "retrograde": retrograde,
        "exalted": exalted,
        "debilitated": debilitated,
        "asc_sign": asc_sign,
        "asc_sign_name": asc_sign_name,
        "dasha_info": dasha_info,
    }


@router.post("/generate", response_model=KundliResponse)
async def generate_kundli(birth_data: BirthData):
    """Generate a Vedic birth chart (Kundli)."""
    # Cache key includes ALL result-affecting inputs
    cache_key = (
        f"kundli:{birth_data.name}:{birth_data.birth_date}:"
        f"{birth_data.birth_time}:{birth_data.birth_place}:"
        f"{birth_data.latitude}:{birth_data.longitude}:"
        f"{birth_data.timezone_offset}"
    )
    cached = await cache_service.get(cache_key)
    if cached:
        return KundliResponse(**cached)

    try:
        data = _generate_kundli_data(birth_data)

        response = KundliResponse(
            name=birth_data.name,
            birth_date=str(birth_data.birth_date),
            birth_time=str(birth_data.birth_time),
            birth_place=birth_data.birth_place,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
            ayanamsa=round(data["positions"]["ayanamsa"], 4),
            ascendant=round(data["positions"]["ascendant"], 4),
            asc_sign=data["asc_sign"],
            asc_sign_name=data["asc_sign_name"],
            asc_sign_degree=round(data["positions"]["asc_sign_degree"], 4),
            planets=data["planets"],
            houses=data["houses"],
            chart=data["chart"],
            retrograde_planets=data["retrograde"],
            exalted_planets=data["exalted"],
            debilitated_planets=data["debilitated"],
            dasha_info=data["dasha_info"],
        )

        # Cache the result
        await cache_service.set(cache_key, response.model_dump(), expiry=3600)

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kundli generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error generating kundli. Please try again."
        )


@router.get("/sample")
async def get_sample_kundli():
    """Get a sample kundli for testing."""
    sample_data = BirthData(
        name="Sample Person",
        birth_date="1990-05-15",
        birth_time="10:30",
        birth_place="Delhi, India",
        latitude=28.6139,
        longitude=77.2090,
        timezone_offset=5.5,
    )
    return await generate_kundli(sample_data)


@router.post("/export-pdf")
async def export_kundli_pdf(birth_data: BirthData):
    """Export Kundli as PDF. Uses the same calculation path as generate."""
    try:
        data = _generate_kundli_data(birth_data)

        kundli_data = {
            "name": birth_data.name,
            "birth_date": str(birth_data.birth_date),
            "birth_time": str(birth_data.birth_time),
            "birth_place": birth_data.birth_place,
            "latitude": birth_data.latitude,
            "longitude": birth_data.longitude,
            "ayanamsa": round(data["positions"]["ayanamsa"], 4),
            "ascendant": round(data["positions"]["ascendant"], 4),
            "asc_sign_name": data["asc_sign_name"],
            "planets": [
                {
                    "planet": p.planet,
                    "longitude": p.longitude,
                    "sign": p.sign,
                    "sign_name": p.sign_name,
                    "sign_degree": p.sign_degree,
                    "retrograde": p.retrograde,
                    "dignity": p.dignity,
                }
                for p in data["planets"]
            ],
            "houses": data["houses"],
            "retrograde_planets": data["retrograde"],
        }

        # Generate PDF
        from ..services.pdf_service import generate_kundli_pdf
        pdf_bytes = generate_kundli_pdf(kundli_data)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=kundli_{re.sub(r'[^a-zA-Z0-9_-]', '_', birth_data.name)}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error generating PDF. Please try again."
        )
