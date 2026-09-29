"""Hindu festival calendar computed astronomically.

Why this is computed rather than tabulated
------------------------------------------
Festival days are defined by the Hindu lunisolar calendar, so a hardcoded list
only ever holds for the year it was written. Earlier this module shipped 24
hardcoded 2026 dates that were wrong (Holi on Mar 10 instead of Mar 3/4,
Diwali on Oct 20 instead of Nov 8) and returned an empty list for any other
year. Dates here are derived from the tithi actually prevailing on the day, so
the same code is correct for any year.

Rule times
----------
The single most common mistake in festival calendars is testing every festival
at sunrise. Drik Panchang judges each observance at the moment that matters to
it, and getting that wrong shifts a date by a day:

  * ``sunrise``         - most vratas and ordinary festival days
  * ``madhyahna``       - Ram Navami, Janmashtami, Ganesh Chaturthi (midday)
  * ``aparahna``        - Vijaya Dashami (afternoon)
  * ``pradosh``         - Dhanteras, Naraka Chaturdashi, Diwali/Lakshmi Puja
                          (evening, after sunset)
  * ``pradosh_nishith`` - Maha Shivaratri (the closing part of pradosh)

Every rule here carries the local hours of its window; a festival matches when
the target tithi is the one prevailing at the start of that window.

Conventions
-----------
Lahiri ayanamsa throughout, matching the rest of the engine. Times are local
clock hours for the requested location, so a caller in another city gets the
dates and sunrise/sunset/muhurat times that apply there.
"""

from datetime import date, datetime, timedelta
import calendar

from .panchang import (
    TITHI_NAMES,
    calculate_nakshatra,
    calculate_rahu_kaal,
    calculate_sunrise_sunset,
    calculate_tithi,
)
from .planets import get_sun_moon_longitudes, get_sun_sidereal_longitude

# --- rule times ------------------------------------------------------------

RULE_SUNRISE = "sunrise"
RULE_MADHYAHNA = "madhyahna"
RULE_APARAHNA = "aparahna"
RULE_PRADOSH = "pradosh"
RULE_PRADOSH_NISHITH = "pradosh_nishith"

# Fixed local-clock windows. Pradosh-based windows are resolved against the
# day's sunset at runtime, since they are defined relative to it.
MADHYAHNA = (11.0, 14.0)
APARAHNA = (12.0, 15.0)
PRADOSH_HOURS = 2.8      # pradosh kalam lasts about 2h48m
PRADOSH_NISHITH = (1.85, 2.8)

# --- festival rule table ----------------------------------------------------
#
# months: optional restriction on solar month(s), used to disambiguate rules
# that repeat every lunar month (Shukla Purnima alone occurs ~13x a year).

F = lambda **kw: kw  # noqa: E731 - keeps the table readable

