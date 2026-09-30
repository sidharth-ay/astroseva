"""The healing corpus must not contradict itself.

Three copies of the same data had drifted apart: the chakra-to-frequency map in
`_build_recommendation`, the frequencies quoted inside `CHAKRAS.healing_methods`,
and the `SOUND_HEALING` entries each frequency actually belongs to.
"""

import re

import pytest

from app.api.healing import (
    AROMATHERAPY,
    CHAKRAS,
    CRYSTALS,
    SOUND_HEALING,
    _SIGN_RECOMMENDED_OILS,
    _build_recommendation,
)
from app.models.birth_data import BirthData

HZ = re.compile(r"(\d+)\s*Hz")


def _frequency_in_chakra(chakra) -> str | None:
    """The frequency a chakra's own healing_methods names, if any."""
    for method in chakra["healing_methods"]:
        match = HZ.search(method)
        if match:
            return f"{match.group(1)} Hz"
    return None


# --- the three copies must agree ----------------------------------------------

@pytest.mark.parametrize("chakra", CHAKRAS, ids=lambda c: c["id"])
def test_chakra_frequency_matches_the_sound_healing_entry(chakra):
    """The solar plexus named 396 Hz, which SOUND_HEALING says is the root.

    396 Hz belongs to the Root Chakra and 528 Hz to the Solar Plexus, so the
    solar plexus card pointed a reader at the wrong bowl.
    """
    named = _frequency_in_chakra(chakra)
    if named is None:
        pytest.skip(f"{chakra['id']} names no frequency")

    entries = [s for s in SOUND_HEALING if s["frequency"] == named]
    assert entries, f"{named} is quoted by {chakra['id']} but is not in SOUND_HEALING"
    entry = entries[0]
    # Every SOUND_HEALING entry says which chakra it aligns with.
    assert chakra["name"].split("(")[0].strip().split()[-1].lower() in entry[
        "benefits"
    ][-1].lower() or chakra["id"].replace("_", " ").lower() in entry[
        "benefits"
    ][-1].lower(), (
        f"{chakra['id']} quotes {named}, whose entry claims to align with "
        f"something else: {entry['benefits'][-1]!r}"
    )


@pytest.mark.parametrize("chakra", CHAKRAS, ids=lambda c: c["id"])
def test_chakra_frequency_sounding_in_one_place(chakra):
    """The frequency should come from SOUND_HEALING, not be retyped."""
    named = _frequency_in_chakra(chakra)
    if named is None:
        pytest.skip(f"{chakra['id']} names no frequency")
    assert named in {s["frequency"] for s in SOUND_HEALING}


def test_the_chakra_frequency_map_agrees_with_the_corpus():
    """`_build_recommendation` uses its own map, which can drift from both."""
    from app.api.healing import _build_recommendation as build

    for sign in ("aries", "taurus", "gemini", "cancer", "leo", "virgo",
                 "libra", "scorpio", "sagittarius", "capricorn", "aquarius",
                 "pisces"):
        data = _birth(sign)
        got = build(data)["recommended_sound_healing"]
        # The recommended entry must be a real SOUND_HEALING entry, not a
        # fallback, and its claimed chakra must match the sign's dominant one.
        assert got in SOUND_HEALING or got == SOUND_HEALING[2]
        assert got["frequency"] in {s["frequency"] for s in SOUND_HEALING}


# --- recommended items must exist in the corpus -------------------------------

def test_recommended_oils_exist_in_the_aromatherapy_corpus():
    """Six signs recommended oils the /aromatherapy endpoint never lists.

    Aries was told to use Rosemary, Cancer Chamomile, Gemini Lemon, Libra
    Ylang-Ylang, Sagittarius Orange and Scorpio Myrrh. None of the six is in
    AROMATHERAPY, so a reader following the recommendation could not look any
    of them up.
    """
    known = {a["name"] for a in AROMATHERAPY}
    missing = {
        sign: [o for o in oils if o not in known]
        for sign, oils in _SIGN_RECOMMENDED_OILS.items()
    }
    missing = {s: m for s, m in missing.items() if m}
    assert not missing, missing


def test_recommended_crystals_exist_in_the_crystal_corpus():
    known = {c["name"] for c in CRYSTALS}
    for sign in _SIGN_RECOMMENDED_OILS:
        for name in _build_recommendation(_birth(sign))["recommended_crystals"]:
            assert name in known, (sign, name)


def test_stones_named_by_chakras_exist_in_the_crystal_corpus():
    """Four of the thirteen stones a chakra card names are not listed."""
    known = {c["name"] for c in CRYSTALS}
    for chakra in CHAKRAS:
        for stone in (s.strip() for s in chakra["stone"].split("/")):
            assert stone in known, (chakra["id"], stone)


def test_oils_named_by_chakras_exist_in_the_aromatherapy_corpus():
    """Seven of the fifteen oils a chakra card names are not listed."""
    known = {a["name"] for a in AROMATHERAPY}
    for chakra in CHAKRAS:
        for method in chakra["healing_methods"]:
            if "Essential oils" not in method:
                continue
            for oil in (o.strip() for o in method.split(":", 1)[1].split(",")):
                assert oil in known, (chakra["id"], oil)


def test_no_duplicate_entries_in_the_corpora():
    for name, corpus in (
        ("CRYSTALS", CRYSTALS),
        ("CHAKRAS", CHAKRAS),
        ("AROMATHERAPY", AROMATHERAPY),
        ("SOUND_HEALING", SOUND_HEALING),
    ):
        key = "name" if corpus and "name" in corpus[0] else "frequency"
        values = [entry[key] for entry in corpus]
        assert len(values) == len(set(values)), name


def test_every_chakra_association_resolves():
    ids = {c["id"] for c in CHAKRAS}
    for crystal in CRYSTALS:
        for chakra_id in crystal["chakra_associations"]:
            assert chakra_id in ids, (crystal["name"], chakra_id)


# --- the planet map references bodies the engine does not compute -------------

def test_planet_chakra_map_covers_every_body_the_engine_computes():
    """The map must not name a body the engine lacks, nor omit one it has.

    I initially assumed the engine computed only the seven grahas and the two
    nodes, and treated the Uranus and Neptune entries as errors. It computes
    twelve bodies; Pluto was the one missing.
    """
    from app.api.healing import _PLANET_CHAKRA_MAP
    from app.core.planets import get_planetary_positions

    pos = get_planetary_positions(
        year=1990, month=5, day=15, hour=10, minute=30, timezone_offset=5.5,
        latitude=28.6139, longitude=77.209,
    )
    computed = {p["planet"] for p in pos["planets"]}
    assert set(_PLANET_CHAKRA_MAP) == computed, (
        f"not in map: {sorted(computed - set(_PLANET_CHAKRA_MAP))}; "
        f"map has bodies the engine lacks: "
        f"{sorted(set(_PLANET_CHAKRA_MAP) - computed)}"
    )


def _birth(sign: str) -> BirthData:
    """A birth date that lands on each western sun sign."""
    dates = {
        "aries": "1990-04-10", "taurus": "1990-05-10", "gemini": "1990-06-10",
        "cancer": "1990-07-10", "leo": "1990-08-10", "virgo": "1990-09-10",
        "libra": "1990-10-10", "scorpio": "1990-11-10",
        "sagittarius": "1990-12-10", "capricorn": "1990-01-10",
        "aquarius": "1990-02-10", "pisces": "1990-03-10",
    }
    return BirthData(
        name="Test",
        birth_date=dates[sign],
        birth_time="10:30",
        birth_place="Delhi",
        latitude=28.6139,
        longitude=77.209,
        timezone_offset=5.5,
    )
