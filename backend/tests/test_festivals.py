"""Festival engine tests.

The 2026 landmarks below are drik-panchang dates, cross-checked against
several independent published 2026 calendars. They are the regression guard for
the engine: the previous implementation was a hardcoded 2026 table in which
Holi, Dussehra, Diwali, Chhath, Karva Chauth, Navaratri and Guru Purnima were
all wrong, and any year other than 2026 returned an empty list.
"""

import pytest

from app.core.festivals import (
    FESTIVAL_RULES,
    get_festivals,
    _MEMO,
)

# drik-panchang 2026 landmarks.
LANDMARKS_2026 = {
    "Makar Sankranti": "2026-01-14",
    "Vasant Panchami": "2026-01-23",
    "Maha Shivaratri": "2026-02-15",
    "Holika Dahan": "2026-03-03",
    "Holi": "2026-03-03",
    "Ugadi / Gudi Padwa": "2026-03-19",
    "Ram Navami": "2026-03-26",
    "Hanuman Jayanti": "2026-04-02",
    "Akshaya Tritiya": "2026-04-20",
    "Buddha Purnima": "2026-05-01",
    "Guru Purnima": "2026-07-29",
    "Raksha Bandhan": "2026-08-28",
    "Krishna Janmashtami": "2026-09-04",
    "Ganesh Chaturthi": "2026-09-14",
    "Sharad Navratri": "2026-10-11",
    "Vijayadashami (Dussehra)": "2026-10-20",
    "Karva Chauth": "2026-10-29",
    "Dhanteras": "2026-11-06",
    "Naraka Chaturdashi": "2026-11-07",
    "Diwali (Lakshmi Puja)": "2026-11-08",
    "Govardhan Puja": "2026-11-10",
    "Bhai Dooj": "2026-11-11",
    "Chhath Puja": "2026-11-15",
    "Kartika Purnima": "2026-11-24",
    "Guru Nanak Jayanti": "2026-11-24",
}


@pytest.fixture(scope="module")
def f2026():
    return {f["name"]: f for f in get_festivals(2026)}


@pytest.mark.parametrize("name,expected", sorted(LANDMARKS_2026.items()))
def test_2026_landmark_dates(f2026, name, expected):
    """Every major 2026 festival lands on its published date."""
    assert name in f2026, f"{name} missing from the 2026 calendar"
    assert f2026[name]["date"] == expected


def test_all_results_are_within_the_requested_year(f2026):
    for f in f2026.values():
        assert f["date"].startswith("2026-"), f
        assert f["end_date"].startswith("2026-"), f


# --- years other than 2026 -------------------------------------------------


@pytest.mark.parametrize("year", [2024, 2025, 2027, 2028])
def test_other_years_return_a_populated_calendar(year):
    """The old hardcoded table returned nothing outside 2026."""
    fests = get_festivals(year)
    assert len(fests) > 40, f"{year} produced only {len(fests)} festivals"
    assert all(f["date"].startswith(f"{year}-") for f in fests), \
        f"{year} leaked a festival from another year"


@pytest.mark.parametrize("year", [2025, 2027, 2028])
def test_major_festivals_present_in_other_years(year):
    """The headline festivals are found in every year, not just 2026.

    Their exact dates can shift by a day against some published panchangs --
    a festival near a tithi boundary depends on the ayanamsa and the boundary
    convention used -- so this asserts presence, not the date.
    """
    names = {f["name"] for f in get_festivals(year)}
    for required in ("Diwali (Lakshmi Puja)", "Holi", "Raksha Bandhan",
                     "Ganesh Chaturthi", "Maha Shivaratri", "Chhath Puja"):
        assert required in names, f"{required} missing from {year}"


def test_month_filter_only_returns_that_month():
    nov = get_festivals(2026, month=11)
    assert nov, "November 2026 should not be empty"
    assert all(f["date"].startswith("2026-11") for f in nov)
    assert any(f["name"].startswith("Diwali") for f in nov)


# --- timings and structure --------------------------------------------------


def test_every_festival_carries_timings(f2026):
    for f in f2026.values():
        assert f["sunrise"] and f["sunset"], f
        assert f["muhurat"]["start"] and f["muhurat"]["end"], f
        assert f["rahu_kaal"]["start"] and f["rahu_kaal"]["end"], f
        # HH:MM
        for key in ("sunrise", "sunset"):
            hh, mm = f[key].split(":")
            assert 0 <= int(hh) <= 23 and 0 <= int(mm) <= 59, f


def test_sunrise_precedes_sunset(f2026):
    for f in f2026.values():
        assert f["sunrise"] < f["sunset"], f


def test_muhurat_is_ordered(f2026):
    for f in f2026.values():
        assert f["muhurat"]["start"] < f["muhurat"]["end"], f


