"""Vimshottari Dasha (Planetary Periods) calculation.

Implements proper Vimshottari Dasha based on Moon's nakshatra at birth.
"""

from datetime import datetime, timedelta, UTC

# Dasha lords and their durations (total 120 years)
DASHA_SEQUENCE = [
    ("Ketu", 7),
    ("Venus", 20),
    ("Sun", 6),
    ("Moon", 10),
    ("Mars", 7),
    ("Rahu", 18),
    ("Jupiter", 16),
    ("Saturn", 19),
    ("Mercury", 17),
]

# Total Vimshottari years
TOTAL_DASHA_YEARS = 120

# Nakshatra to Dasha lord mapping
NAKSHATRA_DASHA_LORD = {
    0: "Ketu",     # Ashwini
    1: "Venus",    # Bharani
    2: "Sun",      # Krittika
    3: "Moon",     # Rohini
    4: "Mars",     # Mrigashira
    5: "Rahu",     # Ardra
    6: "Jupiter",  # Punarvasu
    7: "Saturn",   # Pushya
    8: "Mercury",  # Ashlesha
    9: "Ketu",     # Magha
    10: "Venus",   # Purva Phalguni
    11: "Sun",     # Uttara Phalguni
    12: "Moon",    # Hasta
    13: "Mars",    # Chitra
    14: "Rahu",    # Swati
    15: "Jupiter", # Vishakha
    16: "Saturn",  # Anuradha
    17: "Mercury", # Jyeshtha
    18: "Ketu",    # Mula
    19: "Venus",   # Purva Ashadha
    20: "Sun",     # Uttara Ashadha
    21: "Moon",    # Shravana
    22: "Mars",    # Dhanishta
    23: "Rahu",    # Shatabhisha
    24: "Jupiter", # Purva Bhadrapada
    25: "Saturn",  # Uttara Bhadrapada
    26: "Mercury", # Revati
}


def get_nakshatra_from_moon_longitude(moon_longitude: float) -> dict:
    """Get nakshatra details from Moon's sidereal longitude.

    Args:
        moon_longitude: Moon's sidereal ecliptic longitude in degrees (0-360)

    Returns:
        Dictionary with nakshatra index, name, lord, and pada.
    """
    nakshatra_span = 360.0 / 27.0  # ~13.333 degrees
    nakshatra_index = int(moon_longitude / nakshatra_span)
    if nakshatra_index >= 27:
        nakshatra_index = 26

    # Calculate pada (quarter)
    pada_span = nakshatra_span / 4.0  # ~3.333 degrees
    moon_in_nakshatra = moon_longitude - (nakshatra_index * nakshatra_span)
    pada = int(moon_in_nakshatra / pada_span) + 1
    if pada > 4:
        pada = 4

    nakshatra_names = [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
        "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
        "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
        "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
        "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
        "Uttara Bhadrapada", "Revati"
    ]

    lord = NAKSHATRA_DASHA_LORD.get(nakshatra_index, "Ketu")

    return {
        "index": nakshatra_index,
        "name": nakshatra_names[nakshatra_index],
        "lord": lord,
        "pada": pada,
    }


def calculate_mahadashas(birth_dt: datetime, moon_longitude: float) -> list:
    """Calculate all Mahadasha periods from birth.

    Args:
        birth_dt: Birth datetime (UTC)
        moon_longitude: Moon's sidereal longitude in degrees

    Returns:
        List of Mahadasha periods with lord, start, end, and duration.
    """
    nakshatra_info = get_nakshatra_from_moon_longitude(moon_longitude)
    birth_nakshatra_lord = nakshatra_info["lord"]

    # Find the starting index in the Dasha sequence
    start_idx = 0
    for i, (lord, _) in enumerate(DASHA_SEQUENCE):
        if lord == birth_nakshatra_lord:
            start_idx = i
            break

    # Calculate remaining portion of first Mahadasha
    nakshatra_span = 360.0 / 27.0
    moon_in_nakshatra = moon_longitude % nakshatra_span
    fraction_remaining = 1.0 - (moon_in_nakshatra / nakshatra_span)

    first_lord, first_duration = DASHA_SEQUENCE[start_idx]
    first_dasha_years = first_duration * fraction_remaining

    # Build all Mahadashas
    dashas = []
    current_date = birth_dt

    # First (partial) Mahadasha
    first_end = current_date + timedelta(days=first_dasha_years * 365.25)
    dashas.append({
        "lord": first_lord,
        "start": current_date,
        "end": first_end,
        "duration_years": round(first_dasha_years, 4),
    })
    current_date = first_end

    # Subsequent full Mahadashas (up to 2 full cycles)
    for cycle in range(2):
        for i in range(len(DASHA_SEQUENCE)):
            lord_idx = (start_idx + 1 + i) % len(DASHA_SEQUENCE)
            lord, duration = DASHA_SEQUENCE[lord_idx]

            # Stop if we've completed one full cycle and reached the starting lord
            if cycle == 0 and lord_idx == start_idx:
                break

            end_date = current_date + timedelta(days=duration * 365.25)
            dashas.append({
                "lord": lord,
                "start": current_date,
                "end": end_date,
                "duration_years": duration,
            })
            current_date = end_date

    return dashas


