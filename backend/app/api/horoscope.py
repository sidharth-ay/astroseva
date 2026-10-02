"""Horoscope API endpoints — instant local + background AI warm."""

import asyncio
import logging
import random
from datetime import date
from fastapi import APIRouter, HTTPException, Request
from ..core.rate_limit import limiter

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
        # Only cache AI-generated responses, not local fallbacks
        if result.get("model") == "astroseva-local":
            logger.info(f"Got local fallback for {sign}, not caching")
            return False
        prediction = result.get("prediction", "")
        if len(prediction) < 100:
            logger.warning(f"Gemini returned short horoscope for {sign} ({len(prediction)} chars), not caching")
            return False
        response = HoroscopeResponse(
            zodiac_sign=sign,
            date=date.today().isoformat(),
            prediction=prediction,
            love_rating=result.get("love_rating", 4),
            career_rating=result.get("career_rating", 4),
            health_rating=result.get("health_rating", 4),
            lucky_numbers=result.get("lucky_numbers", [3, 7, 9]),
            lucky_color=result.get("lucky_color", "Blue"),
            ai_model=result.get("model", "astroseva-local"),
        )
        cache_key = f"horoscope:{sign}:{date.today().isoformat()}:{language}"
        await cache_service.set(cache_key, response.model_dump(), expiry=86400)
        logger.info(f"Cached AI horoscope for {sign}")
        return True
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


# ---------------------------------------------------------------------------
# Period-specific local fallback generators
# ---------------------------------------------------------------------------

SIGN_META = {
    "aries": {"planet": "Mars", "element": "Fire", "trait": "bold and ambitious", "season": "spring"},
    "taurus": {"planet": "Venus", "element": "Earth", "trait": "patient and grounded", "season": "spring"},
    "gemini": {"planet": "Mercury", "element": "Air", "trait": "versatile and curious", "season": "spring"},
    "cancer": {"planet": "Moon", "element": "Water", "trait": "intuitive and nurturing", "season": "summer"},
    "leo": {"planet": "Sun", "element": "Fire", "trait": "creative and warm-hearted", "season": "summer"},
    "virgo": {"planet": "Mercury", "element": "Earth", "trait": "analytical and practical", "season": "summer"},
    "libra": {"planet": "Venus", "element": "Air", "trait": "harmonious and diplomatic", "season": "autumn"},
    "scorpio": {"planet": "Pluto", "element": "Water", "trait": "passionate and resourceful", "season": "autumn"},
    "sagittarius": {"planet": "Jupiter", "element": "Fire", "trait": "adventurous and optimistic", "season": "autumn"},
    "capricorn": {"planet": "Saturn", "element": "Earth", "trait": "disciplined and ambitious", "season": "winter"},
    "aquarius": {"planet": "Saturn", "element": "Air", "trait": "innovative and independent", "season": "winter"},
    "pisces": {"planet": "Neptune", "element": "Water", "trait": "intuitive and compassionate", "season": "winter"},
}

WEEK_THEMES = [
    "Mercury's direct motion opens communication channels",
    "Venus creates harmony in personal and professional life",
    "Mars energises your drive and ambition",
    "Jupiter expands your horizons and attracts luck",
    "Saturn demands discipline and rewards patience",
    "The Full Moon illuminates hidden truths",
    "A New Moon seeds fresh beginnings",
    "Neptune heightens intuition and creativity",
    "Pluto triggers deep transformation",
    "Uranus brings unexpected breakthroughs",
]

MONTH_THEMES = [
    "Major planetary shifts reshape your priorities this month",
    "A powerful eclipse cycle brings endings and fresh starts",
    "Venus and Mars align to spark passion and drive",
    "Saturn's transit tests your resilience and commitment",
    "Jupiter's influence broadens your perspective",
    "Mercury retrograde invites reflection before action",
    "The lunar nodes highlight your karmic path",
    "Chiron's healing energy soothes old wounds",
    "A stellium in your sector amplifies key themes",
    "Outer planets challenge you to grow beyond comfort",
]

