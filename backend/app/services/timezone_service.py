"""Resolve the UTC offset that was actually in force at a birth.

The location dataset carries one offset per city, which is what applies *now*.
That is wrong for a historical birth, and not only slightly: India was on
+5:53:20 until October 1947 and +6:30 through the 1941-42 British wartime
daylight saving, so a chart computed at the fixed 5.5 can be an hour out. London
and New York swing an hour twice a year. An hour is enough to move the ascendant
and change the house a planet falls in.

So each record also carries `tz_iana`, and the offset for a given birth is
resolved through the standard library's `zoneinfo`, which knows the history.

Degradation is deliberate: if no timezone database is available (Windows without
`tzdata`, or a zone this Python has never heard of) the caller's own
`timezone_offset` is used unchanged. A chart is still produced, and it is the
same chart as before this module existed. Resolving quietly to UTC instead would
be a silent five-and-a-half-hour error, which is far worse than a slightly wrong
offset that was already wrong.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

# Reported once per zone so a misconfigured deployment is visible in the logs
# without logging on every request.
_unavailable_warned: set = set()


def resolve_offset(
    tz_iana: str | None,
    birth_date,
    birth_time=None,
    fallback: float = 5.5,
) -> float:
    """UTC offset in hours for `tz_iana` at the given local birth moment.

    `fallback` is returned when the zone is unknown or no timezone database is
    installed. `birth_time` matters for the hours either side of a transition;
    it defaults to noon so a date-only caller still lands on the right side of a
    transition for every real zone.
    """
    if not tz_iana:
        return fallback

    hour = 12
    minute = 0
    if birth_time is not None:
        try:
            hour = birth_time.hour
            minute = birth_time.minute
        except AttributeError:
            hour = int(birth_time)

    try:
        zone = ZoneInfo(tz_iana)
    except (ZoneInfoNotFoundError, ValueError, KeyError) as exc:
        if tz_iana not in _unavailable_warned:
            _unavailable_warned.add(tz_iana)
            # A KeyError here means no timezone database is installed at all
            # (Windows without `tzdata`); a ZoneInfoNotFoundError means the zone
            # name itself is wrong. Worth distinguishing in the log.
            logger.warning(
                "Cannot resolve timezone %r (%s); using the supplied offset %+.2f. "
                "Install the 'tzdata' package for historical offsets.",
                tz_iana, type(exc).__name__, fallback,
            )
        return fallback

    try:
        local = datetime(birth_date.year, birth_date.month, birth_date.day,
                         hour, minute)
        offset = local.replace(tzinfo=zone).utcoffset()
    except (ValueError, OverflowError) as exc:
        # Out-of-range dates for a zone's transition table.
        logger.debug("Offset lookup failed for %s %s: %s", tz_iana, birth_date, exc)
        return fallback

    if offset is None:
        return fallback
    return offset.total_seconds() / 3600.0


def dataset_loads() -> bool:
    """Whether a timezone database is actually available.

    Used by the settings and health surfaces so a deployment that cannot resolve
    historical offsets says so, rather than silently charting every birth at the
    present-day offset.
    """
    try:
        ZoneInfo("Asia/Kolkata")
        return True
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        return False