"""Panchang API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from datetime import date, datetime, timedelta
import logging

from ..models.response import PanchangResponse
from ..core.planets import get_planetary_positions
from ..core.panchang import calculate_sunrise_sunset, get_panchang
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/panchang", tags=["panchang"])

# â”€â”€â”€ Helper calculation functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CHOGHADIYA_NAMES = ["Amrit", "Shubh", "Labh", "Char", "Ka", "Rog", "Udveg", "Amrit"]
CHOGHADIYA_TYPES = ["good", "neutral", "good", "neutral", "bad", "bad", "bad", "good"]

# Starting choghadiya name index for each weekday (0=Sunday)
_CHOGHADIYA_START = [0, 1, 2, 3, 0, 1, 2]

HORA_PLANETS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]
HORA_TYPES = ["good", "neutral", "neutral", "good", "bad", "good", "bad"]

# Starting hora planet index for each weekday (0=Sunday)
_HORA_START_IDX = [0, 3, 6, 2, 4, 1, 5]

GOWRI_NAMES = ["Dhanam", "Rogam", "Soolam", "Amritam", "Visham", "Laabam", "Thevipai", "Uthi"]
GOWRI_NATURES = ["good", "bad", "bad", "good", "bad", "good", "neutral", "neutral"]

# Starting gowri index for each weekday (0=Sunday)
_GOWRI_START_IDX = [7, 0, 1, 3, 5, 4, 2]


def _hours_to_time_str(hours: float) -> str:
    """Convert decimal hours to HH:MM string."""
    h = int(hours) % 24
    m = int((hours % 1) * 60)
    return f"{h:02d}:{m:02d}"


def _calculate_choghadiya(sunrise_hour: float, sunset_hour: float, day_of_week: int) -> list:
    """Calculate Choghadiya periods for the day.

    Returns 16 periods: 8 day choghadiyas (sunriseâ€“sunset) + 8 night choghadiyas (sunsetâ€“next sunrise).
    """
    results = []

    # --- Day choghadiya (sunrise to sunset) ---
    day_duration = sunset_hour - sunrise_hour
    chog_duration = day_duration / 8
    start_idx = _CHOGHADIYA_START[day_of_week]

    for i in range(8):
        idx = (start_idx + i) % 8
        start = sunrise_hour + i * chog_duration
        end = sunrise_hour + (i + 1) * chog_duration
        results.append({
            "name": CHOGHADIYA_NAMES[idx],
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "type": CHOGHADIYA_TYPES[idx],
            "period": "day",
        })

    # --- Night choghadiya (sunset to next sunrise â†’ treat next sunrise as sunset + night_duration) ---
    night_duration = 24.0 - day_duration  # hours from sunset to next sunrise
    night_chog_duration = night_duration / 8

    # Night starting choghadiya is the one after the day's last starting choghadiya
    night_start_idx = (start_idx + 8) % 8  # effectively next in cycle

    for i in range(8):
        idx = (night_start_idx + i) % 8
        start = sunset_hour + i * night_chog_duration
        end = sunset_hour + (i + 1) * night_chog_duration
        # Wrap past midnight
        results.append({
            "name": CHOGHADIYA_NAMES[idx],
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "type": CHOGHADIYA_TYPES[idx],
            "period": "night",
        })

    return results


def _calculate_hora(sunrise_hour: float, sunset_hour: float, day_of_week: int) -> list:
    """Calculate Hora periods for the day.

    24 horas: 12 day (sunriseâ€“sunset) + 12 night (sunsetâ€“next sunrise).
    Each day's first hora is ruled by the weekday ruler (Sunâ€“Sat).
    """
    results = []

    # --- Day horas ---
    day_duration = sunset_hour - sunrise_hour
    hora_duration = day_duration / 12
    start_planet_idx = _HORA_START_IDX[day_of_week]

    for i in range(12):
        planet_idx = (start_planet_idx + i) % 7
        start = sunrise_hour + i * hora_duration
        end = sunrise_hour + (i + 1) * hora_duration
        results.append({
            "planet": HORA_PLANETS[planet_idx],
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "type": HORA_TYPES[planet_idx],
            "period": "day",
        })

    # --- Night horas ---
    night_duration = 24.0 - day_duration
    night_hora_duration = night_duration / 12
    night_start_planet_idx = (start_planet_idx + 12) % 7

    for i in range(12):
        planet_idx = (night_start_planet_idx + i) % 7
        start = sunset_hour + i * night_hora_duration
        end = sunset_hour + (i + 1) * night_hora_duration
        results.append({
            "planet": HORA_PLANETS[planet_idx],
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "type": HORA_TYPES[planet_idx],
            "period": "night",
        })

    return results


def _calculate_gowri(sunrise_hour: float, day_of_week: int) -> list:
    """Calculate Gowri Panchangam periods.

    8 periods from sunrise, each ~90 minutes (day duration / 8).
    Good: Dhanam, Amritam, Laabam. Bad: Rogam, Soolam, Visham. Neutral: Thevipai, Uthi.
    """
    start_idx = _GOWRI_START_IDX[day_of_week]
    gowri_duration = 12.0 / 8  # 1.5 hours each (approximate day = 12h)
    results = []

    for i in range(8):
        idx = (start_idx + i) % 8
        start = sunrise_hour + i * gowri_duration
        end = sunrise_hour + (i + 1) * gowri_duration
        results.append({
            "name": GOWRI_NAMES[idx],
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "nature": GOWRI_NATURES[idx],
        })

    return results


def _calculate_ghati_muhurat(sunrise_hour: float, sunset_hour: float) -> list:
    """Calculate Do Ghati Muhurat windows.

    A ghati = 24 minutes. A Do Ghati muhurat = 2 ghati = ~48 minutes.
    We calculate ~8 muhurats across the day (simplified approximate model).
    """
    day_duration = sunset_hour - sunrise_hour
    total_minutes = day_duration * 60
    muhurat_minutes = 48  # 2 ghati
    # Number of muhurats that fit in the day
    count = max(1, int(total_minutes // muhurat_minutes))

    results = []
    # Space muhurats evenly across the day with slight offsets for variety
    gap = day_duration / (count + 1)

    for i in range(count):
        start = sunrise_hour + (i + 0.5) * gap
        end = start + (muhurat_minutes / 60.0)
        if end > sunset_hour:
            end = sunset_hour
        results.append({
            "start": _hours_to_time_str(start),
            "end": _hours_to_time_str(end),
            "name": f"Do Ghati Muhurat {i + 1}",
        })

    return results


@router.get("/daily", response_model=PanchangResponse)
async def get_daily_panchang(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    date_str: str = None,
    timezone_offset: float = 5.5,
    sunrise_hour: float = 6.0,
    sunset_hour: float = 18.0,
):
    """Get daily Panchang for a location."""
    if date_str is None:
        date_str = date.today().isoformat()

    # Check cache
    cache_key = f"panchang:{date_str}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return PanchangResponse(**cached)

    try:
        # Parse date
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # Calculate Sun and Moon positions (approximate)
        # For simplicity, using noon position
        positions = get_planetary_positions(
            year=target_date.year,
            month=target_date.month,
            day=target_date.day,
            hour=12,
            minute=0,
            timezone_offset=timezone_offset,
        )

        sun_longitude = None
        moon_longitude = None

        for planet in positions["planets"]:
            if planet["planet"] == "Sun":
                sun_longitude = planet["longitude"]
            elif planet["planet"] == "Moon":
                moon_longitude = planet["longitude"]

        if sun_longitude is None or moon_longitude is None:
            raise HTTPException(
                status_code=500,
                detail="Could not calculate Sun/Moon positions"
            )

        # Calculate Panchang
        panchang = get_panchang(
            sun_longitude=sun_longitude,
            moon_longitude=moon_longitude,
            date=datetime.combine(target_date, datetime.min.time()),
            sunrise_hour=sunrise_hour,
            sunset_hour=sunset_hour,
        )

        response = PanchangResponse(**panchang)

        # Cache for 24 hours
        await cache_service.set(cache_key, response.dict(), expiry=86400)

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )
    except Exception as e:
        logger.error(f"Panchang error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error calculating Panchang. Please try again."
        )


@router.get("/muhurat")
async def get_muhurat(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    date_str: str = None,
):
    """Get auspicious timings (Muhurat) for the day."""
    if date_str is None:
        date_str = date.today().isoformat()

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date '{date_str}'. Expected YYYY-MM-DD.",
        )

    try:
        # Get Panchang first
        panchang = await get_daily_panchang(latitude, longitude, date_str)

        # Calculate Abhijit Muhurat (approximate)
        # Abhijit is the 8th Muhurat from sunrise
        muhurat_duration = (18.0 - 6.0) / 15  # 30 muhurats in a day

        abhijit_start = 6.0 + 7 * muhurat_duration
        abhijit_end = 6.0 + 8 * muhurat_duration

        return {
            "date": date_str,
            "abhijit_muhurat": {
                "start": f"{int(abhijit_start):02d}:{int((abhijit_start % 1) * 60):02d}",
                "end": f"{int(abhijit_end):02d}:{int((abhijit_end % 1) * 60):02d}",
            },
            "rahu_kaal": panchang.rahu_kaal,
            "gulika_kaal": panchang.gulika_kaal,
            "note": "For precise muhurats, consult a Vedic calendar (Panchang)",
        }

    except HTTPException:
        # A bad date or an upstream failure should surface as itself, not be
        # relabelled "Error calculating Muhurat". The bare `except Exception`
        # below used to catch the 400 that `get_daily_panchang` raises for a
        # malformed date and turn it into a 500.
        raise
    except Exception as e:
        logger.error(f"Muhurat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error calculating Muhurat. Please try again."
        )


@router.get("/choghadiya")
async def get_choghadiya(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    date_str: str = None,
    timezone_offset: float = 5.5,
):
    """Get Choghadiya periods (auspicious/inauspicious time slots) for the day."""
    if date_str is None:
        date_str = date.today().isoformat()

    cache_key = f"choghadiya:{date_str}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        vedic_day = (target_date.weekday() + 1) % 7

        # Real sun times, as in /hora, instead of the latitude-only guess.
        sun_times = calculate_sunrise_sunset(
            target_date, latitude, longitude, tz_offset=5.5,
        )
        if sun_times["sunrise"] is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The sun does not rise or set at this latitude on this "
                    "date, so choghadiya cannot be computed."
                ),
            )
        sunrise_hour = sun_times["sunrise"]
        sunset_hour = sun_times["sunset"]

        all_periods = _calculate_choghadiya(sunrise_hour, sunset_hour, vedic_day)

        day_choghadiya = [p for p in all_periods if p["period"] == "day"]
        night_choghadiya = [p for p in all_periods if p["period"] == "night"]

        result = {
            "date": date_str,
            "sunrise": _hours_to_time_str(sunrise_hour),
            "sunset": _hours_to_time_str(sunset_hour),
            "day_choghadiya": day_choghadiya,
            "night_choghadiya": night_choghadiya,
        }

        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except HTTPException:
        # The polar-day guard raises a 400 explaining why; do not relabel it.
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        logger.error(f"Choghadiya error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Choghadiya.")


@router.get("/hora")
async def get_hora(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    date_str: str = None,
):
    """Get Hora periods (hourly planetary rulers) for the day."""
    if date_str is None:
        date_str = date.today().isoformat()

    cache_key = f"hora:{date_str}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        vedic_day = (target_date.weekday() + 1) % 7

        # Sunrise and sunset come from the same NOAA calculation the rest of
        # the app uses, rather than a linear guess off 28 degrees latitude.
        # The old formula ignored longitude entirely and moved sunrise by
        # 0.02h per degree of latitude, so it returned 6:00/18:00 for most of
        # India and drifted the hora boundaries with it.
        sun_times = calculate_sunrise_sunset(
            target_date, latitude, longitude,
            tz_offset=5.5,
        )
        if sun_times["sunrise"] is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The sun does not rise or set at this latitude on this "
                    "date, so hora cannot be computed."
                ),
            )
        sunrise_hour = sun_times["sunrise"]
        sunset_hour = sun_times["sunset"]

        all_periods = _calculate_hora(sunrise_hour, sunset_hour, vedic_day)

        # The dicts carry a "period" key, never a "day" key, so the old guard
        # `"day" not in p` was true for every entry and all 24 periods were
        # returned as day_hora -- the 12 night horas included.
        day_hora = [p for p in all_periods if p.get("period") == "day"]
        night_hora = [p for p in all_periods if p.get("period") == "night"]

        result = {
            "date": date_str,
            "day_hora": day_hora,
            "night_hora": night_hora,
        }

        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except HTTPException:
        # The polar-day guard above raises a 400 with a specific explanation.
        # `except Exception` would otherwise catch it and relabel it 500.
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        logger.error(f"Hora error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Hora.")


@router.get("/gowri")
async def get_gowri(
    date_str: str = None,
    latitude: float = Query(28.6139, ge=-90, le=90),
):
    """Get Gowri Panchangam periods (South Indian auspicious timing)."""
    if date_str is None:
        date_str = date.today().isoformat()

    cache_key = f"gowri:{date_str}:{latitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()
        vedic_day = (day_of_week + 1) % 7

        sun_times = calculate_sunrise_sunset(
            target_date, latitude, 77.2090, tz_offset=5.5,
        )
        if sun_times["sunrise"] is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The sun does not rise or set at this latitude on this "
                    "date, so Gowri cannot be computed."
                ),
            )

        periods = _calculate_gowri(sun_times["sunrise"], vedic_day)

        result = {
            "date": date_str,
            "periods": periods,
        }

        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except HTTPException:
        # The polar-day guard raises a 400 explaining why; do not relabel it.
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        logger.error(f"Gowri error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Gowri Panchangam.")


@router.get("/ghati")
async def get_ghati_muhurat(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    date_str: str = None,
):
    if date_str is None:
        date_str = date.today().isoformat()

    cache_key = f"ghati:{date_str}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        sun_times = calculate_sunrise_sunset(
            target_date, latitude, longitude, tz_offset=5.5,
        )
        if sun_times["sunrise"] is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The sun does not rise or set at this latitude on this "
                    "date, so ghati windows cannot be computed."
                ),
            )

        periods = _calculate_ghati_muhurat(sun_times["sunrise"], sun_times["sunset"])

        result = {
            "date": date_str,
            "muhurats": periods,
        }

        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except HTTPException:
        # The polar-day guard raises a 400 explaining why; do not relabel it.
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except Exception as e:
        logger.error(f"Ghati muhurat error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating Do Ghati Muhurat.")


@router.get("/monthly")
async def get_monthly_panchang(
    latitude: float = Query(28.6139, ge=-90, le=90),
    longitude: float = Query(77.2090, ge=-180, le=180),
    # An explicit out-of-range value is rejected by validation here (422); the
    # None default is the only path that reaches the body, so the bounds do
    # cover the case that previously surfaced as a 500.
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000, le=2100),
):
    """Get monthly Panchang â€” daily summaries for every day in the given month."""
    today = date.today()
    if month is None:
        month = today.month
    if year is None:
        year = today.year

    cache_key = f"panchang:monthly:{year}:{month}:{latitude}:{longitude}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    try:
        # Determine number of days in month
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        first_of_month = date(year, month, 1)
        days_in_month = (next_month - first_of_month).days

        daily_summaries = []

        for day in range(1, days_in_month + 1):
            target_date = date(year, month, day)
            date_str = target_date.isoformat()
            vedic_day = (target_date.weekday() + 1) % 7

            # Real sun times, as in /hora, instead of the latitude-only guess.
            sun_times = calculate_sunrise_sunset(
                target_date, latitude, longitude, tz_offset=5.5,
            )
            if sun_times["sunrise"] is None:
                # No sunrise on this date at this latitude; skip rather than
                # invent a window for the choghadiya count.
                continue
            sunrise_hour = sun_times["sunrise"]
            sunset_hour = sun_times["sunset"]

            # Get positions for this day
            positions = get_planetary_positions(
                year=year, month=month, day=day,
                hour=12, minute=0, timezone_offset=5.5,
            )

            sun_longitude = None
            moon_longitude = None
            for planet in positions["planets"]:
                if planet["planet"] == "Sun":
                    sun_longitude = planet["longitude"]
                elif planet["planet"] == "Moon":
                    moon_longitude = planet["longitude"]

            panchang_data = {}
            if sun_longitude is not None and moon_longitude is not None:
                try:
                    panchang = get_panchang(
                        sun_longitude=sun_longitude,
                        moon_longitude=moon_longitude,
                        date=datetime.combine(target_date, datetime.min.time()),
                        sunrise_hour=sunrise_hour,
                        sunset_hour=sunset_hour,
                    )
                    # `get_panchang` returns a dict, but the summary was built
                    # with `getattr(panchang, ...)`, which is always None on a
                    # dict. Every field came back null for every day of every
                    # month, and the bare `except` swallowed it.
                    panchang_data = {
                        key: panchang.get(key)
                        for key in ("tithi", "nakshatra", "yoga", "karana", "vara")
                    }
                except Exception:
                    logger.exception(
                        "Monthly panchang: could not build the panchang for %s",
                        date_str,
                    )

            # Add choghadiya summary for the day
            choghadiya = _calculate_choghadiya(sunrise_hour, sunset_hour, vedic_day)

            daily_summaries.append({
                "date": date_str,
                **panchang_data,
                "choghadiya_count": len(choghadiya),
                "first_choghadiya": choghadiya[0]["name"] if choghadiya else None,
            })

        result = {
            "year": year,
            "month": month,
            "latitude": latitude,
            "longitude": longitude,
            "days": daily_summaries,
        }

        await cache_service.set(cache_key, result, expiry=86400)
        return result

    except Exception as e:
        logger.error(f"Monthly panchang error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating monthly Panchang.")