LOVE_THEMES = [
    "Venus graces your romantic sector, deepening bonds",
    "Mars ignites passion and physical chemistry",
    "The Moon's transit through your love house stirs emotions",
    "Jupiter expands your capacity for joy and intimacy",
    "Saturn strengthens long-term commitment",
    "Neptune weaves romantic idealism into your connections",
    "Pluto transforms your approach to vulnerability",
    "Uranus liberates you from stale relationship patterns",
    "The North Node pulls you toward soul-mate energy",
    "Chiron heals heartache and opens you to new love",
]

LUCKY_COLORS = [
    "Red", "Blue", "Green", "Yellow", "White",
    "Orange", "Purple", "Gold", "Pink", "Silver",
    "Crimson", "Teal", "Indigo", "Ivory", "Coral",
]


def _seed_from_sign(sign: str, extra: str = "") -> int:
    """Deterministic seed so the same sign+period always returns the same fallback."""
    today = date.today()
    raw = f"{sign}:{today.isoformat()}:{extra}"
    return hash(raw) % (2**31)


def _generate_weekly_fallback(sign: str) -> dict:
    """Generate weekly horoscope locally."""
    meta = SIGN_META.get(sign, SIGN_META["aries"])
    rng = random.Random(_seed_from_sign(sign, "weekly"))

    week_num = date.today().isocalendar()[1]
    theme = WEEK_THEMES[week_num % len(WEEK_THEMES)]

    prediction = (
        f"Week {week_num} Horoscope for {sign.title()}\n\n"
        f"As a {meta['element']} sign ruled by {meta['planet']}, you enter this week "
        f"with your characteristic {meta['trait']} energy. {theme}, and its influence "
        f"will be felt most strongly in the first half of the week.\n\n"
        f"Early in the week, the Moon's transit through your fellow {meta['element']} "
        f"signs bolsters your natural instincts. Trust your gut when making decisions "
        f"about work projects or personal commitments — your intuition is sharper than "
        f"usual. By mid-week, a minor square aspect may create tension between your "
        f"desires and your responsibilities. Stay grounded and avoid impulsive reactions; "
        f"your ruling planet {meta['planet']} supports measured action over haste.\n\n"
        f"As the weekend approaches, a harmonious trine lifts your spirits and opens "
        f"doors to social connection. This is an excellent time to network, collaborate, "
        f"or simply enjoy the company of loved ones. Financially, small gains are likely "
        f"through unexpected channels — perhaps a reimbursement you forgot about or a "
        f"friend who treats you. Overall, this week favours steady progress over dramatic "
        f"leaps. Lean into your {meta['element']} nature and let consistency carry you forward."
    )

    return {
        "prediction": prediction,
        "love_rating": rng.randint(3, 5),
        "career_rating": rng.randint(3, 5),
        "health_rating": rng.randint(3, 5),
        "lucky_numbers": sorted(rng.sample(range(1, 50), 3)),
        "lucky_color": rng.choice(LUCKY_COLORS),
    }