def calculate_antardashas(mahadasha_start: datetime, mahadasha_end: datetime,
                          mahadasha_lord: str) -> list:
    """Calculate Antardasha (sub-periods) within a Mahadasha.

    The duration of each Antardasha = (Mahadasha lord duration × Sub lord duration) / 120
    """
    # Find the starting Antardasha lord
    start_idx = 0
    for i, (lord, _) in enumerate(DASHA_SEQUENCE):
        if lord == mahadasha_lord:
            start_idx = i
            break

    # Get Mahadasha lord's full duration
    md_duration = dict(DASHA_SEQUENCE)[mahadasha_lord]

    antardashas = []
    current_date = mahadasha_start

    for i in range(9):
        lord_idx = (start_idx + i) % len(DASHA_SEQUENCE)
        lord = DASHA_SEQUENCE[lord_idx][0]
        sub_duration = DASHA_SEQUENCE[lord_idx][1]

        # Duration = (MD lord duration × AD lord duration) / 120 years, in days
        duration_days = (md_duration * sub_duration / TOTAL_DASHA_YEARS) * 365.25

        end_date = current_date + timedelta(days=duration_days)

        antardashas.append({
            "lord": lord,
            "start": current_date,
            "end": end_date,
            "duration_days": round(duration_days, 2),
        })

        current_date = end_date

    return antardashas


def calculate_sub_periods(parent_start: datetime, parent_end: datetime,
                         parent_lord: str) -> list:
    """Generic Vimshottari sub-levels (Sookshma within PD, Prana within Sookshma)."""
    start_idx = 0
    for i, (lord, _) in enumerate(DASHA_SEQUENCE):
        if lord == parent_lord:
            start_idx = i
            break

    parent_years = dict(DASHA_SEQUENCE)[parent_lord]
    total_days = (parent_end - parent_start).total_seconds() / 86400.0

    subs = []
    current_date = parent_start
    for i in range(9):
        lord_idx = (start_idx + i) % len(DASHA_SEQUENCE)
        lord, sub_years = DASHA_SEQUENCE[lord_idx]
        duration_days = total_days * sub_years / parent_years
        end_date = current_date + timedelta(days=duration_days)
        subs.append({
            "lord": lord,
            "start": current_date,
            "end": end_date,
            "duration_days": round(duration_days, 2),
        })
        current_date = end_date
    return subs


def calculate_pratyantardashas(antardasha_start: datetime, antardasha_end: datetime,
                               antardasha_lord: str) -> list:
    """Calculate Pratyantardasha (sub-sub-periods) within an Antardasha."""
    start_idx = 0
    for i, (lord, _) in enumerate(DASHA_SEQUENCE):
        if lord == antardasha_lord:
            start_idx = i
            break

    # Scale sub-periods to the actual window (balance-shortened ADs too).
    window_days = (antardasha_end - antardasha_start).total_seconds() / 86400.0

    pratyardashas = []
    current_date = antardasha_start

    for i in range(9):
        lord_idx = (start_idx + i) % len(DASHA_SEQUENCE)
        lord = DASHA_SEQUENCE[lord_idx][0]
        sub_duration = DASHA_SEQUENCE[lord_idx][1]

        duration_days = window_days * sub_duration / TOTAL_DASHA_YEARS

        end_date = current_date + timedelta(days=duration_days)

        pratyardashas.append({
            "lord": lord,
            "start": current_date,
            "end": end_date,
            "duration_days": round(duration_days, 2),
        })

        current_date = end_date

    return pratyardashas


