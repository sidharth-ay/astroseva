"""Structured career analysis framework (AstroTalk-style factors, deterministic).

Factors: 2nd (income), 6th (daily work), 10th (status), 11th (gains) houses
+ Saturn (discipline), Jupiter (growth), Mercury (commerce), Sun/Moon/Venus
strength + current dasha lord timing.
"""

SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}


def analyze_career_factors(planets: list, asc_sign: int, dasha_lord: str | None = None) -> dict:
    """Deterministic career factor analysis from chart + dasha lord."""
    by_name = {p.get("planet"): p for p in planets}

    def house_of(name: str) -> int | None:
        p = by_name.get(name)
        h = p.get("house") if p else None
        return h if isinstance(h, int) and h != 0 else None

    def sign_of(name: str) -> int | None:
        p = by_name.get(name)
        s = p.get("sign") if p else None
        return s if isinstance(s, int) else None

    def dignity_of(name: str) -> str:
        return (by_name.get(name) or {}).get("dignity", "Neutral")

    houses = {n: house_of(n) for n in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]}
    tenth_lord = SIGN_LORDS.get((asc_sign + 9) % 12)
    factors = []

    # 10th house occupancy (status/career)
    tenth_occupants = [n for n, h in houses.items() if h == 10]
    if tenth_occupants:
        factors.append(f"10th house (career/status) occupied by {', '.join(tenth_occupants)} — active professional visibility.")
    else:
        factors.append(f"10th house empty — career runs through its lord {tenth_lord}.")

    # 10th lord strength
    if tenth_lord:
        factors.append(f"10th lord {tenth_lord} is {dignity_of(tenth_lord).lower()} — {'strong career foundation' if dignity_of(tenth_lord) in ('Exalted', 'Own Sign', 'Moolatrikona') else 'steady progress through effort'}.")

    # Saturn (discipline/service), Jupiter (growth), Mercury (commerce)
    for planet, role in [("Saturn", "discipline and service"), ("Jupiter", "growth and wisdom"), ("Mercury", "commerce and intellect")]:
        h = houses.get(planet)
        if h in [6, 10, 11]:
            factors.append(f"{planet} in {h}th house supports {role} in professional life.")
        elif h:
            factors.append(f"{planet} in {h}th house shapes {role} indirectly.")

    # 2nd (income) and 11th (gains)
    second = [n for n, h in houses.items() if h == 2]
    eleventh = [n for n, h in houses.items() if h == 11]
    if second:
        factors.append(f"2nd house (income) holds {', '.join(second)} — earnings tied to these planetary themes.")
    if eleventh:
        factors.append(f"11th house (gains) holds {', '.join(eleventh)} — fulfilment of ambitions supported.")

    # Dasha timing
    verdict = "Steady phase — consolidate skills and deliver consistently."
    if dasha_lord:
        if dasha_lord in ["Jupiter", "Venus", "Mercury", "Moon"]:
            verdict = f"{dasha_lord} period favours growth — good time for promotion, switch, or expansion."
        elif dasha_lord in ["Saturn", "Mars", "Sun"]:
            verdict = f"{dasha_lord} period rewards discipline — push through workload, avoid conflicts with authority."
        elif dasha_lord in ["Rahu", "Ketu"]:
            verdict = f"{dasha_lord} period brings unconventional turns — stay adaptable, verify offers carefully."
        factors.append(f"Current dasha lord: {dasha_lord}.")

    # Private vs government lean (sign-based heuristic)
    sun_house = houses.get("Sun")
    lean = "government/public-sector roles" if sun_house in [1, 10, 11] else "private-sector initiative"
    factors.append(f"Sun placement favours {lean}.")

    return {
        "tenth_lord": tenth_lord,
        "factors": factors,
        "verdict": verdict,
    }