def test_diwalis_muhurat_is_pradosh_not_sunrise(f2026):
    """Lakshmi Puja is judged in the evening -- the reason Diwali is on the
    day it is, and a regression guard for using sunrise for every festival."""
    d = f2026["Diwali (Lakshmi Puja)"]
    assert d["rule_time"] == "pradosh"
    assert d["muhurat"]["start"] >= d["sunset"], d


def test_ram_navami_is_judged_in_madhyahna(f2026):
    assert f2026["Ram Navami"]["rule_time"] == "madhyahna"


def test_every_festival_has_a_tithi_basis(f2026):
    for f in f2026.values():
        assert f["paksha"] in ("Shukla", "Krishna"), f
        assert 1 <= f["tithi_number"] <= 15, f
        assert f["nakshatra"], f
        assert f["description"] and f["significance"], f


def test_krishna_fifteenth_tithi_is_reported_as_amavasya(f2026):
    """The waning 15th tithi is Amavasya, not Purnima.

    calculate_tithi normalises the waning half onto 1-15, so a name lookup on
    the number alone used to label the new moon "Purnima".
    """
    d = f2026["Diwali (Lakshmi Puja)"]
    assert d["paksha"] == "Krishna"
    assert d["tithi_number"] == 15
    assert d["tithi_name"] == "Amavasya"


def test_major_and_vrat_categories_present(f2026):
    cats = {f["category"] for f in f2026.values()}
    assert "major" in cats
    assert "vrat" in cats


def test_recurring_vrats_recur_roughly_monthly():
    """Ekadashi happens 24 times a year, Sankashti Chaturthi about twelve.

    Counted from the list, not the name-keyed dict: the recurring vratas share
    one name across the year and would otherwise collapse to a single entry.
    """
    fests = get_festivals(2026)
    eka = [f for f in fests if f["name"].endswith("Ekadashi")]
    sank = [f for f in fests if f["name"] == "Sankashti Chaturthi"]
    assert 22 <= len(eka) <= 25, len(eka)
    assert 10 <= len(sank) <= 14, len(sank)
    # Ekadashi alternates waxing and waning fortnight.
    assert {f["paksha"] for f in eka} == {"Shukla", "Krishna"}


def test_navratri_spans_nine_days(f2026):
    n = f2026["Sharad Navratri"]
    assert n["span_days"] == 9
    assert n["end_date"] > n["date"]


# --- location ---------------------------------------------------------------


def test_results_differ_by_location():
    """Sunrise and sunset must follow the requested coordinates.

    Dates themselves usually agree across locations; a festival within a few
    hours of a tithi boundary can fall on a different day in a far-away
    timezone, which is why the endpoint takes coordinates.
    """
    delhi = get_festivals(2026, 28.6139, 77.2090, 5.5, month=11)
    london = get_festivals(2026, 51.5074, -0.1278, 0.0, month=11)
    assert delhi and london
    shared = sorted({f["name"] for f in delhi} & {f["name"] for f in london})
    assert shared, "the two locations should share some November observances"
    name = shared[0]
    d = next(f for f in delhi if f["name"] == name)
    l = next(f for f in london if f["name"] == name)
    assert d["sunrise"] != l["sunrise"]
    assert d["sunset"] != l["sunset"]
    # London in late autumn has a much shorter day than Delhi.
    assert l["sunset"] < d["sunset"]
    assert l["muhurat"]["start"] != d["muhurat"]["start"]


def test_memo_returns_equal_results():
    a = get_festivals(2026)
    b = get_festivals(2026)
    assert a == b


# --- rule table sanity ------------------------------------------------------


def test_no_festival_lacks_description():
    for rule in FESTIVAL_RULES:
        assert rule.get("description"), rule["name"]


# Observances that are the same day by definition and so legitimately share a
# (paksha, tithi, occurrence) triple.
LEGITIMATE_PAIRS = [
    {"Holika Dahan", "Holi"},                    # the two nights of Phalguna Purnima
    {"Kartika Purnima", "Guru Nanak Jayanti"},   # Guru Nanak falls on Kartika Purnima
]


def test_occurrence_indices_do_not_collide():
    """Two unrelated rules sharing a triple would silently collapse."""
    seen = {}
    for rule in FESTIVAL_RULES:
        if rule.get("occurrence") is None:
            continue
        key = (rule.get("paksha"), rule.get("tithi"), rule["occurrence"],
               rule.get("tithi_source"))
        if key in seen:
            pair = {rule["name"], seen[key]}
            assert any(pair <= allowed for allowed in LEGITIMATE_PAIRS), \
                f"{rule['name']} collides with {seen[key]}"
        seen[key] = rule["name"]