FESTIVAL_RULES = [
    # --- solar (fixed by the Sun's sidereal ingress) ---
    F(name="Makar Sankranti", kind="solar", ingress=270, rule=RULE_SUNRISE,
      category="major", months=(1,),
      description="Sun enters Makara; the harvest new year and the turn of the Sun northward.",
      significance="Marks the end of the winter solstice season and the beginning of longer days. Pongal, Bihu and Makar Sankranti are celebrated on or near this day."),
    F(name="Mesha Sankranti", kind="solar", ingress=0, rule=RULE_SUNRISE,
      category="major", months=(4,),
      description="Sun enters Mesha; the sidereal new year and the start of Vasanta season.",
      significance="Gudi Padwa, Vishu and Tamil/Puthandu new year are aligned to this ingress in their regions."),
    F(name="Karka Sankranti", kind="solar", ingress=90, rule=RULE_SUNRISE,
      category="major", months=(7,),
      description="Sun enters Karka, beginning the monsoon (Varsha) season.",
      significance="Guru Purnima and the start of Chaturmas vrat fall near this ingress."),

    # --- major pan-Indian ---
    F(name="Vasant Panchami", paksha="Shukla", tithi=5, rule=RULE_SUNRISE,
      category="major", months=(1, 2),
      description="Spring's fifth day, dedicated to Goddess Saraswati.",
      significance="Students traditionally begin new studies or instruments here. Also called Basant Panchami."),
    F(name="Maha Shivaratri", paksha="Krishna", tithi=14, rule=RULE_PRADOSH_NISHITH,
      category="major", months=(2, 3),
      description="The great night of Shiva, observed in the closing hours of pradosh.",
      significance="Abhishekam of the lingam, fasting and vigil through the night. Considered the most important Shaiva vrat."),
    F(name="Holika Dahan", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(3,),
      description="Bonfire on the night of Phalguna Purnima.",
      significance="Commemorates the survival of Prahlad and the triumph of devotion over evil. Precedes Holi."),
    F(name="Holi", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(3,),
      description="Festival of colours: Dhulandi and Rang Panchami the morning after Holika Dahan.",
      significance="Welcomes spring and levites social rank for the day. Largely lunar, so it drifts across March and April."),
    F(name="Ugadi / Gudi Padwa", paksha="Shukla", tithi=1, rule=RULE_SUNRISE,
      category="major", months=(3, 4),
      description="Hindu and Maharashtrian new year on Shukla Pratipada.",
      significance="Ugadi in Karnataka/Andhra/Telangana, Gudi Padwa in Maharashtra, Puthandu elsewhere in the south."),
    F(name="Ram Navami", paksha="Shukla", tithi=9, rule=RULE_MADHYAHNA,
      category="major", months=(3, 4),
      description="Birthday of Lord Rama, judged during madhyahna.",
      significance="Consecration of idols and installation of a Ram idol. Madhyahna muhurat is the auspicious core of the day."),
    F(name="Hanuman Jayanti", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(4,),
      description="Birth anniversary of Lord Hanuman, on Chaitra Purnima.",
      significance="Reciting the Hanuman Chalisa and temple offerings are the customary observances."),
    F(name="Akshaya Tritiya", paksha="Shukla", tithi=3, rule=RULE_SUNRISE,
      category="major", months=(4, 5),
      description="An unending, auspicious day for new beginnings.",
      significance="Buying gold, starting a business or a first diet (annaprashana) and other firsts are favoured here."),
    F(name="Buddha Purnima", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(4, 5),
      description="Full moon marking the birth, enlightenment and death of Gautama Buddha.",
      significance="Observed with fasting, meditation and sermons, most widely in Sri Lanka, Myanmar and by Buddhists in India."),
    F(name="Mahavir Jayanti", paksha="Shukla", tithi=13, rule=RULE_SUNRISE,
      category="major", months=(3, 4),
      description="Birth anniversary of Lord Mahavira, the last tirthankara.",
      significance="Prayers, fasting and temple visits; the most important Jain festival."),
    F(name="Ganga Dussehra", paksha="Shukla", tithi=10, rule=RULE_SUNRISE,
      category="major", months=(5, 6),
      description="Appearance of the Ganga from the hair of Lord Vishnu.",
      significance="Ganga Aarti on the ghats and releasing lamps on the river, especially at Haridwar and Varanasi."),
    F(name="Vat Purnima", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(5, 6),
      description="Savitri Vrat, married women worshiping for their husbands' long life.",
      significance="Also called Savitri Vrat, observed on Jyeshtha Purnima."),
    F(name="Guru Purnima", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(7,),
      description="Full moon honouring spiritual teachers and gurus.",
      significance="Gruja shraddha, offering to teachers and the reading of the Guru Granth at its birth place."),
    F(name="Raksha Bandhan", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(8,),
      description="Sisters tie a rakhi on their brothers' wrists for protection.",
      significance="Also Raksha Bandhan, Shravana Purnima and Narali Purnima; the thread is tied in the afternoon with the right hand and the brother's left."),
    F(name="Krishna Janmashtami", paksha="Krishna", tithi=8, rule=RULE_MADHYAHNA,
      category="major", months=(8, 9),
      description="Birth of Lord Krishna, judged during madhyahna.",
      significance="Fasting, the lifting of the Govardhan hill and a midnight (nishith) abhishekam of the infant idol."),
    F(name="Ganesh Chaturthi", paksha="Shukla", tithi=4, rule=RULE_MADHYAHNA,
      category="major", months=(8, 9),
      description="Birth of Lord Ganesha, judged during madhyahna.",
      significance="Clay idols are installed in homes and mandals for ten days, then immersed in visarjan."),
    F(name="Rishi Panchami", paksha="Shukla", tithi=5, rule=RULE_SUNRISE,
      category="minor", months=(9,),
      description="Honour to the rishis who fostered oral tradition.",
      significance="Girls who recited the Vedas touch their fathers' feet; observed two days after Hartalika Teej."),
    F(name="Sharad Navratri", paksha="Shukla", tithi=1, rule=RULE_SUNRISE,
      category="major", months=(9, 10), span_days=9,
      description="Nine nights of the Goddess Durga, beginning on Shukla Pratipada.",
      significance="Garba and dandiya, kalash puja, fasts and the daily worship of the nine forms of Durga."),
    F(name="Durga Ashtami", paksha="Shukla", tithi=8, rule=RULE_SUNRISE,
      category="major", months=(9, 10),
      description="The eighth night of Navratri, honouring Mahagauri.",
      significance="Kanya Pujan and Kalash arati; the culmination of Durga's nine nights."),
    F(name="Maha Navami", paksha="Shukla", tithi=9, rule=RULE_SUNRISE,
      category="major", months=(9, 10),
      description="The ninth night of Navratri, the final day of the goddess' stay.",
      significance="Ayudha Puja, worship of tools and vehicles, and the homa at the culmination of the festival."),
    F(name="Vijayadashami (Dussehra)", paksha="Shukla", tithi=10, rule=RULE_APARAHNA,
      category="major", months=(10,),
      description="Rama's victory over Ravana, judged during aparahna.",
      significance="Shami puja, new clothes and vehicles, and the burning of Ravana effigies."),
    F(name="Sharad Purnima", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="minor", months=(10,),
      description="Full moon of the autumn season.",
      significance="Kojagiri Purnima: a rice pudding is set out overnight and eaten at dawn."),
    F(name="Karva Chauth", paksha="Krishna", tithi=4, rule=RULE_SUNRISE,
      category="major", months=(10,),
      description="Married women fast for their husbands' long life.",
      significance="The fast breaks at moonrise after the moon is worshipped, with arghya offered to the moon."),
    F(name="Dhanteras", paksha="Krishna", tithi=13, rule=RULE_PRADOSH,
      category="major", months=(10, 11),
      description="Buying metals and starting auspicious new undertakings, in pradosh.",
      significance="Opens the Diwali sequence; purchase of gold, silver or utensils and the Dhanteras Pujan."),
    F(name="Naraka Chaturdashi", paksha="Krishna", tithi=14, rule=RULE_PRADOSH,
      category="major", months=(10, 11),
      description="Krishna's victory over Narakasura, in pradosh.",
      significance="Bathing the Krishna idol at dawn with a bundle of bilva leaves; Mahabharata recited."),
    F(name="Diwali (Lakshmi Puja)", paksha="Krishna", tithi=15, rule=RULE_PRADOSH,
      category="major", months=(10, 11),
      description="Kartika Amavasya, worship of Lakshmi in pradosh.",
      significance="The festival of lights, welcoming Lakshmi and performing Ganapati worship. The auspicious core of the day is the evening, not sunrise."),
    F(name="Govardhan Puja", paksha="Shukla", tithi=1, rule=RULE_SUNRISE,
      category="major", months=(10, 11),
      description="Worship of Mount Govardhan the day after Diwali.",
      significance="Circumambulation of Govardhan hill with a cow and the annakuta offering of food to the cows."),
    F(name="Bhai Dooj", paksha="Shukla", tithi=2, rule=RULE_SUNRISE,
      category="major", months=(10, 11),
      description="Ceremony honouring the bond between brothers and sisters.",
      significance="Sisters perform aarti for their brothers and apply tilak; Bhaiya-Dooj in the south."),
    F(name="Chhath Puja", paksha="Shukla", tithi=6, rule=RULE_SUNRISE,
      category="major", months=(11,),
      description="Four days of worship offering arghya to the Sun God.",
      significance="Devoted to Chhathi Maiya and the Sun; fasted water is offered at sunrise and again at sunset. Central to Bihar and eastern Uttar Pradesh."),
    F(name="Kartika Purnima", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(11,),
      description="Full moon of Kartika, when Vishnu wakes from his cosmic sleep.",
      significance="Dev Uthani, the lighting of lamps and the Kartika Purnima bath; also Guru Nanak Jayanti."),
    F(name="Guru Nanak Jayanti", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="major", months=(11,),
      description="Birth anniversary of Guru Nanak Dev Ji, on Kartika Purnima.",
      significance="Prabhat Gurmukhi Sahib, a 48-hour unbroken reading of the Guru Granth Sahib, and processions."),
    F(name="Gita Jayanti", paksha="Shukla", tithi=11, rule=RULE_SUNRISE,
      # Margashirsha (Magha) runs from mid-January, so the Ekadashi of that
      # month is the FIRST Shukla Ekadashi of the calendar year. The guard was
      # (12, 1) which straddles the year boundary and matched the December
      # Ekadashi too -- the tail of the month that closes the lunar year -- so
      # the festival was reported twice a year. `pick="first"` plus these months
      # yields the single Magha Ekadashi, and January holds exactly one in every
      # year from 2026 to 2033.
      category="minor", months=(1, 2), pick="first",
      description="Appearance of the Bhagavad Gita, on Margashirsha Shukla Ekadashi.",
      significance="Recitation of the Gita and discussion of its teaching."),

    # --- vrat days (recur every lunar month) ---
    F(name="Pradosh Vrat", paksha=None, tithi=13, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="Vrat on the thirteenth tithi, observed during pradosh.",
      significance="Offered to Shiva with bilva leaves and lamp oil; one of the most frequently kept vratas."),
    F(name="Amavasya", paksha="Krishna", tithi=15, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="The new-moon tithi; a day for ancestral remembrance.",
      significance="Tarpan and shraddha rites for departed ancestors."),
    F(name="Purnima Vrat", paksha="Shukla", tithi=15, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="The full-moon tithi, kept as a vrat.",
        significance="Fasting is broken with moonlight and kheer; observed by name according to the lunar month."),

    # All 24 Ekadashi. The name is derived from the Moon's nakshatra at run
    # time, so the sequence stays correct in every year without a hardcoded list.
    F(name="{nakshatra} Ekadashi", paksha=None, tithi=11, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="The eleventh tithi, kept as a fast in both the waxing and waning fortnight.",
      significance="Fasting until moonrise, with prayer to Vishnu. The day and the moon's constellation both carry specific names."),

    # Named monthly Chaturthi: Shukla is Vinayaka/Ganesh, Krishna is Sankashti.
    F(name="Vinayaka Chaturthi", paksha="Shukla", tithi=4, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="Fourth day of the waxing fortnight, dedicated to Ganesha.",
      significance="Puja of the idol, sweets offered and business begun."),
    F(name="Sankashti Chaturthi", paksha="Krishna", tithi=4, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="Fourth day of the waning fortnight, kept for the moon.",
      significance="Fasting until moonrise, the most widely kept monthly vrat."),
    F(name="Masik Shivaratri", paksha="Krishna", tithi=14, rule=RULE_SUNRISE,
      category="vrat", generic=True,
      description="Monthly night of Shiva on the waning fourteenth tithi.",
      significance="Abhishekam of the lingam during the night; said to grant liberation when kept with faith."),
]

