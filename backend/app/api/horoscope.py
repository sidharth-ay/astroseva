"""Horoscope API endpoints — instant local + background AI warm."""

import asyncio
import logging
from datetime import date
from fastapi import APIRouter, HTTPException

from ..models.response import HoroscopeResponse
from ..services.ai_service import generate_horoscope, generate_fallback_horoscope
from ..services.cache_service import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/horoscope", tags=["horoscope"])

ZODIAC_SIGNS = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]

ZODIAC_SYMBOLS = {
    "aries": "♈", "taurus": "♉", "gemini": "♊", "cancer": "♋",
    "leo": "♌", "virgo": "♍", "libra": "♎", "scorpio": "♏",
    "sagittarius": "♐", "capricorn": "♑", "aquarius": "♒", "pisces": "♓",
}


def _local_response(sign: str) -> HoroscopeResponse:
    """Instantly produce a local (non-AI) horoscope."""
    fb = generate_fallback_horoscope(sign)
    return HoroscopeResponse(
        zodiac_sign=sign,
        date=date.today().isoformat(),
        prediction=fb["prediction"],
        love_rating=fb["love_rating"],
        career_rating=fb["career_rating"],
        health_rating=fb["health_rating"],
        lucky_numbers=fb["lucky_numbers"],
        lucky_color=fb["lucky_color"],
        ai_model="astroseva-local",
    )


async def _warm_sign(sign: str, language: str = "en") -> bool:
    """Background: call Gemini and cache the result. Returns False on quota exhaustion."""
    try:
        result = await generate_horoscope(sign, language)
        response = HoroscopeResponse(
            zodiac_sign=sign,
            date=date.today().isoformat(),
            prediction=result["prediction"],
            love_rating=result.get("love_rating", 4),
            career_rating=result.get("career_rating", 4),
            health_rating=result.get("health_rating", 4),
            lucky_numbers=result.get("lucky_numbers", [3, 7, 9]),
            lucky_color=result.get("lucky_color", "Blue"),
            ai_model=result.get("model", "astroseva-local"),
        )
        cache_key = f"horoscope:{sign}:{date.today().isoformat()}:{language}"
        await cache_service.set(cache_key, response.model_dump(), expiry=86400)
        return result.get("model") != "astroseva-local"
    except Exception as e:
        logger.warning(f"Background warm failed for {sign}: {e}")
        return False


def _build_response(sign: str, data: dict) -> HoroscopeResponse:
    """Safely build HoroscopeResponse from any cached dict."""
    return HoroscopeResponse(
        zodiac_sign=data.get("zodiac_sign", sign),
        date=data.get("date", date.today().isoformat()),
        prediction=data.get("prediction", ""),
        love_rating=data.get("love_rating", 3),
        career_rating=data.get("career_rating", 3),
        health_rating=data.get("health_rating", 3),
        lucky_numbers=data.get("lucky_numbers", [1, 7, 9]),
        lucky_color=data.get("lucky_color", "Blue"),
        ai_model=data.get("ai_model", data.get("model", "astroseva-local")),
    )


@router.get("/daily/{sign}", response_model=HoroscopeResponse)
async def get_daily_horoscope(sign: str, language: str = "en"):
    """Daily horoscope — instant from cache/local, AI refreshes in background."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = f"horoscope:{sign}:{date.today().isoformat()}:{language}"
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction"):
        is_ai = cached.get("ai_model") and cached.get("ai_model") != "astroseva-local"
        if is_ai:
            return _build_response(sign, cached)
        # Local cached — serve + retry in background
        asyncio.create_task(_warm_sign(sign, language))
        return _build_response(sign, cached)

    # First request — serve local instantly, fire AI in background
    local = _local_response(sign)
    await cache_service.set(cache_key, local.model_dump(), expiry=86400)
    asyncio.create_task(_warm_sign(sign, language))
    return local


@router.get("/daily")
async def get_all_daily_horoscopes(language: str = "en"):
    """All 12 signs in parallel."""
    cache_key = f"horoscope:all:{date.today().isoformat()}:{language}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    tasks = [_get_one(sign, language) for sign in ZODIAC_SIGNS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    horoscopes = []
    signs_to_warm = []
    for sign, r in zip(ZODIAC_SIGNS, results):
        if isinstance(r, Exception):
            horoscopes.append(_local_response(sign).model_dump())
            signs_to_warm.append(sign)
        else:
            horoscopes.append(r)
            if r.get("ai_model") == "astroseva-local":
                signs_to_warm.append(sign)

    output = {"horoscopes": horoscopes}
    await cache_service.set(cache_key, output, expiry=3600)

    if signs_to_warm:
        asyncio.create_task(_warm_all(signs_to_warm, language))

    return output


async def _get_one(sign: str, language: str) -> dict:
    """Get one sign — cache or local."""
    cache_key = f"horoscope:{sign}:{date.today().isoformat()}:{language}"
    cached = await cache_service.get(cache_key)
    if cached and cached.get("prediction"):
        return _build_response(sign, cached).model_dump()
    return _local_response(sign).model_dump()


async def _warm_all(signs: list, language: str) -> None:
    """Warm multiple signs sequentially. Stop early if quota exhausted."""
    for sign in signs:
        ok = await _warm_sign(sign, language)
        if not ok:
            logger.info(f"AI quota exhausted or failed — stopping warm after {sign}")
            return  # don't hammer remaining signs
        await asyncio.sleep(1)


async def warm_all_horoscopes() -> None:
    """Called at startup — warm all 12 signs."""
    today = date.today().isoformat()
    to_warm = []
    for sign in ZODIAC_SIGNS:
        cache_key = f"horoscope:{sign}:{today}:en"
        cached = await cache_service.get(cache_key)
        if not cached or cached.get("ai_model") == "astroseva-local":
            to_warm.append(sign)
    if to_warm:
        logger.info(f"Warming {len(to_warm)} horoscope signs at startup...")
        await _warm_all(to_warm, "en")
        logger.info("Startup horoscope warming complete.")


@router.get("/signs")
async def get_zodiac_signs():
    """Get all available zodiac signs."""
    return {
        "signs": [
            {
                "id": sign,
                "name": sign.capitalize(),
                "symbol": ZODIAC_SYMBOLS[sign],
            }
            for sign in ZODIAC_SIGNS
        ]
    }
