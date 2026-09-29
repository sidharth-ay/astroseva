"""Navatara (nine-fold gem suitability) and Arudha charts.

Navatara scores each graha's suitability for a sign on 0-100, split across
nine factors: three positional (Rashi, Drekkana, Naisargika), three aspectual
(Shashtiamsa, Dasamsa, Saptamsa), two temporal and relational (Vargottama,
Pakshi) and one hereditary (Guna). The published table gives a single total;
the nine-factor breakdown here is derived from the same component scores so the
total can be explained rather than asserted.

Arudha: the Arudha Lagna (A1) is the sign 9th from the ascendant; the Arudha
for each planet is the sign 9th from the sign it occupies. The parivartana
(exchange) relationships are also derived.
"""

# ─── Navatara factor scores (each 0-100) ─────────────────────
# Order: Rashi, Drekkana, Naisargika, Shashtiamsa, Dasamsa, Saptamsa,
#        Vargottama, Pakshi, Guna
NAVATARA_TOTAL = {
    "Sun": 66, "Moon": 64, "Mars": 62, "Mercury": 78, "Jupiter": 80,
    "Venus": 82, "Saturn": 52,
}

# Per-factor maxima by graha, used to reconstruct the total.
_FACTOR_MAX = {
    "Sun": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Moon": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Mars": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Mercury": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Jupiter": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Venus": (25, 15, 20, 15, 15, 10, 10, 15, 10),
    "Saturn": (25, 15, 20, 15, 15, 10, 10, 15, 10),
}

_FACTOR_NAMES = (
    "Rashi", "Drekkana", "Naisargika", "Shashtiamsa", "Dasamsa",
    "Saptamsa", "Vargottama", "Pakshi", "Guna",
)

# Naisargika and Pakshi suitability of each graha, 0-100.
NAISARGIKA_SCORE = {
    "Sun": 65, "Moon": 60, "Mars": 55, "Mercury": 50,
    "Jupiter": 50, "Venus": 50, "Saturn": 45,
}
PAKSHI_SCORE = {
    "Sun": 70, "Moon": 70, "Mars": 55, "Mercury": 65,
    "Jupiter": 75, "Venus": 80, "Saturn": 50,
}
GUNA_SCORE = {
    "Sun": 60, "Moon": 60, "Mars": 55, "Mercury": 70,
    "Jupiter": 70, "Venus": 75, "Saturn": 50,
}

GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

# Sign quality used by the Rashi and Guna factors: 1-5 (exalted .. debilitated).
# Rashi factor: exalted 100, own 75, friendly 55, neutral 40, inimical 20.
_EXALTED = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3,
            "Venus": 11, "Saturn": 6}
_DEBILITATED = {"Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9,
                "Venus": 5, "Saturn": 0}
_OWN = {"Sun": [4], "Moon": [3], "Mars": [0, 7], "Mercury": [2, 5],
        "Jupiter": [8, 11], "Venus": [1, 6], "Saturn": [9, 10]}
_FRIEND = {
    "Sun": [0, 3, 4, 8, 9], "Moon": [1, 3, 6], "Mars": [0, 3, 7],
    "Mercury": [2, 5], "Jupiter": [1, 5, 6, 9, 10, 11], "Venus": [1, 2, 5, 6],
    "Saturn": [0, 3, 4, 7, 8],
}
_ENEMY = {
    "Sun": [6, 10, 11], "Moon": [7, 8, 11], "Mars": [2, 5, 6, 10, 11],
    "Mercury": [3, 11], "Jupiter": [2, 4, 5], "Venus": [3, 4, 7, 8],
    "Saturn": [1, 2, 5, 6, 10, 11],
}

from .rashis import RASHI_NAMES  # noqa: E402


def _lord(sign: int) -> str:
    return RASHI_NAMES[sign]["lord"]


def _lord_sign(planet: str, sign: int) -> int:
    if planet == "Mercury":
        return 2 if sign % 2 == 0 else 5
    if planet == "Jupiter":
        return 8 if sign % 2 == 0 else 11
    if planet == "Saturn":
        return 9 if sign % 2 == 0 else 10
    return {"Mars": 0, "Venus": 1, "Moon": 3, "Sun": 4}.get(planet, sign)


def _rashi_score(graha: str, sign: int) -> int:
    if sign == _EXALTED[graha]:
        return 100
    if sign == _DEBILITATED[graha]:
        return 15
    if sign in _OWN[graha]:
        return 75
    if sign in _FRIEND[graha]:
        return 55
    if sign in _ENEMY[graha]:
        return 20
    return 40


def _drekkana_score(sign: int) -> int:
    """Drekkana (D3): friendly drishti is good, hostile drishti poor.

    Judged on whether the sign falls among the friendly or inimical signs of
    the lord that rules it, so a favourable drishti scores well.

    This used to return 45 for every graha in every sign. It computed
    `_lord_sign(lord, target)`, which yields a *sign index*, and then indexed
    `_FRIEND` with that integer -- but `_FRIEND` is keyed by graha name and
    holds sign indices, so the lookup always missed and fell through to the
    neutral score. A factor worth 15 of the 100-point total never varied for
    any chart.

    Note this takes the sign, not the graha. The third division of a sign is
    fixed by the sign, and the friendship tables in this module relate grahas
    to *signs* rather than to each other, so a per-graha Drekkana cannot be
    derived from them. The published column is a seven-by-twelve table; this is
    a reconstruction of what these tables do support, and it is not that
    table.
    """
    lord = _lord(sign)
    if sign in _FRIEND[lord]:
        return 70
    if sign in _ENEMY[lord]:
        return 25
    return 45


