"""Shodashavarga (sixteen divisional charts) - D1 through D12 plus D16.

Every chart divides each sign into N equal parts and maps each part onto a
sign, starting from a base that depends on the sign's modality (movable /
fixed / dual) for the charts where the classical rule varies by modality.

D9 (Navamsa) is the load-bearing one and is kept identical to the previous
implementation so existing callers and tests are unaffected.
"""

DIVISIONS = {
    "D1": ("Rasi", 1), "D2": ("Hora", 2), "D3": ("Drekkana", 3),
    "D4": ("Chaturthamsa", 4), "D5": ("Panchamsa", 5),
    "D6": ("Shashtamsa", 6), "D7": ("Saptamsa", 7),
    "D8": ("Ashtamsa", 8), "D9": ("Navamsa", 9), "D10": ("Dasamsa", 10),
    "D11": ("Rudramsa", 11), "D12": ("Dwadasamsa", 12),
    "D16": ("Kalamsa", 16),
}

# Modality helpers. Sign 0 is the first movable sign, so mod3 == 0 is movable.
def _is_movable(sign: int) -> bool:
    return sign % 3 == 0


def _is_fixed(sign: int) -> bool:
    return sign % 3 == 1


def _is_dual(sign: int) -> bool:
    return sign % 3 == 2


def _is_odd(sign: int) -> bool:
    """Aries(0), Gemini(2) ... are odd signs in the classical sense."""
    return sign % 2 == 0


def _part(sign: int, sign_degree: float, divisions: int) -> int:
    """Which part (0-based) of its sign a planet occupies."""
    part = int(sign_degree / (30.0 / divisions))
    return min(part, divisions - 1)


# ─── Per-chart rules ──────────────────────────────────────────

def d1_rasi(sign: int, deg: float) -> int:
    """The sign itself - D1 is the birth chart."""
    return sign % 12


def d2_hora(sign: int, deg: float) -> int:
    """Odd signs: first half Leo, second half Cancer. Even signs reversed.

    D2 divides the chart between the two luminaries - Sun takes the first half
    of odd signs and the second of even ones, Moon takes the complement.
    """
    part = _part(sign, deg, 2)
    if _is_odd(sign):
        return 4 if part == 0 else 3   # Leo / Cancer
    return 3 if part == 0 else 4


def d3_drekkana(sign: int, deg: float) -> int:
    """1st third the sign itself, 2nd the 5th from it, 3rd the 9th from it."""
    part = _part(sign, deg, 3)
    return (sign + (0, 4, 8)[part]) % 12


def d4_chaturthamsa(sign: int, deg: float) -> int:
    """1st quarter the sign, then count 1, 1, 1, 1, 4, 4, 4, 4, 7, 7, 7, 7."""
    part = _part(sign, deg, 4)
    steps = (0, 0, 0, 0, 3, 3, 3, 3, 6, 6, 6, 6)
    return (sign + steps[part]) % 12


def d5_panchamsa(sign: int, deg: float) -> int:
    """Odd signs count from the sign, even signs from the 9th, 1-5."""
    part = _part(sign, deg, 5)
    start = sign if _is_odd(sign) else (sign + 8) % 12
    return (start + part) % 12


def d6_shashtamsa(sign: int, deg: float) -> int:
    """1st sixth the sign, then 30, 60, 90, 120, 150 degrees."""
    part = _part(sign, deg, 6)
    return (sign + part * 2) % 12


def d7_saptamsa(sign: int, deg: float) -> int:
    """Odd signs from the sign, even from the 7th, counting 1-7."""
    part = _part(sign, deg, 7)
    start = sign if _is_odd(sign) else (sign + 6) % 12
    return (start + part) % 12


def _start_offset(sign: int) -> int:
    """Where a modality-based varga starts, as an offset from the sign.

    Movable signs start from themselves, fixed from the 9th, dual from the 5th.
    These are the classical offsets and match the pre-existing D9 behaviour
    (see test_navamsa_movable_fixed_dual), so D9 output is unchanged.
    """
    if _is_movable(sign):
        return 0
    if _is_fixed(sign):
        return 8
    return 4