def get_current_dasha(mahadashas: list, current_date: datetime) -> dict | None:
    """Get the current Mahadasha, Antardasha, and Pratyantardasha for a given date.

    Args:
        mahadashas: List of Mahadasha periods from calculate_mahadashas()
        current_date: The date to check

    Returns:
        Dictionary with current dasha information, or None if not found.
    """
    for dasha in mahadashas:
        if dasha["start"] <= current_date <= dasha["end"]:
            # Found current Mahadasha
            antardashas = calculate_antardashas(
                dasha["start"], dasha["end"], dasha["lord"]
            )

            current_antardasha = None
            for ant in antardashas:
                if ant["start"] <= current_date <= ant["end"]:
                    current_antardasha = ant

                    # Find Pratyantardasha
                    pratyardashas = calculate_pratyantardashas(
                        ant["start"], ant["end"], ant["lord"]
                    )
                    for prat in pratyardashas:
                        if prat["start"] <= current_date <= prat["end"]:
                            current_antardasha["pratyantardasha"] = prat
                            break
                    break

            # Calculate remaining time in current Mahadasha
            md_remaining_days = (dasha["end"] - current_date).total_seconds() / 86400.0
            md_remaining_years = md_remaining_days / 365.25

            result = {
                "mahadasha": dasha["lord"],
                "mahadasha_start": dasha["start"],
                "mahadasha_end": dasha["end"],
                "mahadasha_remaining_years": round(md_remaining_years, 2),
            }

            if current_antardasha:
                ad_remaining_days = (current_antardasha["end"] - current_date).total_seconds() / 86400.0
                result.update({
                    "antardasha": current_antardasha["lord"],
                    "antardasha_start": current_antardasha["start"],
                    "antardasha_end": current_antardasha["end"],
                    "antardasha_remaining_days": round(ad_remaining_days, 1),
                })

                if "pratyantardasha" in current_antardasha:
                    prat = current_antardasha["pratyantardasha"]
                    result.update({
                        "pratyantardasha": prat["lord"],
                        "pratyantardasha_start": prat["start"],
                        "pratyantardasha_end": prat["end"],
                    })

                    # Sookshma (within Pratyantardasha) + Prana (within Sookshma)
                    sookshmas = calculate_sub_periods(prat["start"], prat["end"], prat["lord"])
                    for soo in sookshmas:
                        if soo["start"] <= current_date <= soo["end"]:
                            result.update({
                                "sookshma": soo["lord"],
                                "sookshma_start": soo["start"],
                                "sookshma_end": soo["end"],
                            })
                            pranas = calculate_sub_periods(soo["start"], soo["end"], soo["lord"])
                            for pr in pranas:
                                if pr["start"] <= current_date <= pr["end"]:
                                    result.update({
                                        "prana": pr["lord"],
                                        "prana_start": pr["start"],
                                        "prana_end": pr["end"],
                                    })
                                    break
                            break

            return result

    return None


def get_dasha_for_birth(moon_longitude: float, birth_dt: datetime,
                        current_date: datetime = None) -> dict:
    """Get complete Dasha information for a birth chart.

    Args:
        moon_longitude: Moon's sidereal longitude in degrees
        birth_dt: Birth datetime (UTC)
        current_date: Date to check current dasha (defaults to now)

    Returns:
        Dictionary with all Mahadashas and current dasha info.
    """
    if current_date is None:
        current_date = datetime.now(UTC)

    nakshatra = get_nakshatra_from_moon_longitude(moon_longitude)
    mahadashas = calculate_mahadashas(birth_dt, moon_longitude)
    current = get_current_dasha(mahadashas, current_date)

    return {
        "birth_nakshatra": nakshatra,
        "all_mahadashas": mahadashas,
        "current_dasha": current,
    }


# ---------------------------------------------------------------------------
# Yogini Dasha (36-year cycle, 8 Yoginis, Moon-nakshatra seeded)
# ---------------------------------------------------------------------------