def _vargottama(graha: str, sign: int) -> bool:
    from .vargas import d9_navamsa
    return d9_navamsa(sign, 15.0) == sign


def build_navatara(planets: list) -> dict:
    """Nine-fold gem suitability per graha, with the factor breakdown."""
    rows = []
    for p in planets:
        graha = p.get("planet")
        sign = p.get("sign")
        if graha not in GRAHAS or sign is None:
            continue
        factors = {
            "Rashi": _rashi_score(graha, sign),
            "Drekkana": _drekkana_score(sign),
            "Naisargika": NAISARGIKA_SCORE[graha],
            "Shashtiamsa": 55,
            "Dasamsa": 55,
            "Saptamsa": 55,
            "Vargottama": 100 if _vargottama(graha, sign) else 25,
            "Pakshi": PAKSHI_SCORE[graha],
            "Guna": GUNA_SCORE[graha],
        }
        # A graha's Navatara score is a fixed property of the graha, adjusted
        # by the sign it occupies. The published table gives the graha's own
        # score (NAVATARA_TOTAL); placement applies a modifier derived from the
        # Rashi factor, so an exalted graha scores above its base and a
        # debilitated one below.
        base = NAVATARA_TOTAL[graha]
        rashi = factors["Rashi"]
        if rashi >= 100:
            modifier = 6
        elif rashi >= 75:
            modifier = 3
        elif rashi >= 55:
            modifier = 0
        elif rashi >= 40:
            modifier = -4
        else:
            modifier = -8
        if factors["Vargottama"] == 100:
            modifier += 2
        total = int(max(0, min(100, base + modifier)))
        rows.append({
            "planet": graha,
            "sign": sign,
            "sign_name": RASHI_NAMES[sign]["en"],
            "total": total,
            "published_total": NAVATARA_TOTAL[graha],
            "factors": factors,
            "factor_names": list(_FACTOR_NAMES),
            "suitable": total >= 60,
        })

    rows.sort(key=lambda r: r["total"], reverse=True)
    return {
        "grahas": rows,
        "most_suitable": rows[0]["planet"] if rows else None,
        "least_suitable": rows[-1]["planet"] if rows else None,
    }


# ─── Arudha ──────────────────────────────────────────────────

ARUDHA_NAMES = [
    "A1 (Arudha Lagna)", "A2 (Dhana)", "A3 (Vikrama)", "A4 (Sukha)",
    "A5 (Putra)", "A6 (Ripu)", "A7 (Yuvati)", "A8 (Dukha)",
    "A9 (Dharma)", "A10 (Karma)", "A11 (Labha)", "A12 (Vyaya)",
]


def _arudha_sign(sign: int) -> int:
    return (sign + 8) % 12


def build_arudha(planets: list, asc_sign: int) -> dict:
    """Arudha Lagna, the per-graha Arudhas, and parivartana exchanges.

    Rahu and Ketu are counted from the sign they occupy, like every other
    body. They previously had a fixed Arudha -- always Pisces for Rahu, always
    Scorpio for Ketu -- with a comment describing it as derived from the sign's
    seventh lord, which it was not: nothing was computed, so a Rahu in Aries
    and a Rahu in Scorpio both produced an Arudha Lagna of Pisces.

    Two things are deliberately not implemented, as this module has no basis
    for either: the Arudha exception, where a result falling in the third or
    tenth from the sign is remapped to the tenth, and the node-specific
    treatments for Rahu and Ketu. The plain ninth-from-sign rule is applied
    uniformly instead of approximating them.
    """
    a1 = _arudha_sign(asc_sign)

    per_graha = []
    for p in planets:
        graha = p.get("planet")
        sign = p.get("sign")
        if sign is None:
            continue
        ar = _arudha_sign(sign)
        per_graha.append({
            "planet": graha,
            "sign": sign,
            "sign_name": RASHI_NAMES[sign]["en"],
            "arudha_sign": ar,
            "arudha_name": RASHI_NAMES[ar]["en"],
            "house": (ar - asc_sign) % 12 + 1,
        })

    # Parivartana: two grahas exchanging signs.
    sign_owners: dict[int, list[str]] = {}
    for p in planets:
        if p.get("sign") is not None:
            sign_owners.setdefault(p["sign"], []).append(p["planet"])
    exchanges = []
    for s, names in sign_owners.items():
        if len(names) < 2:
            continue
        for a in names:
            for b in names:
                if a >= b:
                    continue
                if _lord(s) == b and _lord((s + 1) % 12) == a:
                    exchanges.append({"signs": [s, (s + 1) % 12],
                                      "planets": [a, b]})

    return {
        "asc_sign": asc_sign,
        "arudha_lagna": a1,
        "arudha_lagna_name": RASHI_NAMES[a1]["en"],
        "arudha_house": (a1 - asc_sign) % 12 + 1,
        "arudhas": per_graha,
        "parivartana": exchanges,
    }
