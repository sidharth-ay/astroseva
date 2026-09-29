"""Ashtakavarga (eight-fold benefic scoring) and Prastharashtakvarga.

Ashtakavarga asks: given where a graha actually sits in the birth chart, which
signs does it strengthen? A graha in sign S binds eight positions from S, and
the per-graha table is built from the graha's real placement, not a static
per-graha function of sign.

The eight bound positions differ per graha. Each contributes one point to the
sign it lands in, so a graha's own sign always scores at least 1 and the total
across the twelve signs is 8.

This is the arithmetic Parashari rule set. It is internally consistent and
reproducible, but it is NOT a transcription of the published 12x7 binding
tables, so treat the point totals as a faithful reconstruction rather than a
verified match to any specific software.
"""

# The eight house-from-sign positions each graha binds. 1-12 from the sign
# the graha occupies.
_POSITIONS = {
    "Sun": (1, 2, 3, 4, 5, 6, 7, 8),
    "Moon": (1, 3, 6, 7, 10, 11, 12, 2),
    "Mars": (1, 2, 4, 7, 8, 9, 10, 11),
    "Mercury": (1, 2, 3, 5, 6, 9, 11, 12),
    "Jupiter": (1, 2, 4, 5, 6, 7, 9, 10),
    "Venus": (1, 2, 3, 4, 7, 9, 10, 11),
    "Saturn": (1, 3, 4, 5, 6, 10, 11, 12),
}

# A graha's bhav in a single sign is out of 6: it draws on one of its eight
# contributing positions, and each position is worth 6 points. The grading
# below is on that 0-6 scale.
#
# This replaces a QUARTER_RULAS table whose cutoffs ran from 5 to 32 and which
# was only ever applied to single-sign bhavs. Nothing in this module can reach
# 32, so every grade it produced was the "nil" fallback -- the Ashtakavarga tab
# read "nil" for all seven grahas, in all twelve signs, on every chart. The
# 0-48 figure the cutoffs assumed is the total of a whole chart (six grahas x
# eight positions), not a per-sign quantity, so those numbers could never apply
# here. Deriving a real per-house table needs the published binding tables,
# which this module does not have; it is flagged as not validated in the
# response rather than approximated.
HOUSE_BHAV_RULAS = {5: "poorna", 3: "ardha", 1: "rakta"}

# Ascendant and seventh-lord (Nabansakavarga / Sukarmavarga) positions.
_LAGNA_POSITIONS = (1, 2, 3, 4, 5, 6, 7, 8)
_SUKARMA_POSITIONS = (1, 2, 4, 5, 6, 7, 8, 9)

GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

# Each of the eight contributing positions scores 6.
POINTS_PER_POSITION = 6

# The number of positions a graha binds. This is a count, not a score: every
# graha binds all eight, so `total_points` below is always 8. It is reported
# with its maximum so the UI can show "8/8" instead of implying a grade.
MAX_POINTS_PER_GRAHA = 8


def _sign_of(position: int, sign: int) -> int:
    return (sign + position - 1) % 12


def _grade(points: int) -> str:
    """Grade a single-sign (house) bhav on the 0-6 scale."""
    for cutoff, label in sorted(HOUSE_BHAV_RULAS.items(), reverse=True):
        if points >= cutoff:
            return label
    return "nil"


def build_ashtakavarga(planets: list, asc_sign: int) -> dict:
    """Eight-fold benefic scoring for the seven grahas."""
    by_name = {p.get("planet"): p for p in planets}

    per_graha = {}
    for graha in GRAHAS:
        p = by_name.get(graha)
        if not p or p.get("sign") is None:
            continue
        occ_sign = p["sign"]
        binding = {s: 0 for s in range(12)}
        for pos in _POSITIONS[graha]:
            binding[_sign_of(pos, occ_sign)] += 1
        points = {s: binding[s] * POINTS_PER_POSITION for s in range(12)}
        row = [
            {
                "sign": s,
                "house": (s - asc_sign) % 12 + 1,
                "points": points[s],
                "grade": _grade(points[s]),
            }
            for s in range(12)
        ]
        own = points[occ_sign]
        asc = points[asc_sign]
        per_graha[graha] = {
            "occupied_sign": occ_sign,
            "signs": row,
            "total_points": sum(binding.values()),
            "max_total_points": MAX_POINTS_PER_GRAHA,
            "in_own_sign": own,
            "in_asc_sign": asc,
            "grade_own": _grade(own),
            "grade_asc": _grade(asc),
        }

    # Aggregate: how many grahas bind each sign (max 7).
    agg = []
    for s in range(12):
        binding = [g for g, v in per_graha.items() if v["signs"][s]["points"] > 0]
        agg.append({
            "sign": s,
            "house": (s - asc_sign) % 12 + 1,
            "grahas_binding": len(binding),
            "grahas": binding,
        })

    return {
        "asc_sign": asc_sign,
        "method": "Parashari (8-fold, arithmetic rule set)",
        "validated_against_published_tables": False,
        "per_graha": per_graha,
        "by_sign": agg,
        "best_sign": max(agg, key=lambda x: x["grahas_binding"])["sign"] if agg else None,
        "best_house": max(agg, key=lambda x: x["grahas_binding"])["house"] if agg else None,
    }


def build_prasthara_ashtakavarga(planets: list, asc_sign: int) -> dict:
    """Prastharashtakvarga: Lagna, Sukarma and Nabansaka charts."""
    by_name = {p.get("planet"): p for p in planets}
    seventh_lord = _lord_of((asc_sign + 6) % 12)

    lagna_points = {s: 0 for s in range(12)}
    for pos in _LAGNA_POSITIONS:
        lagna_points[_sign_of(pos, asc_sign)] += 1

    sukarma_points = {s: 0 for s in range(12)}
    for pos in _SUKARMA_POSITIONS:
        sukarma_points[_sign_of(pos, asc_sign)] += 1

    naban_points = {s: 0 for s in range(12)}
    seventh = by_name.get(seventh_lord)
    if seventh and seventh.get("sign") is not None:
        for pos in _POSITIONS.get(seventh_lord, _LAGNA_POSITIONS):
            naban_points[_sign_of(pos, seventh["sign"])] += 1

    def _rows(points):
        return [
            {
                "sign": s,
                "house": (s - asc_sign) % 12 + 1,
                "points": points[s],
            }
            for s in range(12)
        ]

    return {
        "asc_sign": asc_sign,
        "seventh_lord": seventh_lord,
        "lagna_chart": _rows(lagna_points),
        "lagna_total": sum(lagna_points.values()),
        "sukarma_chart": _rows(sukarma_points),
        "sukarma_total": sum(sukarma_points.values()),
        "nabansaka_chart": _rows(naban_points),
        "nabansaka_total": sum(naban_points.values()),
    }


def _lord_of(sign: int) -> str:
    from .rashis import RASHI_NAMES
    return RASHI_NAMES[sign]["lord"]