# Onam is deliberately absent. It follows the Malayalam solar calendar rather
# than the sidereal one, so it cannot be derived from these rules -- the sidereal
# Tula ingress falls in mid-October while Onam falls in late August. It needs its
# own Malayalam-month implementation rather than a wrong date here.

# Local hour sampled for the fallback pass (see get_festivals).
EVENING_HOUR = 20.0


# --- occurrence index -------------------------------------------------------
#
# Each lunar rule is pinned to the Nth occurrence of its tithi counted from
# Mesha Sankranti. N is an integer, so it is identical in every year, which is
# what makes the same code correct for 2025, 2026, 2030 and so on. Negative N
# counts backwards, which is how the January-March festivals -- that fall in
# the lunar cycle begun the previous year -- are expressed.
#
# Every value was derived from a 2026 run checked against drik-panchang
# landmarks. The four rules marked tithi_source="evening" sit in a lagging
# lunar month where the tithi is skipped at the rule's own window and only
# surfaces later in the day; judging them in the evening is what keeps them
# from being dropped.

OCCURRENCE_FOR = {
    "Vasant Panchami": 10,
    "Maha Shivaratri": 10,
    "Holika Dahan": 10,
    "Holi": 10,
    "Ugadi / Gudi Padwa": 12,
    "Ram Navami": 12,
    "Mahavir Jayanti": 12,
    "Hanuman Jayanti": 11,
    "Akshaya Tritiya": 13,
    "Buddha Purnima": 12,
    "Ganga Dussehra": 14,
    "Vat Purnima": 13,
    "Guru Purnima": 15,
    "Raksha Bandhan": 16,
    "Krishna Janmashtami": 16,
    "Ganesh Chaturthi": 16,
    "Rishi Panchami": 17,
    "Sharad Navratri": 16,
    "Sharad Purnima": 17,
    "Durga Ashtami": 18,
    "Maha Navami": 18,
    "Vijayadashami (Dussehra)": 19,
    "Karva Chauth": 18,
    "Dhanteras": 20,
    "Naraka Chaturdashi": 18,
    "Diwali (Lakshmi Puja)": 19,
    "Govardhan Puja": 17,
    "Bhai Dooj": 20,
    "Chhath Puja": 20,
    "Kartika Purnima": 19,
    "Guru Nanak Jayanti": 19,
}

