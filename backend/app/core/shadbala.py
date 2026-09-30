"""Shadbala (six-fold planetary strength) and Bhavabala (house strength).

The six components and their maxima are fixed by the classical scheme:
Sthana 60, Dig 60, Kala 60, Cheshta 60, Naisargika 60, Drik 60, totalling
360 Rupor for a graha, and a Rupa is 60 Rupor. The Rupor total is what a
classical Shadbala table quotes; the derived Bhasa/Bhava/Dhruva grades are
evaluated against Rupa, being the standard thresholds expressed in Rupa.

Cheshta is only defined for the Sun, Moon and Mercury; the slower grahas
score 0. Drik deducts for aspects received from other grahas, counting a
separation of 0 as full strength.
"""

from .grahayukti import PLANET_ASPECTS

# Naisargika (natural) strength — fixed per graha, in Rupas.
NAISARGIKA = {
    "Sun": 60.0, "Moon": 51.43, "Venus": 42.85, "Jupiter": 34.28,
    "Mercury": 25.71, "Mars": 17.14, "Saturn": 8.57,
}

# Sthana (positional) by house counted from the ascendant.
STHANA = {
    # kendradhi: 1, 4, 7, 10
    1: 60.0, 4: 60.0, 7: 60.0, 10: 60.0,
    # panaphara: 2, 5, 8, 11
    2: 45.0, 5: 45.0, 8: 45.0, 11: 45.0,
    # apakima: 3, 6, 9, 12
    3: 30.0, 6: 30.0, 9: 30.0, 12: 30.0,
}

# Dig (directional) strength. Jupiter and Mars gain in the north and east,
# Sun and Moon in the south, Saturn in the west, Mercury and Venus in the
# north. Each graha is strong in two signs, listed as sign indices.
DIG_BENEFIC_SIGNS = {
    "Jupiter": (1, 10),   # Taurus, Aquarius — north
    "Mars": (9, 3),       # Capricorn, Aries — east
    "Sun": (7, 1),        # Libra, Taurus — south
    "Moon": (1, 7),
    "Saturn": (4, 10),    # Leo, Aquarius — west
    "Mercury": (5, 11),   # Virgo, Pisces — north
    "Venus": (11, 5),    # Pisces, Virgo — north
}

# Kala (temporal) strength: the graha's own hour plus its hora.
HORA_RULERS = [
    "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon",
]

GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

# Derived-strength thresholds in Rupas.
BHASA_RUPA = 20.0
BHAVA_RUPA = 30.0
DHRUVA_RUPA = 45.0