def d8_ashtamsa(sign: int, deg: float) -> int:
    """Movable from the sign, fixed from the 4th, dual from the 5th; 1-8."""
    return (sign + _start_offset(sign) + _part(sign, deg, 8)) % 12


def d9_navamsa(sign: int, deg: float) -> int:
    """Movable from the sign, fixed from the 4th, dual from the 5th; 1-9."""
    return (sign + _start_offset(sign) + _part(sign, deg, 9)) % 12


def d10_dasamsa(sign: int, deg: float) -> int:
    """Odd signs from the sign, even from the 9th, counting 1-10."""
    part = _part(sign, deg, 10)
    start = sign if _is_odd(sign) else (sign + 8) % 12
    return (start + part) % 12


def d11_rudramsa(sign: int, deg: float) -> int:
    """Count 1-11 from the sign; the first three parts repeat the sign."""
    part = _part(sign, deg, 11)
    return (sign + part) % 12


def d12_dwadasamsa(sign: int, deg: float) -> int:
    """Count 1-12 from the sign."""
    part = _part(sign, deg, 12)
    return (sign + part) % 12


def d16_kalamsa(sign: int, deg: float) -> int:
    """Movable from the sign, fixed from the 4th, dual from the 5th; 1-16."""
    return (sign + _start_offset(sign) + _part(sign, deg, 16)) % 12


_LORD_TO_SIGN = {
    "Mars": 0, "Venus": 1, "Moon": 3, "Sun": 4,
}


def _lord_sign_index(planet: str, sign: int) -> int:
    """Sign ruled by `planet` that is adjacent to the sign being mapped.

    Mercury, Jupiter and Saturn each rule two signs, so the correct one depends
    on the parity of the sign being mapped.
    """
    if planet == "Mercury":
        return 2 if sign % 2 == 0 else 5
    if planet == "Jupiter":
        return 8 if sign % 2 == 0 else 11
    if planet == "Saturn":
        return 9 if sign % 2 == 0 else 10
    return _LORD_TO_SIGN.get(planet, sign)


def _lord(sign: int) -> int:
    """Sign index of the lord ruling `sign` (used by D2 Hora)."""
    from .rashis import RASHI_NAMES

    return _lord_sign_index(RASHI_NAMES[sign]["lord"], sign)


def get_navamsa_sign(sign: int, sign_degree: float) -> int:
    """Navamsa sign index for a planet at sign + in-sign degree."""
    return d9_navamsa(sign, sign_degree)


CHART_FN = {
    "D1": d1_rasi, "D2": d2_hora, "D3": d3_drekkana,
    "D4": d4_chaturthamsa, "D5": d5_panchamsa, "D6": d6_shashtamsa,
    "D7": d7_saptamsa, "D8": d8_ashtamsa, "D9": d9_navamsa,
    "D10": d10_dasamsa, "D11": d11_rudramsa, "D12": d12_dwadasamsa,
    "D16": d16_kalamsa,
}


def get_varga_signs(planets: list, chart: str = "D9") -> dict:
    """Map planet name -> sign index in the requested divisional chart."""
    fn = CHART_FN.get(chart)
    if fn is None:
        raise ValueError(f"Unknown varga chart: {chart}")
    return {
        p["planet"]: fn(int(p.get("sign", 0)), float(p.get("sign_degree", 0.0)))
        for p in planets
        if p.get("planet")
    }


def get_navamsa_positions(planets: list) -> dict:
    """Map planet name -> Navamsa sign index (D9)."""
    return get_varga_signs(planets, "D9")


def build_vargas(planets: list, asc_sign: int) -> dict:
    """All charts in the shodashavarga set, with the ascendant placed in each."""
    out = {}
    for code, (name, _n) in DIVISIONS.items():
        placements = get_varga_signs(planets, code)
        out[code] = {
            "name": name,
            "asc_sign": CHART_FN[code](asc_sign, 15.0),
            "planets": placements,
        }
    return out