def _generate_monthly_fallback(sign: str) -> dict:
    """Generate monthly horoscope locally."""
    meta = SIGN_META.get(sign, SIGN_META["aries"])
    rng = random.Random(_seed_from_sign(sign, "monthly"))

    today = date.today()
    month_name = today.strftime("%B")
    theme = MONTH_THEMES[today.month % len(MONTH_THEMES)]

    prediction = (
        f"{month_name} Horoscope for {sign.title()}\n\n"
        f"This month brings a powerful wave of {meta['element'].lower()} energy "
        f"into your life, {sign}. As a {meta['trait']} soul guided by {meta['planet']}, "
        f"you are uniquely positioned to navigate the shifts ahead. {theme}, and this "
        f"will ripple through multiple areas of your life.\n\n"
        f"Professionally, the first two weeks demand focus and precision. A project or "
        f"responsibility that has been building reaches a critical point around the "
        f"second week. Your natural {meta['element'].lower()} qualities — "
        f"{'patience, reliability, and persistence' if meta['element'] == 'Earth' else 'creativity, passion, and enthusiasm' if meta['element'] == 'Fire' else 'communication, adaptability, and intellectual clarity' if meta['element'] == 'Air' else 'emotional depth, empathy, and intuition' if meta['element'] == 'Water' else 'your strengths'} "
        f"— serve you well here. Do not shy away from leadership if the moment calls for it.\n\n"
        f"Romantically, {meta['planet']}'s transit through your partnership sector "
        f"encourages honest conversations. If single, a connection may form through "
        f"shared interests or a social gathering. If partnered, revisit a dream you "
        f"both once shared — now is the time to act on it.\n\n"
        f"Health-wise, the latter half of the month favours restorative practices. "
        f"Consider yoga, meditation, or simply more time outdoors. {meta['planet']} "
        f"rewards those who honour their body's rhythms. By month's end, you will "
        f"feel a renewed sense of clarity and purpose."
    )

    return {
        "prediction": prediction,
        "love_rating": rng.randint(3, 5),
        "career_rating": rng.randint(3, 5),
        "health_rating": rng.randint(3, 5),
        "lucky_numbers": sorted(rng.sample(range(1, 50), 3)),
        "lucky_color": rng.choice(LUCKY_COLORS),
    }


def _generate_yearly_fallback(sign: str) -> dict:
    """Generate yearly horoscope locally."""
    meta = SIGN_META.get(sign, SIGN_META["aries"])
    rng = random.Random(_seed_from_sign(sign, "yearly"))

    year = date.today().year
    prediction = (
        f"{year} Annual Horoscope for {sign.title()}\n\n"
        f"The year ahead is a defining chapter for you, {sign}. As a {meta['element']} "
        f"sign ruled by {meta['planet']}, your {meta['trait']} nature will be both "
        f"your compass and your anchor. This year's major planetary alignments — "
        f"particularly Jupiter's journey through the water and earth signs — resonate "
        f"deeply with your core energy, bringing opportunities for growth that you have "
        f"been quietly preparing for.\n\n"
        f"The first quarter sets the tone. {meta['planet']}'s early-year transit "
        f"through your house of self-image and identity invites you to redefine how "
        f"you show up in the world. Whether it is a career pivot, a new creative "
        f"endeavour, or simply a more authentic version of yourself, the seeds planted "
        f"now will blossom by summer. Do not underestimate the power of small, "
        f"consistent actions — they compound into extraordinary results.\n\n"
        f"Mid-year brings a pivotal eclipse in your career sector. This is a moment "
        f"of reckoning: something that no longer serves your highest path will fall "
        f"away, making room for something far more aligned. Trust the process, even "
        f"when it feels uncomfortable. {meta['planet']} rewards courage.\n\n"
        f"Love deepens in the second half of the year. Venus and {meta['planet']}'s "
        f"harmonious aspect opens your heart to deeper intimacy. Singles may find "
        f"themselves drawn to someone who challenges and inspires them in equal measure. "
        f"Couples rediscover a renewed spark through shared adventures or meaningful "
        f"conversations.\n\n"
        f"Financially, the year favours long-term investments over quick wins. Saturn "
        f"in your money house teaches patience — the rewards come to those who plan "
        f"wisely and avoid speculative risks.\n\n"
        f"Health peaks in the final quarter. Your body responds beautifully to "
        f"structured routines, so build sustainable habits now. Overall, {year} is "
        f"a year of quiet transformation for {sign}. Trust your {meta['element'].lower()} "
        f"instincts, honour {meta['planet']}'s guidance, and step boldly into the "
        f"person you are becoming."
    )

    return {
        "prediction": prediction,
        "love_rating": rng.randint(3, 5),
        "career_rating": rng.randint(3, 5),
        "health_rating": rng.randint(3, 5),
        "lucky_numbers": sorted(rng.sample(range(1, 50), 3)),
        "lucky_color": rng.choice(LUCKY_COLORS),
    }


