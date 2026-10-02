"""Classical natal Yogas detection (AstroSage parity set + AstroTalk extension).

All detectors are pure functions of signs/houses/lords from the Rasi chart:
Gaja Kesari, 5 Panch Mahapurusha, Budha-Aditya, Chandra-Mangala,
Neecha-Bhanga, Parashari, Dhana, Vipareeta, Voshi/Anapha/Ubhayachari,
Nabhasa subset, Sunapha/Durudhara/Adhi/Vasumathi.
"""

KENDRA = [1, 4, 7, 10]
TRIKONA = [1, 5, 9]

SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun", 5: "Mercury",
    6: "Venus", 7: "Mars", 8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter",
}

EXALTED = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3,
           "Venus": 11, "Saturn": 6}
DEBILITATED = {"Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9,
               "Venus": 5, "Saturn": 0}

BENEFICS = ["Jupiter", "Venus", "Mercury", "Moon"]


def _house_of(planets_by_name, name, asc_sign):
    p = planets_by_name.get(name)
    if not p or p.get("sign") is None or asc_sign is None:
        return None
    return (p["sign"] - asc_sign) % 12 + 1


def detect_yogas(planets: list, asc_sign: int, moon_sign: int) -> list:
    """Detect classical yogas. Returns [{name, description, strength}]."""
    by_name = {p.get("planet"): p for p in planets}
    yogas = []

    def add(name, description, strength="Strong"):
        yogas.append({"name": name, "description": description, "strength": strength})

    houses = {n: _house_of(by_name, n, asc_sign) for n in
              ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]}
    moon_houses = {}
    for n in ["Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        p = by_name.get(n)
        if p and p.get("sign") is not None and moon_sign is not None:
            moon_houses[n] = (p["sign"] - moon_sign) % 12 + 1

    def sign_of(n):
        p = by_name.get(n)
        return p.get("sign") if p else None

    def dignity(n):
        p = by_name.get(n, {})
        if p.get("sign") is None:
            return None
        s = p["sign"]
        if EXALTED.get(n) == s:
            return "exalted"
        if DEBILITATED.get(n) == s:
            return "debilitated"
        if SIGN_LORDS.get(s) == n:
            return "own"
        return "neutral"

    # Gaja Kesari: Jupiter in kendra from Moon
    jup_moon = (by_name.get("Jupiter", {}).get("sign", -99) - moon_sign) % 12 + 1 \
        if moon_sign is not None and by_name.get("Jupiter", {}).get("sign") is not None else None
    if jup_moon in KENDRA:
        add("Gaja Kesari Yoga",
            "Jupiter in a kendra from the Moon — intelligence, longevity, lasting fame.")

    # Panch Mahapurusha: Mars/Mercury/Jupiter/Venus/Saturn own/exalted in kendra from Lagna
    maha = [("Mars", "Ruchaka"), ("Mercury", "Bhadra"), ("Jupiter", "Hamsa"),
            ("Venus", "Malavya"), ("Saturn", "Shasha")]
    for planet, yoga in maha:
        if houses.get(planet) in KENDRA and dignity(planet) in ("own", "exalted"):
            add(f"{yoga} Mahapurusha Yoga",
                f"{planet} strong in kendra — leadership and distinction in its significations.")

    # Budha-Aditya: Sun + Mercury same sign
    if sign_of("Sun") is not None and sign_of("Sun") == sign_of("Mercury"):
        add("Budha-Aditya Yoga", "Sun conjunct Mercury — intellect, skill, and administrative ability.")

    # Chandra-Mangala: Moon + Mars same sign
    if sign_of("Moon") is not None and sign_of("Moon") == sign_of("Mars"):
        add("Chandra-Mangala Yoga", "Moon conjunct Mars — wealth through enterprise, fluctuating fortunes.")

    # Neecha-Bhanga: debilitated planet whose dispositor/exaltation lord is in kendra from Lagna or Moon
    for planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if dignity(planet) == "debilitated" and sign_of(planet) is not None:
            deb_sign = sign_of(planet)
            ex_lord = next((k for k, v in EXALTED.items() if v == deb_sign), None)
            disp_lord = SIGN_LORDS.get(deb_sign)
            for lord in {ex_lord, disp_lord} - {None}:
                lh = _house_of(by_name, lord, asc_sign)
                mh = None
                if moon_sign is not None and sign_of(lord) is not None:
                    mh = (sign_of(lord) - moon_sign) % 12 + 1
                if (lh in KENDRA) or (mh in KENDRA):
                    add("Neecha-Bhanga Raja Yoga",
                        f"Debilitation of {planet} cancelled by {lord} in kendra — rise after setbacks.")
                    break

    # Parashari: kendra lord + trikona lord sambandha (conjunction, same sign)
    kendra_lords = {SIGN_LORDS.get((asc_sign + h - 1) % 12) for h in KENDRA} if asc_sign is not None else set()
    trikona_lords = {SIGN_LORDS.get((asc_sign + h - 1) % 12) for h in TRIKONA} if asc_sign is not None else set()
    for k in kendra_lords:
        for t in trikona_lords:
            if k and t and k != t and sign_of(k) is not None and sign_of(k) == sign_of(t):
                add("Parashari Raja Yoga",
                    f"Kendra lord {k} conjoined trikona lord {t} — status and fortune.")
                break
        else:
            continue
        break

    # Dhana: lords of 1, 2, 5, 9, 11 connected (conjunction pairs)
    if asc_sign is not None:
        wealth_houses = [1, 2, 5, 9, 11]
        wealth_lords = [SIGN_LORDS.get((asc_sign + h - 1) % 12) for h in wealth_houses]
        seen_pairs = set()
        for i in range(len(wealth_lords)):
            for j in range(i + 1, len(wealth_lords)):
                a, b = wealth_lords[i], wealth_lords[j]
                if a and b and a != b and sign_of(a) is not None and sign_of(a) == sign_of(b):
                    key = tuple(sorted([a, b]))
                    if key not in seen_pairs:
                        seen_pairs.add(key)
                        add("Dhana Yoga",
                            f"Wealth lords {a} and {b} connected — accumulation of assets.")

    # Vipareeta: 6th/8th/12th lords in 6/8/12 houses
    if asc_sign is not None:
        dusthana_lords = {SIGN_LORDS.get((asc_sign + h - 1) % 12) for h in [6, 8, 12]}
        for lord in dusthana_lords:
            if lord and _house_of(by_name, lord, asc_sign) in [6, 8, 12]:
                add("Vipareeta Raja Yoga",
                    f"Lord {lord} placed in dusthana — success through adversity.")
                break

    # Voshi (planets except Sun in 12th from Sun), Anapha (2nd from Sun), Ubhayachari (both)
    sun_sign = sign_of("Sun")
    if sun_sign is not None:
        in_2nd = [n for n in ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
                  if sign_of(n) is not None and (sign_of(n) - sun_sign) % 12 == 1]
        in_12th = [n for n in ["Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
                   if sign_of(n) is not None and (sign_of(n) - sun_sign) % 12 == 11]
        # Exclude combust-adjacent luminaries-only noise: require non-Sun planets
        if in_2nd and in_12th:
            add("Ubhayachari Yoga", "Planets flanking the Sun — balanced rise, royal bearing.")
        elif in_2nd:
            add("Anapha Yoga", "Planets in 2nd from Sun — wealth, eloquence, self-earned status.")
        elif in_12th:
            add("Voshi Yoga", "Planets in 12th from Sun — charitable nature, behind-the-scenes strength.")

    # Sunapha (planets except Sun in 2nd from Moon), Durudhara (both sides), Kemadruma (none)
    if moon_sign is not None:
        m2 = [n for n in ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
              if sign_of(n) is not None and (sign_of(n) - moon_sign) % 12 == 1]
        m12 = [n for n in ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
               if sign_of(n) is not None and (sign_of(n) - moon_sign) % 12 == 11]
        if m2 and m12:
            add("Durudhara Yoga", "Planets on both sides of the Moon — enduring prosperity.")
        elif m2:
            add("Sunapha Yoga", "Planets in 2nd from Moon — self-made wealth and initiative.")
        elif not m2 and not m12:
            add("Kemadruma Yoga", "No planets flanking the Moon — struggle, relieved by benefic aspect or strong Moon.",
                strength="Challenging")

    # Adhi: benefics in 6th/7th/8th from Moon
    if moon_sign is not None:
        adhi = [n for n in ["Jupiter", "Venus", "Mercury"]
                if sign_of(n) is not None and (sign_of(n) - moon_sign) % 12 in [5, 6, 7]]
        if adhi:
            add("Adhi Yoga", f"Benefics ({', '.join(adhi)}) in 6/7/8 from Moon — command and scholarship.")

    # Vasumathi: benefics in 3rd/6th/10th/11th from Lagna or Moon
    for _ref, ref_sign, ref_name in (("lagna", asc_sign, "Lagna"), ("moon", moon_sign, "Moon")):
        if ref_sign is None:
            continue
        vasu = [n for n in BENEFICS
                if sign_of(n) is not None and (sign_of(n) - ref_sign) % 12 + 1 in [3, 6, 10, 11]]
        if len(vasu) >= 2:
            add("Vasumathi Yoga", f"Benefics in upachaya houses from {ref_name} — steady accumulation.")
            break

    # Nabhasa Akriti subset: Rajju (all kendras movable), Musala (fixed), Nala (dual)
    if asc_sign is not None:
        kendra_signs = [(asc_sign + h - 1) % 12 for h in KENDRA]
        occupied = {s for s in kendra_signs
                    if any(sign_of(n) == s for n in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"])}
        if len(occupied) >= 3:
            movable = all(s % 3 == 0 for s in occupied)
            fixed = all(s % 3 == 1 for s in occupied)
            dual = all(s % 3 == 2 for s in occupied)
            if movable:
                add("Rajju Nabhasa Yoga", "Planets in movable kendras — ambition and travel.")
            elif fixed:
                add("Musala Nabhasa Yoga", "Planets in fixed kendras — stability and honour.")
            elif dual:
                add("Nala Nabhasa Yoga", "Planets in dual kendras — versatility and mediation.")

    return yogas
