"""Panchang (Five Limbs) calculation for Vedic Astrology."""

from datetime import datetime, timedelta
from typing import Optional
import math

# Tithi names
TITHI_NAMES = {
    1: {"en": "Pratipada", "hi": "प्रतिपदा"},
    2: {"en": "Dwitiya", "hi": "द्वितीया"},
    3: {"en": "Tritiya", "hi": "तृतीया"},
    4: {"en": "Chaturthi", "hi": "चतुर्थी"},
    5: {"en": "Panchami", "hi": "पञ्चमी"},
    6: {"en": "Shashthi", "hi": "षष्ठी"},
    7: {"en": "Saptami", "hi": "सप्तमी"},
    8: {"en": "Ashtami", "hi": "अष्टमी"},
    9: {"en": "Navami", "hi": "नवमी"},
    10: {"en": "Dashami", "hi": "दशमी"},
    11: {"en": "Ekadashi", "hi": "एकादशी"},
    12: {"en": "Dwadashi", "hi": "द्वादशी"},
    13: {"en": "Trayodashi", "hi": "त्रयोदशी"},
    14: {"en": "Chaturdashi", "hi": "चतुर्दशी"},
    15: {"en": "Purnima", "hi": "पूर्णिमा"},
    16: {"en": "Pratipada", "hi": "प्रतिपदा"},
    17: {"en": "Dwitiya", "hi": "द्वितीया"},
    18: {"en": "Tritiya", "hi": "तृतीया"},
    19: {"en": "Chaturthi", "hi": "चतुर्थी"},
    20: {"en": "Panchami", "hi": "पञ्चमी"},
    21: {"en": "Shashthi", "hi": "षष्ठी"},
    22: {"en": "Saptami", "hi": "सप्तमी"},
    23: {"en": "Ashtami", "hi": "अष्टमी"},
    24: {"en": "Navami", "hi": "नवमी"},
    25: {"en": "Dashami", "hi": "दशमी"},
    26: {"en": "Ekadashi", "hi": "एकादशी"},
    27: {"en": "Dwadashi", "hi": "द्वादशी"},
    28: {"en": "Trayodashi", "hi": "त्रयोदशी"},
    29: {"en": "Chaturdashi", "hi": "चतुर्दशी"},
    30: {"en": "Amavasya", "hi": "अमावस्या"},
}

# Nakshatra names (same as nakshatras.py but for panchang)
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
    "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
    "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Yoga names
YOGA_NAMES = [
    "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarman", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
    "Indra", "Vaidhriti"
]

# Karana names
KARANA_NAMES = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garaja",
    "Vanija", "Vishti", "Shakuni", "Chatushpada", "Nagava",
    "Kimstughna"
]

# Vara (day) names
VARA_NAMES = {
    0: {"en": "Sunday", "hi": "रविवार", "lord": "Sun"},
    1: {"en": "Monday", "hi": "सोमवार", "lord": "Moon"},
    2: {"en": "Tuesday", "hi": "मंगलवार", "lord": "Mars"},
    3: {"en": "Wednesday", "hi": "बुधवार", "lord": "Mercury"},
    4: {"en": "Thursday", "hi": "गुरुवार", "lord": "Jupiter"},
    5: {"en": "Friday", "hi": "शुक्रवार", "lord": "Venus"},
    6: {"en": "Saturday", "hi": "शनिवार", "lord": "Saturn"},
}

# Rahu Kaal (approximate, varies by day and location)
RAHU_KAAL_BASE = {
    0: (4.5, 6.0),    # Sunday: 4.5-6.0
    1: (7.5, 9.0),    # Monday: 7.5-9.0
    2: (15.0, 16.5),  # Tuesday: 15.0-16.5
    3: (12.0, 13.5),  # Wednesday: 12.0-13.5
    4: (13.5, 15.0),  # Thursday: 13.5-15.0
    5: (10.5, 12.0),  # Friday: 10.5-12.0
    6: (9.0, 10.5),   # Saturday: 9.0-10.5
}


def calculate_tithi(sun_longitude: float, moon_longitude: float) -> dict:
    """Calculate Tithi (lunar day) from Sun and Moon longitudes."""
    # Tithi is based on the angular distance between Moon and Sun
    moon_sun_diff = (moon_longitude - sun_longitude) % 360
    tithi = int(moon_sun_diff / 12) + 1
    if tithi > 30:
        tithi = 30

    # Determine if Shukla (waxing) or Krishna (waning)
    if tithi <= 15:
        paksha = "Shukla"
        paksha_hi = "शुक्ल"
    else:
        paksha = "Krishna"
        paksha_hi = "कृष्ण"
        tithi = tithi - 15

    tithi_name = TITHI_NAMES.get(tithi, {"en": "Unknown", "hi": "अज्ञात"})

    return {
        "tithi_number": tithi,
        "tithi_name": tithi_name["en"],
        "tithi_name_hi": tithi_name["hi"],
        "paksha": paksha,
        "paksha_hi": paksha_hi,
    }