def _generate_love_fallback(sign: str) -> dict:
    """Generate love horoscope locally."""
    meta = SIGN_META.get(sign, SIGN_META["aries"])
    rng = random.Random(_seed_from_sign(sign, "love"))

    love_theme = LOVE_THEMES[date.today().isocalendar()[1] % len(LOVE_THEMES)]

    prediction = (
        f"Weekly Love Horoscope for {sign.title()}\n\n"
        f"Romance is in the air, {sign}. {love_theme}, and as a {meta['element']} "
        f"sign ruled by {meta['planet']}, you feel this energy acutely. Your "
        f"{meta['trait']} nature draws people toward you — now is the time to "
        f"channel that magnetism with intention.\n\n"
        f"If you are single, the early part of the week favours bold moves. "
        f"{meta['planet']}'s influence in your romance sector gives you an extra "
        f"dash of confidence. A conversation that starts casually may reveal "
        f"unexpected depth. Keep your heart open, but also your eyes — a meaningful "
        f"connection could come from someone you least expect, perhaps through a "
        f"friend's introduction or a shared hobby.\n\n"
        f"If you are in a relationship, this week invites you to go beyond the "
        f"surface. Ask your partner about a dream they have not spoken about in a "
        f"while. Share something vulnerable about your own hopes. The {meta['element'].lower()} "
        f"energy supports emotional intimacy right now, and honest dialogue will "
        f"strengthen your bond in ways that grand gestures cannot.\n\n"
        f"Mid-week, a minor planetary square may stir old insecurities or bring up "
        f"a past wound. Do not let it derail you. Acknowledge the feeling, share it "
        f"if you can, and let it pass. {meta['planet']} reminds you that true love "
        f"is not the absence of conflict but the willingness to grow through it.\n\n"
        f"By the weekend, Venus's harmonious aspect wraps you in warmth. Plan "
        f"something enjoyable together — a walk, a home-cooked meal, or simply "
        f"uninterrupted time with no screens. The small, attentive moments are what "
        f"love remembers."
    )

    return {
        "prediction": prediction,
        "love_rating": rng.randint(4, 5),
        "career_rating": rng.randint(3, 4),
        "health_rating": rng.randint(3, 5),
        "lucky_numbers": sorted(rng.sample(range(1, 50), 3)),
        "lucky_color": rng.choice(LUCKY_COLORS),
    }


# ---------------------------------------------------------------------------
# Daily horoscope endpoints
# ---------------------------------------------------------------------------

