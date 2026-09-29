"""Gun Milan (matching) koota arithmetic.

The tables here were wrong in ways no existing test covered, and both defects
were silent: they produced plausible-looking numbers rather than errors.
"""

import pytest

from app.core.matching import calculate_tara, calculate_varna
from app.core.rashis import RASHI_NAMES

VARNA_NAMES = ["Brahmin", "Kshatriya", "Vaishya", "Shudra"]

# Aries..Pisces, by varna. Brahmin takes the first four signs, Kshatriya the
# next two, Vaishya the next two, and Shudra the last four.
CLASSICAL_VARNA = {
    0: "Brahmin",    # Aries
    1: "Brahmin",    # Taurus
    2: "Brahmin",    # Gemini
    3: "Brahmin",    # Cancer
    4: "Kshatriya",  # Leo
    5: "Kshatriya",  # Virgo
    6: "Vaishya",    # Libra
    7: "Vaishya",    # Scorpio
    8: "Shudra",     # Sagittarius
    9: "Shudra",     # Capricorn
    10: "Shudra",    # Aquarius
    11: "Shudra",    # Pisces
}


# --- Varna --------------------------------------------------------------------

@pytest.mark.parametrize("sign,expected", sorted(CLASSICAL_VARNA.items()))
def test_varna_of_every_sign(sign, expected):
    assert calculate_varna(sign, 0)["boy_varna"] == expected, RASHI_NAMES[sign]["en"]


def test_varna_covers_all_twelve_signs():
    """The old table was shifted by one varna from Gemini on, then wrapped.

    It reported Sagittarius and Capricorn as Brahmin -- the highest varna -- and
    Aquarius and Pisces as Kshatriya. Only Aries and Taurus were right.
    """
    assert len(CLASSICAL_VARNA) == 12
    for sign, expected in CLASSICAL_VARNA.items():
        assert calculate_varna(sign, 0)["boy_varna"] == expected


def test_varna_fire_signs_do_not_outrank_earth_signs():
    """Sanity check on the direction of the table: a Shudra sign must not
    report as Brahmin, which the wrap-around did for four signs."""
    for sign in (8, 9, 10, 11):
        assert calculate_varna(sign, 0)["boy_varna"] == "Shudra"


def test_varna_boy_scores_when_his_varna_is_not_lower():
    # Brahmin=0 ranks highest, so the boy scores when his varna number is equal
    # to or below the girl's. Boy Brahmin against girl Shudra: a point.
    assert calculate_varna(0, 11)["score"] == 1
    # The reverse does not.
    assert calculate_varna(11, 0)["score"] == 0


def test_varna_is_symmetric_in_its_inputs():
    """Swapping the pair must swap the reported varnas, not change them."""
    a = calculate_varna(4, 7)
    b = calculate_varna(7, 4)
    assert a["boy_varna"] == b["girl_varna"]
    assert a["girl_varna"] == b["boy_varna"]


# --- Tara ---------------------------------------------------------------------

def _tara_position(frm: int, to: int) -> int:
    """Recompute the expected tara independently of the implementation.

    The 27 nakshatras fall into nine groups of three, one per tara.
    """
    count = (to - frm) % 27
    if count == 0:
        count = 1
    return ((count - 1) // 3) % 9 + 1


def test_tara_never_reports_zero():
    """The old arithmetic produced a tara of 0, which is not one of the nine.

    `(count + 1) % 9` returns 0 whenever count is 8, so a boy and girl eight
    nakshatras apart were recorded as "tara 0" in the response and the UI.
    """
    for g in range(27):
        t = calculate_tara(0, g)
        assert t["boy_to_girl"] in range(1, 10), g
        assert t["girl_to_boy"] in range(1, 10), g


def test_tara_same_nakshatra_is_tara_one():
    """Identical nakshatras is a count of 1, which is tara 1.

    The old special case returned 9 instead, so the two most similar possible
    placements were scored against Paridhi.
    """
    t = calculate_tara(0, 0)
    assert t["boy_to_girl"] == 1
    assert t["girl_to_boy"] == 1


def test_tara_counts_forward_one_to_twenty_seven():
    """Each of the 27 nakshatras maps to a tara position 1-9, in order."""
    for g in range(1, 27):
        t = calculate_tara(0, g)
        assert t["boy_to_girl"] == _tara_position(0, g), g
        assert t["girl_to_boy"] == _tara_position(g, 0), g


def test_tara_positions_are_symmetric():
    """If A to B is inauspicious, B to A is too, so the score is symmetric."""
    for b in range(27):
        for g in range(27):
            if b == g:
                continue
            assert calculate_tara(b, g)["score"] == calculate_tara(g, b)["score"]


def test_tara_groups_three_nakshatras_to_each_tara():
    """The scheme divides 27 nakshatras into nine groups of three.

    Mapping one tara per nakshatra instead spreads each tara over three
    nakshatras' worth of placements and puts nine-tenths of the sky in the
    wrong group.
    """
    # Forward from Ashwini: counts 1-3 are Visham, 4-6 Vipreet, 7-9 Shubh.
    # The count for offset 0 is 1, the same nakshatra, so the first group of
    # three holds offsets 0-2 and offset 3 is the fourth count, landing in
    # Vipreet.
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (0, 1, 2)] == [1, 1, 1]
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (3, 4, 5)] == [1, 2, 2]
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (6, 7, 8)] == [2, 3, 3]
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (9, 10, 11)] == [3, 4, 4]
    # Paridhi, the ninth, takes the final two forward counts: a count of 27 is
    # the same nakshatra, which is treated as a count of 1, so the last group
    # holds only offsets 25 and 26.
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (22, 23, 24)] == [8, 8, 8]
    assert [calculate_tara(0, g)["boy_to_girl"] for g in (25, 26)] == [9, 9]


def test_tara_reaches_all_nine_positions():
    assert {calculate_tara(0, g)["boy_to_girl"] for g in range(27)} == set(range(1, 10))


def test_tara_does_not_penalise_amrit():
    """Tara 5 is Amrit, the most favourable of the nine.

    The inauspicious set was {1, 5, 7}, so a placement landing on Amrit lost a
    point. The classical inauspicious trio is Visham, Vipreet and Atithi.
    """
    # Boy at Ashwini (0); count forward to find a girl on tara 5.
    tara5_nakshatras = [g for g in range(27) if _tara_position(0, g) == 5]
    assert tara5_nakshatras
    for g in tara5_nakshatras:
        assert calculate_tara(0, g)["boy_to_girl"] == 5, g


def test_tara_penalises_visham_vipreet_and_atithi():
    """Positions 1 (Visham), 2 (Vipreet) and 7 (Atithi) each cost a point."""
    for tara_no in (1, 2, 7):
        matches = [g for g in range(27) if _tara_position(0, g) == tara_no]
        assert matches, tara_no
        for g in matches:
            # Score 3 means neither direction landed on an inauspicious tara.
            # With one direction inauspicious the score must be 2, unless the
            # other is inauspicious too, in which case it is 1.
            other = _tara_position(g, 0)
            expected = 3 - (1 if tara_no in (1, 2, 7) else 0) - (1 if other in (1, 2, 7) else 0)
            assert calculate_tara(0, g)["score"] == expected, (tara_no, g)