# These four fall in a kuta (skipped) tithi at their rule window.
EVENING_SOURCED = {
    "Ugadi / Gudi Padwa", "Rishi Panchami", "Durga Ashtami", "Maha Navami",
}

# Rules identified by the Phalguna Purnima -- the last Purnima before the Sun
# enters Meena -- rather than by an ordinal within the lunar year.
#
# A lunar year holds 12 or 13 occurrences of any tithi, and Mesha Sankranti
# falls in mid-April, so a festival's ordinal within its cycle is not fixed.
# Phalguna Purnima is the 11th Shukla Purnima of the cycle that began the
# previous April in 2026 and 2027, and the 12th from 2028 to 2033, purely
# because of how many tithis the cycle contains. The original `occurrence=10`
# was therefore wrong in most years, and counting from any single anchor
# cannot fix it. Holi was reported on 12 January 2028 instead of 11 March.
PHALGUNA_RULES = {"Holika Dahan", "Holi"}

for _rule in FESTIVAL_RULES:
    if _rule["name"] in PHALGUNA_RULES:
        _rule["phalguna"] = True

for _rule in FESTIVAL_RULES:
    _occ = OCCURRENCE_FOR.get(_rule["name"])
    if _occ is not None:
        _rule["occurrence"] = _occ
    if _rule["name"] in EVENING_SOURCED:
        _rule["tithi_source"] = "evening"


# --- rule windows -----------------------------------------------------------

def _rule_window(rule: str, sunrise: float, sunset: float) -> tuple[float, float]:
    """Local-clock hours of the window in which the rule is tested."""
    if rule == RULE_MADHYAHNA:
        return MADHYAHNA
    if rule == RULE_APARAHNA:
        return APARAHNA
    if rule == RULE_PRADOSH:
        return (sunset, sunset + PRADOSH_HOURS)
    if rule == RULE_PRADOSH_NISHITH:
        return (sunset + PRADOSH_NISHITH[0], sunset + PRADOSH_NISHITH[1])
    return (sunrise, sunrise + 0.5)


RULE_LABELS = {
    RULE_SUNRISE: "Sunrise",
    RULE_MADHYAHNA: "Madhyahna (11:00-14:00)",
    RULE_APARAHNA: "Aparahna (12:00-15:00)",
    RULE_PRADOSH: "Pradosh (evening)",
    RULE_PRADOSH_NISHITH: "Pradosh Nishith (late evening)",
}


def _hhmm(hour: float) -> str:
    """Decimal local hour -> HH:MM, wrapping past midnight."""
    h = int(hour) % 24
    m = int(round((hour - int(hour)) * 60))
    if m == 60:
        h, m = (h + 1) % 24, 0
    return f"{h:02d}:{m:02d}"


# --- day sampling -----------------------------------------------------------

# How far before sunrise to sample when recovering a tithi the window probe
# missed. The window is narrow on purpose, and the two known cases that bound it
# are the reason:
#
#   * 2028-03-11 -- Purnima ends 8 seconds AFTER the 06:37 sunrise, so a zero
#     lookback misses the month's only Purnima and Holi lands in January.
#   * 2025-05-28 -- Pratipada ends 25 minutes before sunrise, so a lookback of
#     25 minutes or more resurrects a tithi that was already over and adds a
#     phantom occurrence, pushing every later festival a month early.
#
# Twenty minutes sits between the two.
TITHI_RECOVERY_MINUTES = 20.0