@router.get("/daily/{sign}", response_model=HoroscopeResponse)
@limiter.limit("60/minute")
async def get_daily_horoscope(request: Request, sign: str, language: str = "en"):
    """Daily horoscope — instant from cache/local, AI refreshes in background."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = f"horoscope:{sign}:{date.today().isoformat()}:{language}"
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
        is_ai = cached.get("ai_model") and cached.get("ai_model") != "astroseva-local"
        if is_ai:
            return _build_response(sign, cached)
        # Local cached — serve + retry in background
        asyncio.create_task(_warm_sign(sign, language))
        return _build_response(sign, cached)

    # Stale/short cache entry — treat as cache miss
    if cached:
        logger.warning(f"Cache for {sign} has short prediction ({len(cached.get('prediction', ''))} chars), regenerating")

    # First request — serve local instantly, fire AI in background
    local = _local_response(sign)
    await cache_service.set(cache_key, local.model_dump(), expiry=86400)
    asyncio.create_task(_warm_sign(sign, language))
    return local


@router.get("/daily")
@limiter.limit("60/minute")
async def get_all_daily_horoscopes(request: Request, language: str = "en"):
    """All 12 signs in parallel."""
    cache_key = f"horoscope:all:{date.today().isoformat()}:{language}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached

    tasks = [_get_one(sign, language) for sign in ZODIAC_SIGNS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    horoscopes = []
    signs_to_warm = []
    for sign, r in zip(ZODIAC_SIGNS, results, strict=True):
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
    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
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


# ---------------------------------------------------------------------------
# Weekly / Monthly / Yearly / Love horoscope endpoints
# ---------------------------------------------------------------------------

def _period_local_response(sign: str, period: str) -> HoroscopeResponse:
    """Return a locally-generated horoscope for a given period."""
    generators = {
        "weekly": _generate_weekly_fallback,
        "monthly": _generate_monthly_fallback,
        "yearly": _generate_yearly_fallback,
        "love": _generate_love_fallback,
    }
    fb = generators[period](sign)
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


def _period_cache_key(sign: str, period: str, language: str) -> str:
    """Build a cache key that changes once per period."""
    today = date.today()
    if period == "weekly":
        label = f"W{today.isocalendar()[1]}"
    elif period == "monthly":
        label = today.strftime("%Y-%m")
    elif period == "yearly":
        label = str(today.year)
    else:  # love — weekly cadence
        label = f"W{today.isocalendar()[1]}"
    return f"horoscope:{period}:{sign}:{label}:{language}"


def _build_period_response(sign: str, period: str, data: dict) -> HoroscopeResponse:
    """Build HoroscopeResponse from a cached period dict."""
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


@router.get("/weekly/{sign}", response_model=HoroscopeResponse)
@limiter.limit("60/minute")
async def get_weekly_horoscope(request: Request, sign: str, language: str = "en"):
    """Weekly horoscope — cached or local fallback."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = _period_cache_key(sign, "weekly", language)
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
        return _build_period_response(sign, "weekly", cached)

    local = _period_local_response(sign, "weekly")
    await cache_service.set(cache_key, local.model_dump(), expiry=604800)  # 7 days
    return local


@router.get("/monthly/{sign}", response_model=HoroscopeResponse)
@limiter.limit("60/minute")
async def get_monthly_horoscope(request: Request, sign: str, language: str = "en"):
    """Monthly horoscope — cached or local fallback."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = _period_cache_key(sign, "monthly", language)
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
        return _build_period_response(sign, "monthly", cached)

    local = _period_local_response(sign, "monthly")
    await cache_service.set(cache_key, local.model_dump(), expiry=2592000)  # 30 days
    return local


@router.get("/yearly/{sign}", response_model=HoroscopeResponse)
@limiter.limit("60/minute")
async def get_yearly_horoscope(request: Request, sign: str, language: str = "en"):
    """Yearly horoscope — cached or local fallback."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = _period_cache_key(sign, "yearly", language)
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
        return _build_period_response(sign, "yearly", cached)

    local = _period_local_response(sign, "yearly")
    await cache_service.set(cache_key, local.model_dump(), expiry=31536000)  # 365 days
    return local


@router.get("/love/{sign}", response_model=HoroscopeResponse)
@limiter.limit("60/minute")
async def get_love_horoscope(request: Request, sign: str, language: str = "en"):
    """Weekly love horoscope — cached or local fallback."""
    sign = sign.lower()
    if sign not in ZODIAC_SIGNS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: {', '.join(ZODIAC_SIGNS)}"
        )

    cache_key = _period_cache_key(sign, "love", language)
    cached = await cache_service.get(cache_key)

    if cached and cached.get("prediction") and len(cached["prediction"]) >= 100:
        return _build_period_response(sign, "love", cached)

    local = _period_local_response(sign, "love")
    await cache_service.set(cache_key, local.model_dump(), expiry=604800)  # 7 days
    return local


# ---------------------------------------------------------------------------
# Startup warming
# ---------------------------------------------------------------------------

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
@limiter.limit("60/minute")
async def get_zodiac_signs(request: Request, ):
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