YOGINI_SEQUENCE = [
    ("Mangala", 1, "Moon"),
    ("Pingala", 2, "Sun"),
    ("Dhanya", 3, "Jupiter"),
    ("Bhramari", 4, "Mars"),
    ("Bhadrika", 5, "Mercury"),
    ("Ulka", 6, "Saturn"),
    ("Siddha", 7, "Venus"),
    ("Sankata", 8, "Rahu"),
]
TOTAL_YOGINI_YEARS = 36


def calculate_yogini_dasha(birth_dt: datetime, moon_longitude: float) -> dict:
    """Yogini Mahadasha periods from birth Moon nakshatra (36-year cycle)."""
    nak = get_nakshatra_from_moon_longitude(moon_longitude)
    start_idx = nak["index"] % len(YOGINI_SEQUENCE)

    # Balance of first Yogini by remaining nakshatra arc
    nakshatra_span = 360.0 / 27.0
    traversed = moon_longitude % nakshatra_span
    remaining_frac = 1.0 - traversed / nakshatra_span

    periods = []
    current = birth_dt
    # First (balance) period
    first_name, first_years, _ = YOGINI_SEQUENCE[start_idx]
    first_days = remaining_frac * first_years * 365.25
    periods.append({
        "yogini": first_name,
        "start": current,
        "end": current + timedelta(days=first_days),
        "duration_years": round(first_days / 365.25, 2),
        "balance": True,
    })
    current = periods[0]["end"]

    # Repeat full cycles for ~120 years of coverage
    idx = (start_idx + 1) % len(YOGINI_SEQUENCE)
    while (current - birth_dt).days < 120 * 365.25:
        name, years, _ = YOGINI_SEQUENCE[idx]
        end = current + timedelta(days=years * 365.25)
        periods.append({
            "yogini": name, "start": current, "end": end,
            "duration_years": years, "balance": False,
        })
        current = end
        idx = (idx + 1) % len(YOGINI_SEQUENCE)

    return {
        "birth_nakshatra": nak,
        "periods": periods,
    }


def get_current_yogini(birth_dt: datetime, moon_longitude: float,
                       current_date: datetime = None) -> dict | None:
    """Current Yogini period for a date."""
    if current_date is None:
        current_date = datetime.now(UTC)
    data = calculate_yogini_dasha(birth_dt, moon_longitude)
    for p in data["periods"]:
        if p["start"] <= current_date <= p["end"]:
            return {
                "yogini": p["yogini"],
                "start": p["start"],
                "end": p["end"],
            }
    return None


# ---------------------------------------------------------------------------
# Chara (Jaimini sign) Dasha
# ---------------------------------------------------------------------------

CHARA_SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}


def calculate_chara_dasha(lagna_sign: int) -> list:
    """Jaimini Chara Dasha sequence from Lagna sign.

    Odd-footed signs proceed forward (zodiacal), even-footed in reverse,
    starting at Lagna. Each sign's duration = count from the sign to its
    domicile lord's sign (12 if the lord owns that sign), forward for
    odd-footed signs and backward for even-footed ones.
    Classical Mars/Saturn lordship (no co-lords).
    """
    if lagna_sign % 2 == 0:  # 0-based even = odd signs (Aries, Gemini, ...)
        order = [(lagna_sign + i) % 12 for i in range(12)]
    else:
        order = [(lagna_sign - i) % 12 for i in range(12)]

    # Lord's primary domicile per sign.
    SIGN_LORD_DOMICILE = {
        0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
        6: 6, 7: 0, 8: 8, 9: 9, 10: 9, 11: 8,
    }

    periods = []
    for s in order:
        dom = SIGN_LORD_DOMICILE[s]
        if dom == s:
            years = 12
        elif s % 2 == 0:
            years = (dom - s) % 12 or 12
        else:
            years = (s - dom) % 12 or 12
        periods.append({"sign": s, "lord": CHARA_SIGN_LORDS[s], "duration_years": years})
    return periods


def get_current_chara(lagna_sign: int, birth_dt: datetime,
                      current_date: datetime = None) -> dict | None:
    """Current Chara sign period for a date."""
    if current_date is None:
        current_date = datetime.now(UTC)
    current = birth_dt
    for p in calculate_chara_dasha(lagna_sign):
        end = current + timedelta(days=p["duration_years"] * 365.25)
        if current <= current_date <= end:
            return {"sign": p["sign"], "lord": p["lord"],
                    "start": current, "end": end}
        current = end
    return None