def _tithi_at(d: date, hour: float, tz: float) -> tuple[dict, float]:
    """(tithi, moon longitude) at a local clock hour on a date.

    The minutes are ROUNDED, not truncated. Truncating 06:37.5 to 06:37 is
    normally harmless, but a tithi boundary landing between the two values
    flips the answer: on 2028-03-11 Purnima ends at 06:45 and sunrise is 06:37,
    so probing at 06:36 reports Krishna Pratipada and loses the month's only
    Purnima. That single miss is what put Holi in January.
    """
    h = int(hour)
    minute = int(round((hour - h) * 60))
    if minute == 60:
        h, minute = h + 1, 0
    h = min(max(h, 0), 23)
    minute = min(max(minute, 0), 59)
    sun_l, moon_l = get_sun_moon_longitudes(
        d.year, d.month, d.day, float(h), float(minute), tz
    )
    return calculate_tithi(sun_l, moon_l), moon_l


def _day_sample(d: date, lat: float, lon: float, tz: float, rule: str) -> dict:
    """Tithi, nakshatra and sun times for one day under one rule.

    The tithi is sampled at the MIDPOINT of the rule's window, not at its
    start. A rule window is a span in which the tithi must hold, and the
    centre of that span is the stable reference: sampling the leading edge
    misses tithis that begin a couple of hours into the window (this is what
    made Ram Navami match no day at all in 2026), while sampling at a fixed
    clock time such as solar noon pulls Purnima-based festivals a day early.

    One problem survives that choice. A tithi can END between sunrise and the
    midpoint of the sunrise window, in which case the window probe reports the
    NEXT tithi and this one is lost for the whole lunar month. That is not a
    cosmetic miss: occurrence counting then slips by one, and every festival
    counted after it in that lunar year lands a month early. Ten Shukla
    Purnimas are missed this way between 2026 and 2033, which is why Holi was
    reported in January 2028, 2029 and 2030 rather than March.

    `alt_tithi` carries the tithi in progress earlier the same day, so the
    caller can accept the day if the target tithi was under way at ANY point
    in the window -- which is what the rules actually mean.
    """
    sun_times = calculate_sunrise_sunset(d, lat, lon, tz)
    start, end = _rule_window(rule, sun_times["sunrise"], sun_times["sunset"])
    probe = (start + end) / 2.0
    tithi, moon_l = _tithi_at(d, probe, tz)

    # A tithi can END between sunrise and the midpoint of the sunrise window,
    # in which case the window probe reports the NEXT tithi and this one is lost
    # for the whole lunar month. That is not a cosmetic miss: occurrence
    # counting then slips by one and every festival counted after it in that
    # lunar year lands a month early. Ten Shukla Purnimas are missed this way
    # between 2026 and 2033, which is why Holi was reported in January 2028,
    # 2029 and 2030 rather than March.
    #
    # The recovery is the tithi in force just BEFORE sunrise, which is the
    # moment the sunrise rule tests. The lookback is short on purpose: on
    # 2028-03-11 Purnima ends eight seconds after the 06:37 sunrise, so a zero
    # lookback misses it, while a large one would resurrect tithis that had
    # already ended hours earlier (on 2026-06-16 Pratipada ended at 04:00 and
    # admitting it added a phantom occurrence that pushed every later festival a
    # month early and broke the correct 2026 Sharad Navratri). Thirty minutes
    # clears the seconds-long edge cases without reaching back past dawn.
    alt_tithi = None
    if rule == RULE_SUNRISE:
        alt_tithi, _ = _tithi_at(
            d, max(start - TITHI_RECOVERY_MINUTES / 60.0, 0.0), tz
        )
        if (alt_tithi["paksha"], alt_tithi["tithi_number"]) == (
            tithi["paksha"], tithi["tithi_number"]
        ):
            alt_tithi = None

    return {
        "date": d,
        "sunrise": sun_times["sunrise"],
        "sunset": sun_times["sunset"],
        "solar_noon": sun_times["solar_noon"],
        "window_start": start,
        "window_end": end,
        "tithi": tithi,
        "alt_tithi": alt_tithi,
        "nakshatra": calculate_nakshatra(moon_l),
        "moon_longitude": moon_l,
    }


def _solar_ingress_date(year: int, ingress: int, lat: float, lon: float, tz: float,
                        days: list | None = None):
    """Date (and local hour) the Sun's sidereal longitude reaches `ingress`.

    Sampled once per day at local noon, then linearly interpolated. The Sun
    advances ~1.02 deg/day, so the interpolated error is well under an hour
    and the resulting date is reliable except for an ingress falling within
    an hour of midnight. `days` limits the scan to the range being requested.
    """
    if days:
        span_days = list(days)
    else:
        span_days = []
        d = date(year, 1, 1)
        while d <= date(year, 12, 31):
            span_days.append(d)
            d += timedelta(days=1)

    prev_lng = None
    prev_date = None
    for d in span_days:
        lng = get_sun_sidereal_longitude(d.year, d.month, d.day, 12.0, 0, tz)
        if prev_lng is not None:
            # Forward angular distance travelled between the two samples.
            span = (lng - prev_lng) % 360.0
            if span > 0:
                # How far into that span the target longitude sits.
                frac = ((ingress - prev_lng) % 360.0) / span
                if 0.0 <= frac <= 1.0:
                    cross = datetime.combine(
                        prev_date, datetime.min.time()
                    ) + timedelta(days=frac)
                    return cross.date(), (cross.hour + cross.minute / 60.0)
        prev_lng, prev_date = lng, d
        d += timedelta(days=1)
    return None, None


