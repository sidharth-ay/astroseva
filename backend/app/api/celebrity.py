"""Celebrity horoscope analysis API endpoints."""

import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..core.planets import (
    SIGN_NAMES,
    get_planetary_positions,
    get_exalted_planets,
    get_debilitated_planets,
    get_retrograde_planets,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/celebrity", tags=["celebrity"])


# ---------------------------------------------------------------------------
# Celebrity database — real birth data
# ---------------------------------------------------------------------------

CELEBRITIES = [
    {
        "id": "narendra_modi",
        "name": "Narendra Modi",
        "birth_date": "1950-09-17",
        "birth_time": "11:00",
        "birth_place": "Vadnagar, Gujarat, India",
        "latitude": 23.7833,
        "longitude": 72.6333,
        "timezone_offset": 5.5,
        "profession": "Politician",
        "famous_for": "Prime Minister of India",
    },
    {
        "id": "mahatma_gandhi",
        "name": "Mahatma Gandhi",
        "birth_date": "1869-10-02",
        "birth_time": "07:45",
        "birth_place": "Porbandar, Gujarat, India",
        "latitude": 21.6422,
        "longitude": 69.6093,
        "timezone_offset": 5.5,
        "profession": "Freedom Fighter / Leader",
        "famous_for": "Father of the Nation, non-violent independence movement",
    },
    {
        "id": "indira_gandhi",
        "name": "Indira Gandhi",
        "birth_date": "1917-11-19",
        "birth_time": "23:15",
        "birth_place": "Allahabad, Uttar Pradesh, India",
        "latitude": 25.4358,
        "longitude": 81.8463,
        "timezone_offset": 5.5,
        "profession": "Politician",
        "famous_for": "First female Prime Minister of India",
    },
    {
        "id": "amitabh_bachchan",
        "name": "Amitabh Bachchan",
        "birth_date": "1942-10-11",
        "birth_time": "16:00",
        "birth_place": "Allahabad, Uttar Pradesh, India",
        "latitude": 25.4358,
        "longitude": 81.8463,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "Icon of Bollywood, 'Shahenshah of Bollywood'",
    },
    {
        "id": "shah_rukh_khan",
        "name": "Shah Rukh Khan",
        "birth_date": "1965-11-02",
        "birth_time": "06:30",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "'King of Bollywood', one of the biggest film stars globally",
    },
    {
        "id": "salman_khan",
        "name": "Salman Khan",
        "birth_date": "1965-12-27",
        "birth_time": "16:30",
        "birth_place": "Indore, Madhya Pradesh, India",
        "latitude": 22.7196,
        "longitude": 75.8577,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "'Bhaijaan of Bollywood', massive box-office draws",
    },
    {
        "id": "priyanka_chopra",
        "name": "Priyanka Chopra",
        "birth_date": "1982-07-18",
        "birth_time": "15:30",
        "birth_place": "Jamshedpur, Jharkhand, India",
        "latitude": 22.8046,
        "longitude": 86.2029,
        "timezone_offset": 5.5,
        "profession": "Actor / Producer",
        "famous_for": "Miss World 2000, global crossover star",
    },
    {
        "id": "sachin_tendulkar",
        "name": "Sachin Tendulkar",
        "birth_date": "1973-04-24",
        "birth_time": "12:15",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Cricketer",
        "famous_for": "'God of Cricket', most international runs and centuries",
    },
    {
        "id": "virat_kohli",
        "name": "Virat Kohli",
        "birth_date": "1988-11-05",
        "birth_time": "10:25",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone_offset": 5.5,
        "profession": "Cricketer",
        "famous_for": "Modern batting legend, former India captain",
    },
    {
        "id": "ms_dhoni",
        "name": "MS Dhoni",
        "birth_date": "1981-07-07",
        "birth_time": "11:15",
        "birth_place": "Ranchi, Jharkhand, India",
        "latitude": 23.3441,
        "longitude": 85.3096,
        "timezone_offset": 5.5,
        "profession": "Cricketer",
        "famous_for": "India's most successful cricket captain, World Cup winner",
    },
    {
        "id": "mukesh_ambani",
        "name": "Mukesh Ambani",
        "birth_date": "1957-04-19",
        "birth_time": "06:00",
        "birth_place": "Aden, Yemen",
        "latitude": 12.7855,
        "longitude": 45.0382,
        "timezone_offset": 3.0,
        "profession": "Business Tycoon",
        "famous_for": "Chairman of Reliance Industries, Asia's richest person",
    },
    {
        "id": "ratan_tata",
        "name": "Ratan Tata",
        "birth_date": "1937-12-28",
        "birth_time": "09:45",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Industrialist / Philanthropist",
        "famous_for": "Chairman Emeritus of Tata Group, visionary leader",
    },
    {
        "id": "sri_sri_ravi_shankar",
        "name": "Sri Sri Ravi Shankar",
        "birth_date": "1956-05-13",
        "birth_time": "07:00",
        "birth_place": "Papanasam, Tamil Nadu, India",
        "latitude": 11.1410,
        "longitude": 79.2804,
        "timezone_offset": 5.5,
        "profession": "Spiritual Leader",
        "famous_for": "Founder of Art of Living, humanitarian (birth time estimated)",
    },
    {
        "id": "sadhguru",
        "name": "Sadhguru Jaggi Vasudev",
        "birth_date": "1957-09-03",
        "birth_time": "12:30",
        "birth_place": "Mysore, Karnataka, India",
        "latitude": 12.2958,
        "longitude": 76.6394,
        "timezone_offset": 5.5,
        "profession": "Spiritual Leader",
        "famous_for": "Founder of Isha Foundation, yogi and mystic",
    },
    {
        "id": "atal_bihari_vajpayee",
        "name": "Atal Bihari Vajpayee",
        "birth_date": "1924-12-25",
        "birth_time": "12:00",
        "birth_place": "Gwalior, Madhya Pradesh, India",
        "latitude": 26.2183,
        "longitude": 78.1828,
        "timezone_offset": 5.5,
        "profession": "Politician / Poet",
        "famous_for": "Former Prime Minister of India, statesman and poet",
    },
    {
        "id": "rajinikanth",
        "name": "Rajinikanth",
        "birth_date": "1950-12-12",
        "birth_time": "23:30",
        "birth_place": "Bangalore, Karnataka, India",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "'Superstar' of Indian cinema, cultural icon",
    },
    {
        "id": "a_r_rahman",
        "name": "A. R. Rahman",
        "birth_date": "1967-01-06",
        "birth_time": "02:00",
        "birth_place": "Chennai, Tamil Nadu, India",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "timezone_offset": 5.5,
        "profession": "Music Composer / Singer",
        "famous_for": "Oscar and Grammy winner, 'Mozart of Madras'",
    },
    {
        "id": "sania_mirza",
        "name": "Sania Mirza",
        "birth_date": "1986-11-15",
        "birth_time": "08:15",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Tennis Player",
        "famous_for": "India's most successful female tennis player, Grand Slam winner",
    },
    {
        "id": "kiran_bedi",
        "name": "Kiran Bedi",
        "birth_date": "1949-06-09",
        "birth_time": "15:00",
        "birth_place": "Amritsar, Punjab, India",
        "latitude": 31.6340,
        "longitude": 74.8723,
        "timezone_offset": 5.5,
        "profession": "Police Officer / Social Activist",
        "famous_for": "India's first female IPS officer, social activist",
    },
    {
        "id": "saif_ali_khan",
        "name": "Saif Ali Khan",
        "birth_date": "1970-08-16",
        "birth_time": "12:00",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "National Award winner, Pataudi family head (birth time estimated)",
    },
    {
        "id": "sridevi",
        "name": "Sridevi",
        "birth_date": "1963-08-13",
        "birth_time": "12:00",
        "birth_place": "Sivakasi, Tamil Nadu, India",
        "latitude": 9.4493,
        "longitude": 77.7897,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "First female superstar of Hindi cinema (birth time estimated)",
    },
    {
        "id": "abhishek_bachchan",
        "name": "Abhishek Bachchan",
        "birth_date": "1976-02-05",
        "birth_time": "12:00",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "Guru, Paa, Dhoom series (birth time estimated)",
    },
    {
        "id": "preity_zinta",
        "name": "Preity Zinta",
        "birth_date": "1975-01-31",
        "birth_time": "12:00",
        "birth_place": "Shimla, Himachal Pradesh, India",
        "latitude": 31.1048,
        "longitude": 77.1734,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "Veer-Zaara, Dil Chahta Hai (birth time estimated)",
    },
    {
        "id": "aamir_khan",
        "name": "Aamir Khan",
        "birth_date": "1965-03-14",
        "birth_time": "06:15",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "Mr. Perfectionist — Dangal, Lagaan, 3 Idiots",
    },
    {
        "id": "alia_bhatt",
        "name": "Alia Bhatt",
        "birth_date": "1993-03-15",
        "birth_time": "12:00",
        "birth_place": "Mumbai, Maharashtra, India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "timezone_offset": 5.5,
        "profession": "Actor",
        "famous_for": "National Award winner — Raazi, Gully Boy (birth time estimated)",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# (month, day) cutoffs: sign changes ON the cutoff day (standard tropical dates).
ZODIAC_RANGES = [
    ((1, 1), (1, 19), "capricorn"),
    ((1, 20), (2, 18), "aquarius"),
    ((2, 19), (3, 20), "pisces"),
    ((3, 21), (4, 19), "aries"),
    ((4, 20), (5, 20), "taurus"),
    ((5, 21), (6, 20), "gemini"),
    ((6, 21), (7, 22), "cancer"),
    ((7, 23), (8, 22), "leo"),
    ((8, 23), (9, 22), "virgo"),
    ((9, 23), (10, 22), "libra"),
    ((10, 23), (11, 21), "scorpio"),
    ((11, 22), (12, 21), "sagittarius"),
    ((12, 22), (12, 31), "capricorn"),
]


def _zodiac_sign_from_date(birth_date: str) -> str:
    """Return Western zodiac sign from ISO date string."""
    d = datetime.strptime(birth_date, "%Y-%m-%d").date()
    md = (d.month, d.day)
    for start, end, sign in ZODIAC_RANGES:
        if start <= md <= end:
            return sign
    return "capricorn"


def _compute_chart_summary(celebrity: dict) -> dict:
    """Compute planetary positions and build chart summary for a celebrity."""
    year, month, day = map(int, celebrity["birth_date"].split("-"))
    hour, minute = map(float, celebrity["birth_time"].split(":"))

    positions = get_planetary_positions(
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        timezone_offset=celebrity["timezone_offset"],
        latitude=celebrity["latitude"],
        longitude=celebrity["longitude"],
    )

    asc_sign_index = positions["asc_sign"]
    asc_sign_name = SIGN_NAMES[asc_sign_index]

    exalted = get_exalted_planets(positions["planets"])
    debilitated = get_debilitated_planets(positions["planets"])
    retrograde = get_retrograde_planets(positions["planets"])

    # Identify notable placements
    notable = []
    for p in positions["planets"]:
        if p["dignity"] == "Exalted":
            notable.append(f"{p['planet']} exalted in {p['sign_name']}")
        elif p["dignity"] == "Own Sign":
            notable.append(f"{p['planet']} in own sign ({p['sign_name']})")
        elif p["dignity"] == "Moolatrikona":
            notable.append(f"{p['planet']} in Moolatrikona ({p['sign_name']})")

    # Planets in angular houses (approximate: within 7° of ascendant = same house)
    angular_planets = []
    asc_deg = positions["ascendant"]
    for p in positions["planets"]:
        diff = (p["longitude"] - asc_deg) % 360
        if diff < 7 or (360 - diff) < 7:
            angular_planets.append(p["planet"])

    # Key planetary placements for summary
    key_placements = []
    for p in positions["planets"]:
        if p["planet"] in ("Sun", "Moon", "Mars", "Jupiter", "Saturn", "Rahu"):
            retro_str = " (R)" if p["retrograde"] else ""
            key_placements.append(
                f"{p['planet']} in {p['sign_name']} {p['sign_degree']:.1f}°{retro_str}"
            )

    return {
        "ascendant": f"{asc_sign_name} {positions['asc_sign_degree']:.1f}°",
        "asc_sign": asc_sign_name,
        "key_placements": key_placements,
        "exalted_planets": exalted,
        "debilitated_planets": debilitated,
        "retrograde_planets": retrograde,
        "notable_features": notable,
        "angular_planets": angular_planets,
        "all_planets": positions["planets"],
    }


def _build_celebrity_response(celebrity: dict, chart: dict) -> dict:
    """Build the full response for a celebrity."""
    # Determine what makes their chart notable
    highlights = []

    if chart["exalted_planets"]:
        highlights.append(
            f"Exalted {', '.join(chart['exalted_planets'])} — a position of great strength"
        )

    if chart["debilitated_planets"]:
        highlights.append(
            f"Debilitated {', '.join(chart['debilitated_planets'])} — challenges that drive growth"
        )

    for p in chart["all_planets"]:
        if p["planet"] in ("Sun", "Moon", "Jupiter") and p["dignity"] == "Own Sign":
            highlights.append(
                f"{p['planet']} in own sign ({p['sign_name']}) — natural authority and expression"
            )

    if chart["angular_planets"]:
        highlights.append(
            f"Planets in angular houses ({', '.join(chart['angular_planets'])}) — public visibility and impact"
        )

    if "Mars" in chart["notable_features"] or any("Mars" in n for n in chart["notable_features"]):
        highlights.append("Strong Mars energy — drive, courage, and pioneering spirit")

    if "Saturn" in chart["notable_features"] or any("Saturn" in n for n in chart["notable_features"]):
        highlights.append("Strong Saturn influence — discipline, endurance, and structure")

    # Rahu/Ketu axis
    rahu = next((p for p in chart["all_planets"] if p["planet"] == "Rahu"), None)
    ketu = next((p for p in chart["all_planets"] if p["planet"] == "Ketu"), None)
    if rahu and ketu:
        highlights.append(
            f"Rahu in {rahu['sign_name']}, Ketu in {ketu['sign_name']} — karmic axis of {rahu['sign_name']}/{ketu['sign_name']}"
        )

    if not highlights:
        highlights.append("A balanced chart with steady planetary support")

    return {
        "celebrity": {
            "id": celebrity["id"],
            "name": celebrity["name"],
            "birth_date": celebrity["birth_date"],
            "birth_time": celebrity["birth_time"],
            "birth_place": celebrity["birth_place"],
            "profession": celebrity["profession"],
            "famous_for": celebrity["famous_for"],
            "zodiac_sign": _zodiac_sign_from_date(celebrity["birth_date"]),
        },
        "chart_summary": {
            "ascendant": chart["ascendant"],
            "key_placements": chart["key_placements"],
            "exalted_planets": chart["exalted_planets"],
            "debilitated_planets": chart["debilitated_planets"],
            "retrograde_planets": chart["retrograde_planets"],
            "notable_features": chart["notable_features"],
            "chart_highlights": highlights,
        },
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/list")
async def get_celebrity_list():
    """Return list of famous Indian celebrities with birth details."""
    items = []
    for c in CELEBRITIES:
        try:
            zodiac = _zodiac_sign_from_date(c["birth_date"])
        except Exception:
            logger.warning(f"Skipping celebrity with bad birth_date: {c.get('id')}")
            continue
        items.append(
            {
                "id": c["id"],
                "name": c["name"],
                "birth_date": c["birth_date"],
                "birth_place": c["birth_place"],
                "profession": c["profession"],
                "famous_for": c["famous_for"],
                "zodiac_sign": zodiac,
            }
        )
    return {"celebrities": items}


@router.get("/zodiac/{sign}")
async def get_celebrities_by_zodiac(sign: str):
    """Return celebrities matching a Western zodiac sign."""
    sign = sign.lower()
    if sign not in SIGN_NAMES and sign not in [
        "aries", "taurus", "gemini", "cancer", "leo", "virgo",
        "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
    ]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid zodiac sign. Must be one of: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces",
        )

    matched = []
    for c in CELEBRITIES:
        try:
            if _zodiac_sign_from_date(c["birth_date"]) == sign:
                matched.append(c)
        except Exception:
            logger.warning(f"Skipping celebrity with bad birth_date: {c.get('id')}")
            continue

    return {
        "zodiac_sign": sign,
        "count": len(matched),
        "celebrities": [
            {
                "id": c["id"],
                "name": c["name"],
                "birth_date": c["birth_date"],
                "birth_place": c["birth_place"],
                "profession": c["profession"],
                "famous_for": c["famous_for"],
                "zodiac_sign": sign,
            }
            for c in matched
        ],
    }


@router.get("/{celebrity_id}")
async def get_celebrity_detail(celebrity_id: str):
    """Return detailed horoscope analysis for a specific celebrity."""
    celebrity = next((c for c in CELEBRITIES if c["id"] == celebrity_id), None)
    if not celebrity:
        available = [c["id"] for c in CELEBRITIES]
        raise HTTPException(
            status_code=404,
            detail=f"Celebrity '{celebrity_id}' not found. Available: {', '.join(available)}",
        )

    try:
        chart = _compute_chart_summary(celebrity)
    except Exception as e:
        logger.error(f"Failed to compute chart for {celebrity['name']}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute astrological chart for {celebrity['name']}: {str(e)}",
        )

    return _build_celebrity_response(celebrity, chart)
