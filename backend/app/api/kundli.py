"""Kundli (Birth Chart) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from ..core.rate_limit import limiter
from fastapi.responses import StreamingResponse
from datetime import datetime, UTC
import io
import re
import logging

from ..models.birth_data import BirthData
from ..models.response import KundliResponse, PlanetResponse
from ..core.planets import get_planetary_positions, get_retrograde_planets, get_exalted_planets, get_debilitated_planets
from ..core.rashis import RASHI_NAMES
from ..core.houses import DEFAULT_HOUSE_SYSTEM, get_kundli_chart, get_planets_in_houses
from ..services.settings_service import house_system_setting
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


def _generate_kundli_data(
    birth_data: BirthData,
    ayanamsa_type: str = "lahiri",
    house_system: str = DEFAULT_HOUSE_SYSTEM,
) -> dict:
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
        ayanamsa_type=ayanamsa_type,
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

    # Get houses under the user's chosen house system
    planet_dicts = [{"planet": p.planet, "longitude": p.longitude} for p in planets]
    houses = get_planets_in_houses(planet_dicts, positions["ascendant"], house_system)

    # Attach house numbers to PlanetResponse objects
    for p in planets:
        for house_num, planet_names in houses.items():
            if p.planet in planet_names:
                p.house = house_num
                break

    # Get chart
    chart = get_kundli_chart(positions["ascendant"], planet_dicts, house_system)

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
        tzinfo=UTC
    ) - __import__("datetime").timedelta(hours=birth_data.timezone_offset)

    dasha_info = get_dasha_for_birth(moon_longitude, birth_dt)

    # Yogini + Chara dashas (AstroSage parity: alternate timing systems)
    try:
        from ..core.dasha import get_current_yogini, get_current_chara
        dasha_info["current_yogini"] = get_current_yogini(birth_dt, moon_longitude)
        dasha_info["current_chara"] = get_current_chara(asc_sign, birth_dt)
    except Exception as e:
        logger.warning(f"Dasha extension error: {e}")

    # Classical yogas + Navamsha (D9) divisional chart
    try:
        from ..core.yogas import detect_yogas
        from ..core.vargas import get_navamsa_positions
        dasha_info["yogas"] = detect_yogas(
            [{"planet": p["planet"], "sign": p["sign"]} for p in positions["planets"]],
            asc_sign,
            next((p["sign"] for p in positions["planets"] if p["planet"] == "Moon"), 0),
        )
        dasha_info["navamsa"] = get_navamsa_positions(
            [{"planet": p["planet"], "sign": p["sign"], "sign_degree": p["sign_degree"]}
             for p in positions["planets"]]
        )
    except Exception as e:
        logger.warning(f"Yoga/Varga error: {e}")

    # Avakahada Chakra, birth Panchang, Ishta/Karak/Avastha (AstroSage parity)
    extras: dict = {}
    try:
        from ..core.kundli_extras import (
            build_avakahada, ishta_devata, chara_karakas, avastha_of,
            julian_day, FRIENDSHIPS, SEVEN_PLANETS,
        )
        from ..core.panchang import (
            calculate_tithi, calculate_karana, calculate_yoga,
            calculate_nakshatra, calculate_sunrise_sunset,
        )
        from ..core.planets import SIGN_LORDS
        from ..core.grahayukti import (
            build_aspects, build_consideration, build_ghatak, build_somatilak,
        )
        from ..core.vargas import build_vargas
        from ..core.shadbala import build_shadbala, build_bhavabala
        from ..core.ashtakavarga import (
            build_ashtakavarga, build_prasthara_ashtakavarga,
        )
        from ..core.navatara import build_navatara, build_arudha

        sun_lon = next(p["longitude"] for p in positions["planets"] if p["planet"] == "Sun")
        moon = next(p for p in positions["planets"] if p["planet"] == "Moon")
        nak = calculate_nakshatra(moon["longitude"])
        tithi = calculate_tithi(sun_lon, moon["longitude"])
        karana = calculate_karana(sun_lon, moon["longitude"])
        yoga = calculate_yoga(sun_lon, moon["longitude"])
        sun_times = calculate_sunrise_sunset(
            birth_data.birth_date, birth_data.latitude,
            birth_data.longitude, birth_data.timezone_offset)
        utc_hour = (birth_data.birth_time.hour + birth_data.birth_time.minute / 60.0
                    - birth_data.timezone_offset)

        extras = {
            "avakahada": build_avakahada(
                moon["sign"], nak["nakshatra_index"], nak["pada"], asc_sign,
                SIGN_LORDS.get(moon["sign"], "Unknown"),
                SIGN_LORDS.get(asc_sign, "Unknown"),
                dasha_info.get("birth_nakshatra", {}).get("lord", "Unknown")),
            "birth_panchang": {
                "tithi": tithi["tithi_name"],
                "paksha": tithi["paksha"],
                "karana": karana["karana_name"],
                "yoga": yoga["yoga_name"],
                "nakshatra": nak["nakshatra_name"],
                "pada": nak["pada"],
            },
            "sunrise": sun_times["sunrise"],
            "sunset": sun_times["sunset"],
            "julian_day": julian_day(
                birth_data.birth_date.year, birth_data.birth_date.month,
                birth_data.birth_date.day, utc_hour),
            "ishta_devata": ishta_devata(positions["planets"]),
            "chara_karakas": chara_karakas(positions["planets"]),
            # Avastha is the classical seven-graha age ladder, so nodes and
            # outer planets are excluded (same filter as chara_karakas).
            "avastha": {p["planet"]: avastha_of(p["sign"], p["sign_degree"])
                        for p in positions["planets"]
                        if p["planet"] in SEVEN_PLANETS},
            "friendships": FRIENDSHIPS,
            "aspects": build_aspects(positions["planets"]),
            "consideration": build_consideration(positions["planets"]),
            "ghatak": build_ghatak(positions["ascendant"]),
            "somatilak": build_somatilak(asc_sign),
            "vargas": build_vargas(positions["planets"], asc_sign),
            "shadbala": build_shadbala(positions["planets"], asc_sign),
            "bhavabala": build_bhavabala(positions["planets"], asc_sign),
            "ashtakavarga": build_ashtakavarga(positions["planets"], asc_sign),
            "pav": build_prasthara_ashtakavarga(positions["planets"], asc_sign),
            "navatara": build_navatara(positions["planets"]),
            "arudha": build_arudha(positions["planets"], asc_sign),
        }
    except Exception as e:
        logger.warning(f"Kundli extras error: {e}")

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
        "extras": extras,
    }


@router.post("/generate", response_model=KundliResponse)
@limiter.limit("30/minute")
async def generate_kundli(
    request: Request,
    birth_data: BirthData,
    ayanamsa_type: str = Query("lahiri", alias="ayanamsa_type"),
    house_system: str = Depends(house_system_setting),
):
    """Generate a Vedic birth chart (Kundli)."""
    # Validate ayanamsa_type
    valid_ayanamsas = {"lahiri", "kp", "b_v_raman", "surya_siddhanta"}
    if ayanamsa_type not in valid_ayanamsas:
        raise HTTPException(status_code=400, detail=f"Invalid ayanamsa_type. Must be one of: {', '.join(sorted(valid_ayanamsas))}")

    # Cache key includes ALL result-affecting inputs
    cache_key = (
        f"kundli:{birth_data.name}:{birth_data.birth_date}:"
        f"{birth_data.birth_time}:{birth_data.birth_place}:"
        f"{birth_data.latitude}:{birth_data.longitude}:"
        f"{birth_data.timezone_offset}:{ayanamsa_type}:{house_system}"
    )
    cached = await cache_service.get(cache_key)
    if cached:
        return KundliResponse(**cached)

    try:
        data = _generate_kundli_data(
            birth_data, ayanamsa_type=ayanamsa_type, house_system=house_system
        )

        response = KundliResponse(
            name=birth_data.name,
            birth_date=str(birth_data.birth_date),
            birth_time=str(birth_data.birth_time),
            birth_place=birth_data.birth_place,
            latitude=birth_data.latitude,
            longitude=birth_data.longitude,
            # The offset the chart was actually built with, which may have been
            # resolved from `timezone_iana` for the birth date.
            timezone_offset=birth_data.timezone_offset,
            timezone_iana=birth_data.timezone_iana,
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
            extras=data.get("extras") or None,
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
        ) from e


@router.get("/sample")
@limiter.limit("30/minute")
async def get_sample_kundli(
    request: Request,
    ayanamsa_type: str = Query("lahiri", alias="ayanamsa_type"),
    house_system: str = Depends(house_system_setting),
):
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
    # `generate_kundli` takes (request, birth_data, ayanamsa_type) because the
    # rate limiter needs the request. This endpoint called it with one
    # positional argument, so every hit raised TypeError and surfaced as a 500.
    return await generate_kundli(
        request, sample_data, ayanamsa_type=ayanamsa_type, house_system=house_system
    )



def _doshas_for_export(data: dict, birth_data: BirthData, house_system: str) -> dict:
    """Dosha summary for the PDF, using the same path as /doshas/detect.

    Recomputing here instead would risk the export disagreeing with the page.
    Anything that fails degrades to an empty summary rather than failing the
    whole export: a missing dosha section is better than no PDF.
    """
    try:
        from ..core.doshas import detect_all_doshas
        from .doshas import _planets_with_houses, _transit_saturn_for

        positions = data.get("positions") or {}
        if not positions.get("planets"):
            return {}
        planets, asc_sign, moon_sign = _planets_with_houses(positions, house_system)
        transit_saturn, _ = _transit_saturn_for(None)
        doshas = detect_all_doshas(
            planets=planets,
            asc_sign=asc_sign,
            moon_sign=moon_sign or 0,
            transit_saturn_sign=transit_saturn,
        )
        return {
            "manglik": bool((doshas.get("manglik") or {}).get("is_manglik")),
            "kaal_sarp": bool((doshas.get("kaal_sarp") or {}).get("has_dosha")),
            "kaal_sarp_type": (doshas.get("kaal_sarp") or {}).get("kaal_sarp_type") or "",
            "sade_sati": bool((doshas.get("sade_sati") or {}).get("is_active")),
            "sade_sati_phase": (doshas.get("sade_sati") or {}).get("phase") or "",
            "pitru_dosha": bool((doshas.get("pitru_dosha") or {}).get("has_dosha")),
        }
    except Exception as e:  # noqa: BLE001 - degraded section, not a failed export
        logger.warning(f"Dosha section error: {e}")
        return {}


@router.post("/export-pdf")
@limiter.limit("30/minute")
async def export_kundli_pdf(
    request: Request,
    birth_data: BirthData,
    house_system: str = Depends(house_system_setting),
):
    """Export Kundli as PDF. Uses the same calculation path as generate."""
    try:
        data = _generate_kundli_data(birth_data, house_system=house_system)

        # Dasha, divisional charts and doshas are computed by
        # _generate_kundli_data but were never passed to the PDF, so the export
        # was a thinner document than the page. They are attached here rather
        # than recomputed.
        dasha_info = data.get("dasha_info") or {}
        vargas = (data.get("extras") or {}).get("vargas") or {}
        doshas = _doshas_for_export(data, birth_data, house_system)

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
            "dasha_info": dasha_info,
            "navamsa": (vargas.get("D9") or {}),
            "dasamsa": (vargas.get("D10") or {}),
            "doshas": doshas,
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
        ) from e