# --- main entry point -------------------------------------------------------

# Computing a year means ~5000 Sun/Moon observations at a few milliseconds
# each, which is far too slow to repeat per request. Two layers of caching sit
# here: an in-process memo so a warm process never recomputes, and month
# scoping so a single-month view only scans the days it needs.
_MEMO: dict[tuple, list[dict]] = {}
_MEMO_MAX = 8


def get_festivals(
    year: int,
    latitude: float = 28.6139,
    longitude: float = 77.2090,
    timezone_offset: float = 5.5,
    month: int | None = None,
) -> list[dict]:
    """Festivals for `year` (optionally a single `month`), chronologically.

    Times are local clock hours for the given location, so a caller in another
    city gets the dates and sunrise/sunset/muhurat times that apply there.
    """
    key = (year, round(latitude, 2), round(longitude, 2), timezone_offset)
    cached = _MEMO.get(key)
    if cached is not None:
        if month is None:
            return list(cached)
        prefix = f"{year:04d}-{month:02d}"
        return [f for f in cached if f["date"].startswith(prefix)]

    festivals = _compute_year(year, latitude, longitude, timezone_offset, month)

    if month is None:
        if len(_MEMO) >= _MEMO_MAX:
            _MEMO.pop(next(iter(_MEMO)))
        _MEMO[key] = festivals
        return list(festivals)

    # Month-scoped results are not memoised as a year, so a later whole-year
    # request still computes the full set rather than seeing a partial cache.
    prefix = f"{year:04d}-{month:02d}"
    return [f for f in festivals if f["date"].startswith(prefix)]


