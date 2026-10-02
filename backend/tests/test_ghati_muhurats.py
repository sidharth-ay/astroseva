"""Do Ghati windows must not overlap, and must not claim to be classical.

The window builder counted how many 48-minute windows fit in the day and then
spaced their starts evenly across it. On a 12-hour day that is fifteen windows
45 minutes apart, each 48 minutes long, so every window after the first
overlapped its predecessor and the last was clamped to sunset.
"""

import pytest

from app.api.panchang import MUHURAT_HOURS, _calculate_ghati_muhurat


def _hours(clock: str) -> float:
    h, m = clock.split(":")
    return int(h) + int(m) / 60


@pytest.mark.parametrize("sunrise,sunset", [
    (6.0, 18.0),    # a 12-hour day
    (5.5, 18.5),    # equinox-ish
    (4.0, 20.0),    # long summer day
    (7.0, 17.0),    # short winter day
])
def test_windows_do_not_overlap(sunrise, sunset):
    """The bug: 15 windows spaced 45 minutes apart, each 48 minutes long."""
    windows = _calculate_ghati_muhurat(sunrise, sunset)
    assert windows
    for earlier, later in zip(windows, windows[1:], strict=False):
        assert _hours(later["start"]) >= _hours(earlier["end"]) - 1e-9, (
            f"{earlier['end']} -> {later['start']} overlaps"
        )


def test_windows_are_contiguous_from_sunrise():
    """Sequential placement leaves no gap between consecutive windows."""
    windows = _calculate_ghati_muhurat(6.0, 18.0)
    assert _hours(windows[0]["start"]) == pytest.approx(6.0)
    for earlier, later in zip(windows, windows[1:], strict=False):
        assert _hours(later["start"]) == pytest.approx(_hours(earlier["end"]))


def test_every_window_is_the_full_stated_length():
    """A truncated window is not a muhurat.

    Only complete windows are emitted; the remainder of the daylight is
    reported separately rather than dressed up as a short muhurat.
    """
    for sunrise, sunset in [(6.0, 18.0), (5.5, 18.5), (7.0, 17.0), (4.0, 20.0)]:
        windows = _calculate_ghati_muhurat(sunrise, sunset)
        for w in windows:
            assert _hours(w["end"]) - _hours(w["start"]) == pytest.approx(
                MUHURAT_HOURS, abs=0.02
            ), (sunrise, sunset, w)


def test_the_remainder_is_reported_not_invented(client):
    """A day that does not divide evenly leaves a remainder, and it is stated."""
    # 12h06m of daylight: fifteen 48-minute windows, then 6 minutes over.
    r = client.get(
        "/api/v1/panchang/ghati?date_str=2026-03-11"
        "&latitude=28.6139&longitude=77.209"
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "unused_minutes" in body
    assert body["unused_minutes"] >= 0
    for w in body["muhurats"]:
        assert _hours(w["end"]) - _hours(w["start"]) == pytest.approx(
            MUHURAT_HOURS, abs=0.02
        )


def test_muhurat_is_two_ghati():
    """48 minutes: a ghati is 24 minutes."""
    assert MUHURAT_HOURS == pytest.approx(48 / 60)


def test_no_zero_length_window_on_a_very_short_day():
    """A day too short for a whole window must report nothing, not an empty one."""
    assert _calculate_ghati_muhurat(6.0, 6.1) == []


def test_window_count_is_the_number_that_fits(sunrise=6.0, sunset=18.0):
    total_minutes = (sunset - sunrise) * 60
    expected = int(total_minutes // 48)
    assert len(_calculate_ghati_muhurat(sunrise, sunset)) == expected


# --- the endpoint must say what it is ----------------------------------------

def test_endpoint_states_the_method_and_limits(client):
    """The response claimed to be classical muhurtas without saying otherwise."""
    r = client.get(
        "/api/v1/panchang/ghati?date_str=2026-03-11"
        "&latitude=28.6139&longitude=77.209"
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["method"]
    assert body["limitations"], "the response does not state its limitations"
    text = " ".join(body["limitations"]).lower()
    assert "classical" in text
    assert "night" in text, "the response does not disclose that night is absent"


def test_endpoint_windows_do_not_overlap(client):
    windows = client.get(
        "/api/v1/panchang/ghati?date_str=2026-03-11"
        "&latitude=28.6139&longitude=77.209"
    ).json()["muhurats"]
    assert windows
    for earlier, later in zip(windows, windows[1:], strict=False):
        assert _hours(later["start"]) >= _hours(earlier["end"]) - 1e-9