def calculate_nakshatra(moon_longitude: float) -> dict:
    """Calculate Nakshatra from Moon longitude."""
    nakshatra_span = 360 / 27
    nakshatra_index = int(moon_longitude / nakshatra_span)
    if nakshatra_index >= 27:
        nakshatra_index = 26

    # Calculate pada (quarter)
    pada_span = nakshatra_span / 4
    pada = int((moon_longitude % nakshatra_span) / pada_span) + 1
    if pada > 4:
        pada = 4

    return {
        "nakshatra_name": NAKSHATRA_NAMES[nakshatra_index],
        "nakshatra_index": nakshatra_index,
        "pada": pada,
    }


def calculate_yoga(sun_longitude: float, moon_longitude: float) -> dict:
    """Calculate Yoga from Sun and Moon longitudes."""
    # Yoga is based on the sum of Sun and Moon longitudes
    total = (sun_longitude + moon_longitude) % 360
    yoga_index = int(total / (360 / 27))
    if yoga_index >= 27:
        yoga_index = 26

    return {
        "yoga_name": YOGA_NAMES[yoga_index],
        "yoga_index": yoga_index,
    }


def calculate_karana(sun_longitude: float, moon_longitude: float) -> dict:
    """Calculate Karana from Sun and Moon longitudes."""
    # Karana is half of Tithi
    moon_sun_diff = (moon_longitude - sun_longitude) % 360
    karana = int(moon_sun_diff / 6) + 1
    if karana > 60:
        karana = 60

    # First 7 are fixed, rest repeat
    if karana <= 7:
        karana_name = KARANA_NAMES[karana - 1]
    else:
        # Repetitive karanas
        repetitive = [KARANA_NAMES[i] for i in range(7, 11)]
        karana_index = (karana - 8) % 4
        karana_name = repetitive[karana_index]

    return {
        "karana_name": karana_name,
        "karana_number": karana,
    }


def calculate_vara(date: datetime) -> dict:
    """Calculate Vara (day of week)."""
    day_of_week = date.weekday()  # 0=Monday in Python
    # Convert to Vedic (0=Sunday)
    vedic_day = (day_of_week + 1) % 7

    vara = VARA_NAMES[vedic_day]
    return {
        "vara_name": vara["en"],
        "vara_name_hi": vara["hi"],
        "vara_lord": vara["lord"],
    }


def calculate_rahu_kaal(sunrise_hour: float, sunset_hour: float, day_of_week: int) -> dict:
    """Calculate Rahu Kaal for the day."""
    base_start, base_end = RAHU_KAAL_BASE.get(day_of_week, (4.5, 6.0))

    # Scale to actual day length
    day_length = sunset_hour - sunrise_hour
    standard_day = 12.0  # Standard 12-hour day

    scaled_start = sunrise_hour + (base_start - 4.5) * (day_length / standard_day)
    scaled_end = sunrise_hour + (base_end - 4.5) * (day_length / standard_day)

    start_hours = int(scaled_start)
    start_minutes = int((scaled_start - start_hours) * 60)
    end_hours = int(scaled_end)
    end_minutes = int((scaled_end - end_hours) * 60)

    return {
        "start": f"{start_hours:02d}:{start_minutes:02d}",
        "end": f"{end_hours:02d}:{end_minutes:02d}",
        "start_decimal": scaled_start,
        "end_decimal": scaled_end,
    }


def calculate_gulika_kaal(sunrise_hour: float, sunset_hour: float, day_of_week: int) -> dict:
    """Calculate Gulika Kaal for the day."""
    # Gulika Kaal is approximately 1/8 of the day
    day_length = sunset_hour - sunrise_hour
    gulika_duration = day_length / 8

    # Gulika starts at the end of the day for each weekday
    gulika_start = sunset_hour - gulika_duration

    start_hours = int(gulika_start)
    start_minutes = int((gulika_start - start_hours) * 60)
    end_hours = int(sunset_hour)
    end_minutes = int((sunset_hour - end_hours) * 60)

    return {
        "start": f"{start_hours:02d}:{start_minutes:02d}",
        "end": f"{end_hours:02d}:{end_minutes:02d}",
        "duration_minutes": int(gulika_duration * 60),
    }


def get_panchang(sun_longitude: float, moon_longitude: float,
                 date: datetime, sunrise_hour: float = 6.0,
                 sunset_hour: float = 18.0) -> dict:
    """Get complete Panchang for a given date and location."""
    tithi = calculate_tithi(sun_longitude, moon_longitude)
    nakshatra = calculate_nakshatra(moon_longitude)
    yoga = calculate_yoga(sun_longitude, moon_longitude)
    karana = calculate_karana(sun_longitude, moon_longitude)
    vara = calculate_vara(date)

    day_of_week = date.weekday()
    rahu_kaal = calculate_rahu_kaal(sunrise_hour, sunset_hour, (day_of_week + 1) % 7)
    gulika_kaal = calculate_gulika_kaal(sunrise_hour, sunset_hour, (day_of_week + 1) % 7)

    return {
        "date": date.strftime("%Y-%m-%d"),
        "tithi": tithi,
        "nakshatra": nakshatra,
        "yoga": yoga,
        "karana": karana,
        "vara": vara,
        "rahu_kaal": rahu_kaal,
        "gulika_kaal": gulika_kaal,
        "sunrise": f"{int(sunrise_hour):02d}:{int((sunrise_hour % 1) * 60):02d}",
        "sunset": f"{int(sunset_hour):02d}:{int((sunset_hour % 1) * 60):02d}",
    }