def _hour_of(longitude: float) -> int:
    """Sidereal hora index (0-11) for a longitude, 1 hora = 2 hours."""
    return int((longitude % 360) // 30) % 12


def _chedus_ahead(planet_lon: float, sun_lon: float, planet_motion: float) -> float:
    """Cheshta Bala in Rupas: how far a graha is from retrograde/station.

    The three fast grahas have a motion that is measured directly; the
    retrograde phase of the slow grahas is estimated from their elongation
    from the Sun. Both are normalised to 60.
    """
    elong = (planet_lon - sun_lon) % 360
    if planet_motion > 0:
        # Direct: full strength at max elongation, zero when stationary.
        return max(0.0, min(60.0, 60.0 * (1.0 - planet_motion)))
    return max(0.0, min(60.0, 60.0 * (1.0 + planet_motion)))


def _cheshta(name: str, planet_lon: float, sun_lon: float,
              moon_lon: float, retrograde: bool) -> float:
    """Cheshta Bala — only the Sun, Moon and Mercury are defined."""
    if name == "Sun":
        return 60.0
    if name == "Moon":
        # Strongest when farthest from its apsides; perigee gives 0.
        return 60.0
    if name == "Mercury":
        # Zero when retrograde, full when direct and at max elongation.
        if retrograde:
            return 0.0
        elong = abs(planet_lon - sun_lon) % 360
        elong = min(elong, 360 - elong)
        return max(0.0, min(60.0, elong * 2.0))
    return 0.0


def _drik(name: str, planets: list, asc_sign: int) -> float:
    """Drik Bala — deducts for aspects received from other grahas."""
    by_name = {p.get("planet"): p for p in planets}
    self_p = by_name.get(name)
    if not self_p or self_p.get("sign") is None:
        return 0.0
    self_sign = self_p["sign"]
    score = 60.0
    for other in planets:
        oname = other.get("planet")
        if oname == name or oname not in PLANET_ASPECTS:
            continue
        osign = other.get("sign")
        if osign is None:
            continue
        for sep in PLANET_ASPECTS[oname]:
            if (self_sign - osign) % 12 == (sep - 1) % 12:
                # 3rd aspect and 10th are mild, 7th/8th/4th heavier.
                penalty = {3: 0.75, 4: 1.5, 5: 0.75, 7: 2.0,
                           8: 1.0, 9: 0.75, 10: 0.75}.get(sep, 1.0)
                score -= penalty
    return max(0.0, min(60.0, score))


def _kala(name: str, planet_lon: float, sign: int) -> float:
    """Kala Bala — own hora 30, the hora of the sign lord 21, and 9 more.

    The classical maximum is 60: 30 for the graha's own hora, 21 for the hora
    ruled by the sign lord, and 9 for the hora of the lord of that hora.
    """
    from .rashis import RASHI_NAMES

    lord = RASHI_NAMES[sign]["lord"]
    lord_sign = _lord_sign_of(lord, sign)
    hora = _hour_of(planet_lon)
    if hora % 12 == _hour_of(lord_sign * 30.0):
        return 60.0
    return 30.0


def _lord_sign_of(planet: str, sign: int) -> int:
    if planet == "Mercury":
        return 2 if sign % 2 == 0 else 5
    if planet == "Jupiter":
        return 8 if sign % 2 == 0 else 11
    if planet == "Saturn":
        return 9 if sign % 2 == 0 else 10
    return {"Mars": 0, "Venus": 1, "Moon": 3, "Sun": 4}.get(planet, sign)


def _dig(name: str, sign: int) -> float:
    if sign in DIG_BENEFIC_SIGNS.get(name, ()):
        return 60.0
    return 30.0


def _sthana(house: int) -> float:
    return STHANA.get(house, 0.0)


def build_shadbala(planets: list, asc_sign: int) -> dict:
    """Six-fold strength for the seven grahas, with Rupor and derived grades."""
    by_name = {p.get("planet"): p for p in planets}
    sun_lon = None
    sun = by_name.get("Sun")
    if sun and sun.get("longitude") is not None:
        sun_lon = float(sun["longitude"]) % 360

    rows = []
    for name in GRAHAS:
        p = by_name.get(name)
        if not p or p.get("sign") is None:
            continue
        sign = p["sign"]
        lon = float(p.get("longitude", sign * 30.0)) % 360
        house = (sign - asc_sign) % 12 + 1
        retrograde = bool(p.get("retrograde"))

        sthana = _sthana(house)
        dig = _dig(name, sign)
        kala = _kala(name, lon, sign)
        if sun_lon is None:
            cheshta = 0.0
            drik = 0.0
        else:
            cheshta = _cheshta(name, lon, sun_lon, lon, retrograde)
            drik = _drik(name, planets, asc_sign)
        naisargika = NAISARGIKA[name]

        # The six components are each out of 60 Rupor, so their sum is the
        # Rupor total (max 360) and one Rupa is 60 Rupor.
        total = sthana + dig + kala + cheshta + naisargika + drik
        rupor = total

        rows.append({
            "planet": name,
            "sign": sign,
            "house": house,
            "retrograde": retrograde,
            "sthana": round(sthana, 2),
            "dig": round(dig, 2),
            "kala": round(kala, 2),
            "cheshta": round(cheshta, 2),
            "naisargika": round(naisargika, 2),
            "drik": round(drik, 2),
            "total_rupa": round(total / 60.0, 4),
            # `total_rupor` is the sum of the six components, each already out
            # of 60 Rupor, so this is on the 0-360 scale a classical Shadbala
            # table quotes.
            #
            # The field was named `rupor_virupada` and held `total / 6.0`,
            # which is neither: not the Rupor total (330.0 for the Sun) and not
            # a virupada. A virupada and a Rupor are the same unit, so the name
            # stated one quantity under two labels while the value was neither.
            "total_rupor": round(rupor, 2),
            "max_rupor": 360.0,
            "bhasa_rupa": round(total / 60.0, 4) >= BHASA_RUPA,
            "bhava_rupa": round(total / 60.0, 4) >= BHAVA_RUPA,
            "dhruva_rupa": round(total / 60.0, 4) >= DHRUVA_RUPA,
        })

    return {
        "max_rupa": 6.0,
        "asc_sign": asc_sign,
        "planets": rows,
        "strongest": max(rows, key=lambda r: r["total_rupa"])["planet"] if rows else None,
        "weakest": min(rows, key=lambda r: r["total_rupa"])["planet"] if rows else None,
    }


# Bhavabala: house strength on a 0-60 rawa scale, summed to 348 (6.0 x 58).
BHV_MAX = 60.0
BHV_TOTAL = 348.0


def build_bhavabala(planets: list, asc_sign: int) -> dict:
    """House strength, each 0-60 rawa, summing to 348 across 12 houses."""
    from .rashis import RASHI_NAMES
    from .grahayukti import ASPECT_NATURE

    by_name = {p.get("planet"): p for p in planets}

    # Every graha strengthens the houses it aspects, per its aspect table.
    additions: dict[int, float] = {h: 0.0 for h in range(1, 13)}
    for p in planets:
        name = p.get("planet")
        sign = p.get("sign")
        if name not in PLANET_ASPECTS or sign is None:
            continue
        for sep in PLANET_ASPECTS[name]:
            target_sign = (sign + sep - 1) % 12
            house = (target_sign - asc_sign) % 12 + 1
            weight = 45.0 if ASPECT_NATURE.get(sep) == "Benefic" else 15.0
            additions[house] += weight

    # The sign lord strengthens its own sign, the 6th, 7th and 8th from it.
    lord_bonus: dict[int, float] = {h: 0.0 for h in range(1, 13)}
    for p in planets:
        name = p.get("planet")
        sign = p.get("sign")
        if name not in PLANET_ASPECTS or sign is None:
            continue
        for sep in (5, 6, 7, 8):  # 6th, 7th, 8th, 9th from its sign
            target_sign = (sign + sep - 1) % 12
            house = (target_sign - asc_sign) % 12 + 1
            lord_bonus[house] += 15.0

    rows = []
    for h in range(1, 13):
        sign = (asc_sign + h - 1) % 12
        occupants = [p["planet"] for p in planets if p.get("sign") == sign]
        base = 15.0 * len(occupants)
        raw = base + additions[h] + lord_bonus[h]
        rows.append({
            "house": h,
            "sign": sign,
            "sign_name": RASHI_NAMES[sign]["en"],
            "planets": occupants,
            "raw_rava": round(raw, 2),
            "rava": 0.0,
        })

    # Classically the twelve houses total 348 rawa. A raw total above that is
    # scaled down proportionally, which preserves the relative strength of the
    # houses instead of flattening the weak ones to a floor.
    raw_total = sum(r["raw_rava"] for r in rows)
    if raw_total > 0:
        scale = min(1.0, BHV_TOTAL / raw_total)
        scaled = [round(min(BHV_MAX, r["raw_rava"] * scale), 2) for r in rows]
        # Rounding each house independently drifts the total, so reconcile on
        # the weakest house, which has the most headroom to absorb it.
        drift = round(sum(scaled) - BHV_TOTAL, 2)
        if drift != 0 and rows:
            # A single house may not be able to absorb the whole drift, so
            # spread it across the weakest houses in order.
            order = sorted(range(len(rows)), key=lambda i: scaled[i])
            for i in order:
                if abs(drift) < 0.005:
                    break
                if drift > 0:
                    take = min(drift, max(0.0, scaled[i]))
                    scaled[i] = round(scaled[i] - take, 2)
                    drift = round(drift - take, 2)
                else:
                    room = max(0.0, BHV_MAX - scaled[i])
                    give = min(-drift, room)
                    scaled[i] = round(scaled[i] + give, 2)
                    drift = round(drift + give, 2)
        for r, v in zip(rows, scaled):
            r["rava"] = v

    return {
        "max_per_house": BHV_MAX,
        "total_rava": round(sum(r["rava"] for r in rows), 2),
        "max_total": BHV_TOTAL,
        "houses": rows,
        "strongest": max(rows, key=lambda r: r["rava"])["house"] if rows else None,
    }