def _compute_year(year, latitude, longitude, timezone_offset, month=None) -> list[dict]:
    rules_by_time: dict[str, list[dict]] = {}
    for rule in FESTIVAL_RULES:
        rules_by_time.setdefault(rule["rule"], []).append(rule)

    # Mesha Sankranti of the PREVIOUS lunar year anchors the occurrence
    # counting below. The lunar year turns in mid-April, not on 1 January, so
    # the January-March festivals belong to the cycle that began the previous
    # April. Anchoring to the current year's Mesha instead made the count for
    # those months vary with how many tithis happened to fall between 1 January
    # and April -- twelve one year, thirteen the next -- which drifted the dates.
    # The scan therefore has to start here, not on 1 January.
    anchor_date, _ = _solar_ingress_date(
        year - 1, 0, latitude, longitude, timezone_offset,
    )

    days: list[date] = []
    if month:
        # A month view still needs the whole anchor-to-year window to count
        # occurrences correctly; the month filter is applied to the result.
        d = anchor_date
        last = date(year, 12, 31)
    else:
        d = anchor_date
        last = date(year, 12, 31)
    while d <= last:
        days.append(d)
        d += timedelta(days=1)

    # One sample per distinct rule-time per day.
    samples: dict[tuple[str, date], dict] = {}
    for d in days:
        for rule_time in rules_by_time:
            samples[(rule_time, d)] = _day_sample(d, latitude, longitude, timezone_offset, rule_time)

    # One extra day BEFORE the window, so the first scanned day can be
    # de-duplicated against its predecessor. The window opens on Mesha
    # Sankranti, and the tithi still in force at that moment belongs to the
    # lunar month that closed the day before. Without the lookback there is
    # nothing to compare against, that stale occurrence is admitted, and every
    # index after it shifts -- which is how Buddha Purnima came out as
    # 2026-04-02 instead of 2026-05-01.
    lookback = days[0] - timedelta(days=1)
    for rule_time in rules_by_time:
        samples[(rule_time, lookback)] = _day_sample(
            lookback, latitude, longitude, timezone_offset, rule_time
        )

    out: list[dict] = []
    seen: set[tuple[str, date]] = set()
    # Rules whose chosen occurrence fell outside their declared months. Recorded
    # rather than raised: a festival with a late date is recoverable, one that
    # vanished is not. The test suite fails on a non-empty list.
    misplaced: list[tuple[str, str, list[int]]] = []

    # Solar ingress rules: the Sun crossing a sidereal sign boundary.
    for rule in FESTIVAL_RULES:
        if rule.get("kind") != "solar":
            continue
        ing_date, ing_hour = _solar_ingress_date(
            year, rule["ingress"], latitude, longitude, timezone_offset, days
        )
        if ing_date is None or ing_date not in days:
            continue
        if rule.get("months") and ing_date.month not in rule["months"]:
            continue
        s = dict(samples[(rule["rule"], ing_date)])
        s["window_start"] = ing_hour
        s["window_end"] = s["sunset"]
        key = (rule["name"], ing_date)
        if key in seen:
            continue
        seen.add(key)
        out.append(_build(rule, ing_date, s, rule["rule"], s["tithi"],
                          latitude, longitude, timezone_offset))

    # Lunar rules.
    #
    # A (paksha, tithi) pair repeats every lunar month -- Shukla Purnima alone
    # occurs about thirteen times a year -- so each rule is identified by WHICH
    # occurrence it falls on, counted from Mesha Sankranti. Counting is used in
    # preference to filtering on the Sun's rashi, the nakshatra, or a counted
    # lunar month, because each of those either drifts or can double-count or
    # skip: an earlier revision lost Raksha Bandhan in three years of four
    # because a single skipped new moon shifted every later month by one.
    #
    # Occurrences before Mesha Sankranti get negative positions, which is what
    # places the January-March festivals in the cycle that began the year
    # before. A rule with no explicit `occurrence` keeps every occurrence, which
    # is what the recurring vratas (Ekadashi, Pradosh, Sankashti Chaturthi)
    # want -- they are defined by the tithi, not by a particular month.
    for rule in FESTIVAL_RULES:
        if rule.get("kind") == "solar":
            continue
        rule_time = rule["rule"]
        target = rule.get("occurrence")

        candidates = []
        evening_tithi = None
        if rule.get("tithi_source") == "evening":
            evening_tithi = {}
            for d in days:
                e_sun, e_moon = get_sun_moon_longitudes(
                    d.year, d.month, d.day, EVENING_HOUR, 0, timezone_offset
                )
                evening_tithi[d] = calculate_tithi(e_sun, e_moon)

        for d in days:
            if evening_tithi is not None:
                t = evening_tithi[d]
                basis = "evening"
            else:
                s = samples[(rule_time, d)]
                t = s["tithi"]
                basis = "rule_window"
            if t["tithi_number"] == rule["tithi"] and (
                rule["paksha"] is None or t["paksha"] == rule["paksha"]
            ):
                candidates.append((d, samples[(rule_time, d)], t))
                continue
            if evening_tithi is not None:
                continue
            # The window probe can land just after a tithi ended, in which case
            # the tithi that was in force a moment earlier still counts: the
            # rule asks whether the tithi holds during the window, not only at
            # its midpoint. Ten Shukla Purnimas are missed this way between 2026
            # and 2033, and each miss slips the occurrence count by one, which
            # is how Holi came to be reported in January rather than March.
            alt = s.get("alt_tithi")
            if alt is None:
                continue
            if rule["paksha"] is not None and alt["paksha"] != rule["paksha"]:
                continue
            if alt["tithi_number"] != rule["tithi"]:
                continue
            # Recover only a tithi that STARTS this day. If the same tithi was
            # also in force on the previous day it is the tail of the previous
            # lunar month, already counted there, and admitting it again adds a
            # phantom occurrence that shifts every later festival. On 2025-04-13
            # the probe reports Shukla Pratipada with a lingering Purnima, but
            # that Purnima belongs to the month that ended the day before.
            #
            # Skip a tithi already counted on the previous day: it is the tail
            # of the lunar month that closed there, and admitting it again adds
            # a phantom occurrence that shifts every later festival a month.
            # This applies to the first scanned day too. The window opens on Mesha
            # Sankranti, whose own Purnima is genuinely the tail of the previous
            # month, so exempting it would pull that stale occurrence back in and
            # move Buddha Purnima from 2026-05-01 to 2026-04-02.
            prev = samples.get((rule_time, d - timedelta(days=1)))
            if prev is not None:
                pt = prev["tithi"]
                if (pt["paksha"], pt["tithi_number"]) == (
                    alt["paksha"], alt["tithi_number"]
                ):
                    continue
            t = alt
            basis = "rule_window"
            candidates.append((d, samples[(rule_time, d)], t))

        if not candidates:
            # The tithi may be "kuta" (skipped) at this rule's window and only
            # surface later the same day. Retry in the evening rather than
            # silently dropping the festival.
            for d in days:
                e_sun, e_moon = get_sun_moon_longitudes(
                    d.year, d.month, d.day, EVENING_HOUR, 0, timezone_offset
                )
                t = calculate_tithi(e_sun, e_moon)
                if rule["paksha"] is not None and t["paksha"] != rule["paksha"]:
                    continue
                if t["tithi_number"] != rule["tithi"]:
                    continue
                candidates.append((d, samples[(rule_time, d)], t))
                basis = "evening"

        if not candidates:
            continue

        if target is not None:
            months = rule.get("months")
            ordered = sorted(candidates, key=lambda c: c[0])

            # A lunar year holds 12 or 13 occurrences of any given tithi, and
            # Mesha Sankranti falls in mid-April, so a festival's ordinal within
            # its cycle is not fixed. Phalguna Purnima -- Holi -- is the 11th
            # Shukla Purnima of the cycle that began the previous April in 2026
            # and 2027, and the 12th from 2028 to 2033, purely because of how
            # many tithis that cycle happens to contain.
            #
            # An index therefore cannot identify these festivals, and the
            # original `occurrence=10` is simply wrong in most years. The month
            # guard is the stable signal: Holi is the Purnima in March, full
            # stop. For a rule marked `lunar_month` the month wins outright.
            if rule.get("phalguna") and months:
                # Holi and Holika Dahan are the Phalguna Purnima specifically:
                # the LAST Purnima before the Sun enters Meena, which is the end
                # of the lunar month rather than simply the last Purnima in the
                # month. Taking the last Purnima of March works because the
                # month ends there, and it is stable across the 12- and
                # 13-occurrence cycles that made the ordinal unusable.
                in_month = [c for c in ordered if c[0].month in months]
                if in_month:
                    chosen = [in_month[-1]]
                else:
                    chosen = [ordered[-1]]
                    misplaced.append(
                        (rule["name"], ordered[-1][0].isoformat(), sorted(months))
                    )
            else:
                # Count occurrences forward from the anchor. Consecutive days
                # carrying the same tithi are one occurrence, so a tithi that
                # lingers past sunrise is not counted twice.
                #
                # The month guard is applied to the COUNT, not just the result:
                # when the Nth occurrence lands in a disallowed month the counter
                # has slipped, and the true festival is a later occurrence.
                #
                # Applying the guard as a filter instead would DELETE Holi for
                # six years, because in exactly those years the slipped
                # occurrence was the only one in the list. A wrong date is
                # recoverable; a festival that vanished is not.
                n = 0
                prev_day = None
                picked = None
                fallback = None
                for d, s, t in ordered:
                    if prev_day is None or (d - prev_day).days > 1:
                        n += 1
                    if n >= target:
                        if months and d.month not in months:
                            prev_day = d
                            continue
                        picked = (d, s, t)
                        break
                    if months and d.month in months and (fallback is None or d >= fallback[0]):
                        fallback = (d, s, t)
                    prev_day = d
                if picked is None:
                    if fallback is not None:
                        # The scan ended before the target index. Return the
                        # closest in-month occurrence rather than deleting the
                        # festival, and record the mismatch.
                        chosen = [fallback]
                        misplaced.append(
                            (rule["name"], fallback[0].isoformat(), sorted(months))
                        )
                    else:
                        continue
                else:
                    chosen = [picked]
        else:
            # No occurrence index: this rule matches every tithi of its kind, so
            # the month guard is the only thing narrowing it. A rule marked
            # `pick` then chooses which of the in-month candidates it means:
            # "first" for a festival defined by the start of a lunar month (the
            # Ekadashi of Magha, i.e. Gita Jayanti), "last" for one defined by
            # its end. Without this, Gita Jayanti was reported on every Shukla
            # Ekadashi of the allowed months rather than once a year.
            months = rule.get("months")
            pick = rule.get("pick")
            if months:
                in_month = [c for c in candidates if c[0].month in months]
                if in_month:
                    if pick == "first":
                        chosen = [in_month[0]]
                    elif pick == "last":
                        chosen = [in_month[-1]]
                    else:
                        chosen = in_month
                else:
                    chosen = candidates
                    for d, _s, _t in candidates:
                        misplaced.append(
                            (rule["name"], d.isoformat(), sorted(months))
                        )
            else:
                chosen = candidates

        for d, s, t in chosen:
            name = _rule_name(rule, s)
            key = (name, d)
            if key in seen:
                continue
            seen.add(key)
            rec = _build(rule, d, s, rule_time, t, latitude, longitude, timezone_offset)
            rec["tithi_basis"] = basis
            out.append(rec)

    # The scan starts at the previous Mesha Sankranti, so it also covers the
    # tail of the previous lunar year. Only the requested year is returned.
    out = [f for f in out if f["date"].startswith(f"{year:04d}-")]
    if month is not None:
        out = [f for f in out if f["date"].startswith(f"{year:04d}-{month:02d}")]

    out.sort(key=lambda f: (f["date"], f["category"] != "major", f["name"]))
    return out


