"""Divisional (Varga) charts — starting with Navamsha (D9)."""


def get_navamsa_sign(sign: int, sign_degree: float) -> int:
    """Navamsha sign index for a planet at sign + in-sign degree.

    Each sign spans nine 3°20' navamshas. Movable signs count from the
    sign itself, fixed signs from the 9th from it, dual signs from the
    5th from it.
    """
    pada = int(sign_degree / (30.0 / 9.0)) % 9
    quality = sign % 3  # 0 movable, 1 fixed, 2 dual
    if quality == 0:
        return (sign + pada) % 12
    if quality == 1:
        return (sign + 8 + pada) % 12
    return (sign + 4 + pada) % 12


def get_navamsa_positions(planets: list) -> dict:
    """Map planet name -> Navamsha sign index for a planet list."""
    return {
        p["planet"]: get_navamsa_sign(int(p.get("sign", 0)), float(p.get("sign_degree", 0.0)))
        for p in planets
        if p.get("planet")
    }