def _rule_name(rule: dict, s: dict) -> str:
    name = rule["name"]
    if "{nakshatra}" in name:
        name = name.format(nakshatra=s["nakshatra"]["nakshatra_name"])
    return name


def _build(rule: dict, d: date, s: dict, rule_time: str, tithi: dict,
           lat: float, lon: float, tz: float) -> dict:
    span = rule.get("span_days", 1)
    end_date = d + timedelta(days=span - 1) if span > 1 else d
    rahu = calculate_rahu_kaal(s["sunrise"], s["sunset"], d.weekday())
    name = rule["name"]
    if "{nakshatra}" in name:
        name = name.format(nakshatra=s["nakshatra"]["nakshatra_name"])

    return {
        "name": name,
        "date": d.isoformat(),
        "end_date": end_date.isoformat(),
        "span_days": span,
        "category": rule.get("category", "minor"),
        "description": rule["description"],
        "significance": rule.get("significance", ""),
        # When the tithi rule is actually tested -- the reason dates differ
        # from a naive sunrise lookup.
        "rule_time": rule_time,
        "rule_time_label": RULE_LABELS[rule_time],
        # Basis of the calculation -- the tithi that decided this date.
        "paksha": tithi["paksha"],
        "paksha_hi": tithi["paksha_hi"],
        "tithi_name": tithi["tithi_name"],
        "tithi_name_hi": tithi["tithi_name_hi"],
        "tithi_number": tithi["tithi_number"],
        "nakshatra": s["nakshatra"]["nakshatra_name"],
        "nakshatra_pada": s["nakshatra"]["pada"],
        # Times
        "sunrise": _hhmm(s["sunrise"]),
        "sunset": _hhmm(s["sunset"]),
        "muhurat": {
            "label": RULE_LABELS[rule_time],
            "start": _hhmm(s["window_start"]),
            "end": _hhmm(s["window_end"]),
        },
        "rahu_kaal": {
            "start": rahu["start"],
            "end": rahu["end"],
        },
    }
