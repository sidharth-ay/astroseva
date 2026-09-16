"""AI Chat API endpoint for talking with AstroSeva AI."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging

from ..services.ai_service import configure_gemini, get_model_name, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000, description="Chat message")
    history: Optional[List[ChatMessage]] = Field(default=[], max_length=10)
    birth_details: Optional[dict] = None
    language: Optional[str] = "en"


# ---------------------------------------------------------------------------
# Chart computation from raw birth data
# ---------------------------------------------------------------------------

def compute_chat_birth_context(birth_details: dict) -> str:
    """Compute chart from birth details and return a concise summary for AI."""
    try:
        from ..core.planets import get_planetary_positions
        from ..core.houses import get_planets_in_houses
        from ..core.doshas import detect_all_doshas
        from ..core.rashis import RASHI_NAMES

        year = int(birth_details.get("birth_year", 0))
        month = int(birth_details.get("birth_month", 0))
        day = int(birth_details.get("birth_day", 0))
        hour = float(birth_details.get("birth_hour", 12))
        minute = float(birth_details.get("birth_minute", 0))
        tz = float(birth_details.get("timezone_offset", 5.5))
        name = birth_details.get("name", "User")

        if not all([year, month, day]):
            return ""

        result = get_planetary_positions(year, month, day, hour, minute, tz)
        planets = result["planets"]
        asc_sign = result["asc_sign"]

        # Compute houses
        planet_dicts = [{"planet": p["planet"], "longitude": p["longitude"], "sign": p["sign"]} for p in planets]
        houses = get_planets_in_houses(planet_dicts, result["ascendant"])

        # Assign house numbers to planets
        for p in planets:
            p["house"] = None
            for house_num, planet_list in houses.items():
                if p["planet"] in planet_list:
                    p["house"] = house_num
                    break

        # Find Moon sign
        moon_sign = 0
        for p in planets:
            if p["planet"] == "Moon":
                moon_sign = p["sign"]
                break

        # Build planet summary
        planet_lines = []
        for p in planets:
            retro = " (R)" if p.get("retrograde") else ""
            house = p.get("house", "?") if p.get("house") is not None else "?"
            planet_lines.append(f"{p['planet']}-{p['sign_name']} {p['sign_degree']:.1f} deg H{house}{retro}")

        # Detect doshas
        doshas = detect_all_doshas(planets, asc_sign, moon_sign)

        asc_name = RASHI_NAMES.get(asc_sign, {}).get("en", "Unknown")
        moon_name = RASHI_NAMES.get(moon_sign, {}).get("en", "Unknown")

        # Active doshas summary
        dosha_parts = []
        mang = doshas.get("manglik", {})
        if mang.get("is_manglik"):
            dosha_parts.append(f"Manglik ({mang.get('severity', 'Unknown')} - Mars in house {', '.join(str(d.get('house','')) for d in mang.get('positions', []))})")
        kaal = doshas.get("kaal_sarp", {})
        if kaal.get("has_dosha"):
            dosha_parts.append(f"Kaal Sarp (Rahu H{kaal.get('rahu_house')}, Ketu H{kaal.get('ketu_house')})")
        sade = doshas.get("sade_sati", {})
        if sade.get("is_active"):
            dosha_parts.append(f"Sade Sati ({sade.get('phase', 'Active')})")
        pitru = doshas.get("pitru_dosha", {})
        if pitru.get("has_dosha"):
            dosha_parts.append("Pitru Dosha")

        retro_planets = [p["planet"] for p in planets if p.get("retrograde")]

        context = f"""USER'S BIRTH CHART:
Name: {name}
Ascendant: {asc_name}
Moon Sign: {moon_name}
Planets: {', '.join(planet_lines)}
Retrograde: {', '.join(retro_planets) if retro_planets else 'None'}
Active Doshas: {'; '.join(dosha_parts) if dosha_parts else 'None detected'}
Total Doshas: {doshas.get('total_doshas', 0)}"""

        return context

    except Exception as e:
        logger.error(f"Chart computation error: {type(e).__name__}: {e}")
        return ""


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def detect_user_intent(message: str) -> str:
    """Classify user message intent."""
    msg = message.lower()

    if any(w in msg for w in ["generate kundli", "my kundli", "birth chart", "show my chart", "make my kundli", "create kundli"]):
        return "kundli"
    if any(w in msg for w in ["matching", "compatibility", "gun milan", "are we compatible", "marriage matching", "ashtakoot"]):
        return "matching"
    if any(w in msg for w in ["check my dosha", "do i have dosha", "manglik check", "kaal sarp check", "my doshas", "dosha analysis"]):
        return "dosha_check"
    if any(w in msg for w in ["horoscope", "today prediction", "daily prediction", "rashifal", "daily horoscope"]):
        return "horoscope"
    if any(w in msg for w in ["numerology", "life path number", "destiny number", "name number", "soul urge"]):
        return "numerology"

    personal_words = ["my ", "me ", "i ", "mine", "about me", "my chart", "my planet", "my house",
                      "my marriage", "my career", "my health", "my finance", "my love",
                      "will i", "when will", "how will", "am i", "is my"]
    if any(w in msg for w in personal_words):
        return "personal"

    return "general"


# ---------------------------------------------------------------------------
# Feature response handlers
# ---------------------------------------------------------------------------

def handle_kundli_intent(birth_details: dict) -> str:
    context = compute_chat_birth_context(birth_details)
    if not context:
        return "I'd love to generate your Kundli, but I need your birth details. Please visit /kundli to enter your birth date, time, and place, and your chart will be generated instantly!"
    name = birth_details.get("name", "friend")
    return f"Here's your Vedic birth chart summary, {name}:\n\n{context}\n\nWould you like me to analyze any specific aspect of your chart? I can explain what each planet's placement means for your career, marriage, health, or any other area of life. You can also visit /kundli for the complete visual chart."


def handle_matching_intent(birth_details: dict) -> str:
    return "Marriage matching (Ashtakoot Gun Milan) requires both partners' birth details — name, date, time, and place of birth.\n\nVisit /matching to enter both birth details and get a complete compatibility analysis with 8 koota scores out of 36 points, Nadi Dosha detection, and a personalized recommendation.\n\nWould you like to know what each koota means?"


def handle_dosha_check_intent(birth_details: dict) -> str:
    context = compute_chat_birth_context(birth_details)
    if not context:
        return "To check your doshas, I need your birth details. Please visit /kundli first to generate your chart."
    dosha_lines = [line for line in context.split('\n') if 'Dosha' in line or 'Manglik' in line or 'Kaal' in line or 'Sade' in line or 'Pitru' in line]
    dosha_summary = '\n'.join(dosha_lines) if dosha_lines else "No active doshas detected."
    name = birth_details.get("name", "friend")
    return f"Here's your dosha analysis, {name}:\n\n{dosha_summary}\n\nWant me to explain any of these doshas in detail? I can suggest specific remedies for any active doshas."


def handle_horoscope_intent() -> str:
    return "Visit /horoscope to see your daily horoscope with love, career, and health ratings, plus lucky numbers and colors. Which zodiac sign are you?"


def handle_numerology_intent(birth_details: dict) -> str:
    name = birth_details.get("name", "")
    if name:
        return f"To calculate your numerology numbers, I need your full birth name and birthdate. Visit /numerology to get your Life Path, Destiny, Soul Urge, and Personality numbers.\n\nI can see your name is {name} — enter it on the numerology page along with your birthdate for a complete analysis!"
    return "To calculate your numerology numbers, I need your full birth name and birthdate. Visit /numerology to get your Life Path, Destiny, Soul Urge, and Personality numbers."


# ---------------------------------------------------------------------------
# Build AI prompt
# ---------------------------------------------------------------------------

def build_chat_prompt(message: str, history: list, language: str = "en", birth_context: str = "") -> str:
    """Build a chat prompt for Gemini with chart context."""
    lang_instruction = "Respond in Hindi (Hindi me jawab dein, Hinglish chalegi)." if language == "hi" else "Respond in English."

    prompt = f"{SYSTEM_PROMPT}\n\n{lang_instruction}"

    if birth_context:
        prompt += f"\n\n{birth_context}"

    if history:
        prompt += "\n\nRecent conversation:"
        for msg in history[-3:]:
            role = msg.get("role", "user") if isinstance(msg, dict) else msg.role
            content = msg.get("content", "") if isinstance(msg, dict) else msg.content
            prompt += f"\n{role}: {content}"

    prompt += f"\n\nUser: {message}\nAstroSeva AI:"
    return prompt


# ---------------------------------------------------------------------------
# Generate response
# ---------------------------------------------------------------------------

def generate_chat_response(message: str, history: list, language: str = "en", birth_details: dict = None) -> str:
    """Generate a chat response with intent detection and feature handling."""
    intent = detect_user_intent(message)

    if intent == "kundli" and birth_details:
        return handle_kundli_intent(birth_details)
    if intent == "matching":
        return handle_matching_intent(birth_details)
    if intent == "dosha_check" and birth_details:
        return handle_dosha_check_intent(birth_details)
    if intent == "horoscope":
        return handle_horoscope_intent()
    if intent == "numerology":
        return handle_numerology_intent(birth_details)

    model = configure_gemini()
    birth_context = ""
    if birth_details:
        birth_context = compute_chat_birth_context(birth_details)

    if model is None:
        return generate_local_chat_response(message, birth_details, birth_context)

    prompt = build_chat_prompt(message, history, language, birth_context)

    try:
        from google.generativeai.types import GenerationConfig
        response = model.generate_content(
            prompt,
            generation_config=GenerationConfig(max_output_tokens=500, temperature=0.7)
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini error: {type(e).__name__}: {e}")
        return generate_local_chat_response(message, birth_details, birth_context)


# ---------------------------------------------------------------------------
# Local fallback (no AI) — real chart analysis
# ---------------------------------------------------------------------------

# Vedic sign-to-number mapping
SIGN_MAP = {
    "aries": 0, "taurus": 1, "gemini": 2, "cancer": 3, "leo": 4, "virgo": 5,
    "libra": 6, "scorpio": 7, "sagittarius": 8, "capricorn": 9, "aquarius": 10, "pisces": 11,
}

# Karakas (significators) for career, marriage, health, finance, love
CAREER_KARAKAS = {"Sun": "authority and leadership", "Mercury": "intellect, communication, and business",
                  "Saturn": "discipline, hard work, and service", "Jupiter": "wisdom, teaching, and expansion",
                  "Mars": "courage, engineering, and action", "Venus": "creativity, art, and luxury",
                  "Moon": "mind, public dealing, and nurturing"}
MARRIAGE_KARAKAS = {"Venus": "love, beauty, and partnership", "Jupiter": "wisdom and fortune in marriage",
                    "Moon": "emotions and mental compatibility", "Mercury": "communication and intellect"}
FINANCE_KARAKAS = {"Jupiter": "wealth and expansion", "Venus": "luxury and material comforts",
                   "Mercury": "business and trade", "Saturn": "earned wealth through hard work"}
HEALTH_KARAKAS = {"Mars": "energy and vitality", "Saturn": "chronic conditions and longevity",
                  "Moon": "mental health and emotions", "Sun": "overall vitality and soul"}
LOVE_KARAKAS = {"Venus": "romance and attraction", "Moon": "emotions and nurturing",
                "Mercury": "communication in relationships", "Mars": "passion and desire"}


def _parse_chart(context: str) -> dict:
    """Parse the birth_context string into structured chart data."""
    chart = {"name": "", "ascendant": "", "moon_sign": "", "planets": [], "doshas": ""}

    for line in context.split("\n"):
        line = line.strip()
        if line.startswith("Name:"):
            chart["name"] = line.split(":", 1)[1].strip()
        elif line.startswith("Ascendant:"):
            chart["ascendant"] = line.split(":", 1)[1].strip()
        elif line.startswith("Moon Sign:"):
            chart["moon_sign"] = line.split(":", 1)[1].strip()
        elif line.startswith("Planets:"):
            raw = line.split(":", 1)[1].strip()
            for p in raw.split(","):
                p = p.strip()
                if not p:
                    continue
                # e.g. "Sun-Cancer 28.1 deg H5" or "Rahu-Capricorn 5.5 deg H8 (R)"
                parts = p.split("-")
                planet_name = parts[0].strip()
                rest = parts[1].strip() if len(parts) > 1 else ""
                sign_name = rest.split()[0].strip() if rest else ""
                house = ""
                retro = "(R)" in p
                if "H" in rest:
                    h_part = rest.split("H")[-1].strip()
                    house = h_part.split()[0].strip() if h_part else ""
                chart["planets"].append({
                    "name": planet_name, "sign": sign_name, "house": house, "retrograde": retro
                })
        elif line.startswith("Active Doshas:"):
            chart["doshas"] = line.split(":", 1)[1].strip()

    return chart


def _sign_index(sign_name: str) -> int:
    return SIGN_MAP.get(sign_name.lower(), -1)


def _get_house_lords() -> dict:
    """Return house lord mapping for a given ascendant. Simplified: uses natural house lords."""
    return {
        1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury",
        7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter"
    }


def _find_planet(chart: dict, planet_name: str) -> dict:
    for p in chart["planets"]:
        if p["name"].lower() == planet_name.lower():
            return p
    return {}


def _planets_in_house(chart: dict, house_num: int) -> list:
    return [p["name"] for p in chart["planets"] if p["house"] == str(house_num)]


def _analyze_career(chart: dict) -> str:
    """Generate career analysis from chart."""
    name = chart["name"] or "friend"
    asc = chart["ascendant"].lower()
    asc_lord = _find_planet(chart, {"aries": "Mars", "taurus": "Venus", "gemini": "Mercury",
        "cancer": "Moon", "leo": "Sun", "virgo": "Mercury", "libra": "Venus",
        "scorpio": "Mars", "sagittarius": "Jupiter", "capricorn": "Saturn",
        "aquarius": "Saturn", "pisces": "Jupiter"}.get(asc, ""))

    tenth_lord = _find_planet(chart, "Saturn")  # Natural 10th lord
    tenth_planets = _planets_in_house(chart, 10)
    sun = _find_planet(chart, "Sun")
    mercury = _find_planet(chart, "Mercury")
    saturn = _find_planet(chart, "Saturn")
    jupiter = _find_planet(chart, "Jupiter")
    mars = _find_planet(chart, "Mars")

    lines = [f"Here's your career analysis, {name}:\n"]

    # 10th house analysis
    if tenth_planets:
        planet_str = ", ".join(tenth_planets)
        lines.append(f"Planets in your 10th house (career house): {planet_str}.")
        for p_name in tenth_planets:
            karaka = CAREER_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 10th house strengthens {karaka} in your career.")
    else:
        lines.append("No planets occupy your 10th house, so career success depends heavily on the 10th lord's placement and aspects.")

    # Sun analysis (authority)
    if sun:
        sun_house = sun.get("house", "")
        if sun_house:
            lines.append(f"Sun in house {sun_house} gives you natural authority and leadership abilities. You thrive in roles that require independence and decision-making.")
        else:
            lines.append("Sun's placement suggests you have strong leadership potential. You may be drawn to positions of authority.")

    # Mercury analysis (intellect/business)
    if mercury:
        merc_house = mercury.get("house", "")
        if merc_house in ["2", "3", "5", "6", "10", "11"]:
            lines.append(f"Mercury in house {merc_house} favors careers in communication, business, analysis, or technology.")
        elif merc_house:
            lines.append(f"Mercury in house {merc_house} gives you sharp analytical skills — good for consulting, writing, or problem-solving roles.")

    # Saturn analysis (discipline/career)
    if saturn:
        sat_house = saturn.get("house", "")
        retro = " (retrograde)" if saturn.get("retrograde") else ""
        if sat_house in ["6", "10", "11"]:
            lines.append(f"Saturn in house {sat_house}{retro} is strong for career. You achieve success through persistence and hard work, often later in life.")
        elif sat_house:
            lines.append(f"Saturn in house {sat_house}{retro} teaches patience and discipline. Career growth may be slow but steady and lasting.")

    # Jupiter analysis (growth/wisdom)
    if jupiter:
        jup_house = jupiter.get("house", "")
        if jup_house in ["2", "5", "9", "11"]:
            lines.append(f"Jupiter in house {jup_house} blesses you with wisdom and good fortune. Careers in education, counseling, finance, or advisory roles suit you well.")

    # Mars analysis (action/engineering)
    if mars:
        mars_house = mars.get("house", "")
        retro = " (retrograde)" if mars.get("retrograde") else ""
        if mars_house in ["3", "6", "10", "11"]:
            lines.append(f"Mars in house {mars_house}{retro} gives you drive and competitive energy. You excel in engineering, sports, defense, or entrepreneurial ventures.")

    # Overall
    lines.append(f"\nWith {chart['ascendant']} as your ascendant, you are naturally suited for roles that align with Venus's creative and harmonious energy. Your Moon in {chart['moon_sign']} gives you emotional intelligence in professional settings.")
    lines.append("\nWant me to analyze a specific career field, or shall I check your marriage prospects? You can also visit /predictions for a detailed AI-powered career reading.")

    return "\n".join(lines)


def _analyze_marriage(chart: dict) -> str:
    """Generate marriage analysis from chart."""
    name = chart["name"] or "friend"
    seventh_planets = _planets_in_house(chart, 7)
    venus = _find_planet(chart, "Venus")
    jupiter = _find_planet(chart, "Jupiter")
    moon = _find_planet(chart, "Moon")

    lines = [f"Here's your marriage analysis, {name}:\n"]

    # 7th house
    if seventh_planets:
        planet_str = ", ".join(seventh_planets)
        lines.append(f"Planets in your 7th house (marriage house): {planet_str}.")
        for p_name in seventh_planets:
            karaka = MARRIAGE_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 7th house brings {karaka} to your married life.")
    else:
        lines.append("No planets in your 7th house. The 7th lord's placement and aspects will determine marriage timing and quality.")

    # Venus (primary marriage karaka)
    if venus:
        v_house = venus.get("house", "")
        retro = " (retrograde)" if venus.get("retrograde") else ""
        if v_house in ["4", "7", "12"]:
            lines.append(f"Venus in house {v_house}{retro} is excellent for marriage. You attract a loving, beautiful, and supportive partner.")
        elif v_house:
            lines.append(f"Venus in house {v_house}{retro} gives you romantic nature. You value harmony and beauty in relationships.")

    # Jupiter
    if jupiter:
        j_house = jupiter.get("house", "")
        if j_house in ["2", "5", "7", "9", "11"]:
            lines.append(f"Jupiter in house {j_house} blesses your marriage with wisdom, fortune, and family happiness.")

    # Moon (emotional compatibility)
    if moon:
        m_house = moon.get("house", "")
        if m_house:
            lines.append(f"Moon in house {m_house} makes you emotionally sensitive and nurturing in relationships. You need emotional security from your partner.")

    # Doshas
    dosha_text = chart["doshas"]
    if "Manglik" in dosha_text:
        lines.append("\nYou have Manglik Dosha, which can cause initial delays or challenges in marriage. Remedies include chanting Hanuman Chalisa and wearing coral (after consulting an astrologer).")
    if "Kaal Sarp" in dosha_text:
        lines.append("\nKaal Sarp Dosha may cause delays in marriage. Worshipping Lord Shiva and visiting temples on Mondays can help.")

    lines.append(f"\nYour {chart['ascendant']} ascendant gives you a {chart['moon_sign']}-Moon emotional nature in relationships. For a detailed compatibility analysis with a partner, visit /matching.")
    lines.append("\nWant me to check your doshas or career prospects? I'm here to help!")

    return "\n".join(lines)


def _analyze_health(chart: dict) -> str:
    """Generate health analysis from chart."""
    name = chart["name"] or "friend"
    mars = _find_planet(chart, "Mars")
    saturn = _find_planet(chart, "Saturn")
    moon = _find_planet(chart, "Moon")
    sun = _find_planet(chart, "Sun")
    sixth_planets = _planets_in_house(chart, 6)
    eighth_planets = _planets_in_house(chart, 8)
    twelfth_planets = _planets_in_house(chart, 12)

    lines = [f"Here's your health analysis, {name}:\n"]

    # 6th house (disease)
    if sixth_planets:
        lines.append(f"Planets in your 6th house (disease house): {', '.join(sixth_planets)}.")
        for p_name in sixth_planets:
            karaka = HEALTH_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 6th house may indicate health challenges related to {karaka}.")

    # Mars (vitality)
    if mars:
        m_house = mars.get("house", "")
        retro = " (retrograde)" if mars.get("retrograde") else ""
        if m_house in ["1", "6", "8", "12"]:
            lines.append(f"Mars in house {m_house}{retro} can cause inflammatory conditions, accidents, or blood-related issues. Regular exercise helps channel this energy.")
        elif m_house:
            lines.append(f"Mars in house {m_house}{retro} gives you good physical energy. Stay active to maintain vitality.")

    # Saturn (chronic conditions)
    if saturn:
        s_house = saturn.get("house", "")
        retro = " (retrograde)" if saturn.get("retrograde") else ""
        if s_house in ["1", "6", "8", "12"]:
            lines.append(f"Saturn in house {s_house}{retro} may bring chronic health issues or joint/bone problems. Regular check-ups and a disciplined routine are important.")
        elif s_house:
            lines.append(f"Saturn in house {s_house}{retro} generally gives good longevity. Maintain a healthy lifestyle to benefit from Saturn's protective influence.")

    # Moon (mental health)
    if moon:
        m_house = moon.get("house", "")
        if m_house in ["6", "8", "12"]:
            lines.append(f"Moon in house {m_house} may cause emotional stress, anxiety, or sleep issues. Meditation and emotional self-care are essential.")
        elif m_house:
            lines.append(f"Moon in house {m_house} gives you emotional stability. Your {chart['moon_sign']} Moon helps you handle stress well.")

    # Sun (vitality)
    if sun:
        s_house = sun.get("house", "")
        if s_house in ["6", "8", "12"]:
            lines.append(f"Sun in house {s_house} may indicate eye or bone-related health concerns. Regular check-ups recommended.")
        elif s_house:
            lines.append(f"Sun in house {s_house} blesses you with good overall vitality and strong immune system.")

    # 8th house
    if eighth_planets:
        lines.append(f"Planets in your 8th house: {', '.join(eighth_planets)}. This house relates to sudden events and chronic conditions. Stay cautious with health.")

    # General advice
    lines.append(f"\nAs a {chart['ascendant']} ascendant, pay attention to the body parts governed by this sign. A balanced diet, regular exercise, and adequate sleep are your best health allies.")
    lines.append("\nWant me to analyze specific health concerns or check your doshas? For detailed health predictions, visit /predictions.")

    return "\n".join(lines)


def _analyze_finance(chart: dict) -> str:
    """Generate financial analysis from chart."""
    name = chart["name"] or "friend"
    jupiter = _find_planet(chart, "Jupiter")
    venus = _find_planet(chart, "Venus")
    mercury = _find_planet(chart, "Mercury")
    saturn = _find_planet(chart, "Saturn")
    second_planets = _planets_in_house(chart, 2)
    eleventh_planets = _planets_in_house(chart, 11)
    ninth_planets = _planets_in_house(chart, 9)

    lines = [f"Here's your financial analysis, {name}:\n"]

    # 2nd house (accumulated wealth)
    if second_planets:
        lines.append(f"Planets in your 2nd house (wealth house): {', '.join(second_planets)}.")
        for p_name in second_planets:
            karaka = FINANCE_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 2nd house enhances {karaka} in your financial life.")

    # 11th house (income/gains)
    if eleventh_planets:
        lines.append(f"Planets in your 11th house (income house): {', '.join(eleventh_planets)}. This is excellent for financial gains.")
        for p_name in eleventh_planets:
            karaka = FINANCE_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 11th house brings {karaka} through income and gains.")

    # Jupiter (wealth/expansion)
    if jupiter:
        j_house = jupiter.get("house", "")
        if j_house in ["2", "5", "9", "11"]:
            lines.append(f"Jupiter in house {j_house} is a strong wealth indicator. You attract abundance through wisdom, teaching, advisory roles, or investments.")
        elif j_house:
            lines.append(f"Jupiter in house {j_house} gives you good financial luck. Trust your instincts with money matters.")

    # Venus (luxury)
    if venus:
        v_house = venus.get("house", "")
        if v_house in ["2", "4", "7", "11"]:
            lines.append(f"Venus in house {v_house} blesses you with material comforts and luxury. You enjoy a good standard of living.")
        elif v_house:
            lines.append(f"Venus in house {v_house} gives you appreciation for beauty and comfort. You may earn through creative fields.")

    # Mercury (business)
    if mercury:
        m_house = mercury.get("house", "")
        if m_house in ["2", "5", "6", "10", "11"]:
            lines.append(f"Mercury in house {m_house} favors business, trade, and intellectual pursuits. You have a sharp mind for financial matters.")

    # Saturn (earned wealth)
    if saturn:
        s_house = saturn.get("house", "")
        retro = " (retrograde)" if saturn.get("retrograde") else ""
        if s_house in ["2", "6", "10", "11"]:
            lines.append(f"Saturn in house {s_house}{retro} ensures steady financial growth through hard work. Your wealth builds gradually but securely.")
        elif s_house:
            lines.append(f"Saturn in house {s_house}{retro} teaches financial discipline. Avoid shortcuts; your wealth comes through persistence.")

    # 9th house (fortune)
    if ninth_planets:
        lines.append(f"Planets in your 9th house: {', '.join(ninth_planets)}. This house represents fortune and blessings from above.")

    lines.append(f"\nYour {chart['ascendant']} ascendant gives you a natural approach to finances that aligns with Venus's energy. For detailed financial predictions, visit /predictions.")
    lines.append("\nWant me to check your career prospects or doshas? I'm here to help!")

    return "\n".join(lines)


def _analyze_love(chart: dict) -> str:
    """Generate love/romance analysis from chart."""
    name = chart["name"] or "friend"
    venus = _find_planet(chart, "Venus")
    mars = _find_planet(chart, "Mars")
    moon = _find_planet(chart, "Moon")
    mercury = _find_planet(chart, "Mercury")
    fifth_planets = _planets_in_house(chart, 5)
    seventh_planets = _planets_in_house(chart, 7)

    lines = [f"Here's your love analysis, {name}:\n"]

    # Venus (primary love planet)
    if venus:
        v_house = venus.get("house", "")
        retro = " (retrograde)" if venus.get("retrograde") else ""
        if v_house in ["4", "5", "7", "11"]:
            lines.append(f"Venus in house {v_house}{retro} is excellent for love and romance. You are charming, attractive, and naturally draw romantic interest.")
        elif v_house:
            lines.append(f"Venus in house {v_house}{retro} gives you a romantic nature. You value beauty and harmony in love.")
        v_sign = venus.get("sign", "")
        if v_sign:
            lines.append(f"  Venus in {v_sign} shapes your love style — you express affection in ways that align with this sign's energy.")

    # Mars (passion/desire)
    if mars:
        m_house = mars.get("house", "")
        retro = " (retrograde)" if mars.get("retrograde") else ""
        if m_house in ["1", "5", "7", "8"]:
            lines.append(f"Mars in house {m_house}{retro} gives you passionate and intense romantic energy. You are assertive in love and enjoy the thrill of pursuit.")
        elif m_house:
            lines.append(f"Mars in house {m_house}{retro} gives you moderate romantic drive. You are loyal and protective of those you love.")

    # 5th house (love affairs)
    if fifth_planets:
        lines.append(f"Planets in your 5th house (love house): {', '.join(fifth_planets)}.")
        for p_name in fifth_planets:
            karaka = LOVE_KARAKAS.get(p_name, "")
            if karaka:
                lines.append(f"  - {p_name} in the 5th house brings {karaka} to your love life.")

    # Moon (emotions)
    if moon:
        m_house = moon.get("house", "")
        m_sign = moon.get("sign", "")
        if m_house:
            lines.append(f"Moon in house {m_house} ({m_sign}) makes you emotionally expressive in love. You need deep emotional connection and security from your partner.")

    # Mercury (communication)
    if mercury:
        m_house = mercury.get("house", "")
        if m_house in ["3", "5", "7", "11"]:
            lines.append(f"Mercury in house {m_house} makes you a witty and communicative partner. You express love through words and intellectual connection.")

    # 7th house (partnership)
    if seventh_planets:
        lines.append(f"Planets in your 7th house: {', '.join(seventh_planets)}. This shapes the type of partner you attract and your marriage dynamic.")

    # Doshas affecting love
    dosha_text = chart["doshas"]
    if "Manglik" in dosha_text:
        lines.append("\nManglik Dosha can cause intensity in relationships. Channel this energy through patience and understanding with your partner.")

    lines.append(f"\nYour {chart['ascendant']} ascendant and {chart['moon_sign']} Moon give you a romantic and nurturing approach to love. For marriage compatibility analysis, visit /matching.")
    lines.append("\nWant me to check your marriage prospects or career? I'm here to help!")

    return "\n".join(lines)


def generate_local_chat_response(message: str, birth_details: dict = None, birth_context: str = "") -> str:
    """Generate local chat response without AI — uses real chart analysis."""
    msg = message.lower()
    name = birth_details.get("name", "") if birth_details else ""

    if any(w in msg for w in ["hello", "hi", "hey", "namaste"]):
        greeting = f"Namaste {name}!" if name else "Namaste!"
        return f"{greeting} I am AstroSeva AI, your Vedic astrology assistant. I can see your birth chart and help you understand your planetary positions, doshas, career, marriage, and more. What would you like to know?"

    chart = _parse_chart(birth_context) if birth_context else {}

    if chart and chart.get("planets"):
        if any(w in msg for w in ["career", "job", "profession", "work", "promotion"]):
            return _analyze_career(chart)
        if any(w in msg for w in ["marriage", "married", "spouse", "partner", "relationship"]):
            return _analyze_marriage(chart)
        if any(w in msg for w in ["health", "disease", "illness", "fitness", "wellness"]):
            return _analyze_health(chart)
        if any(w in msg for w in ["finance", "money", "wealth", "income", "invest"]):
            return _analyze_finance(chart)
        if any(w in msg for w in ["love", "romance", "boyfriend", "girlfriend"]):
            return _analyze_love(chart)
        if any(w in msg for w in ["dosha", "manglik", "kaal sarp", "sade sati", "pitru"]):
            dosha_text = chart["doshas"]
            if dosha_text and dosha_text != "None detected":
                return f"Here's your dosha analysis, {chart.get('name', 'friend')}:\n\nActive doshas: {dosha_text}\n\nManglik Dosha is caused by Mars in houses 1, 2, 4, 7, 8, or 12. Remedies include chanting Hanuman Chalisa daily, fasting on Tuesdays, and wearing red coral (after consulting an astrologer).\n\nKaal Sarp Dosha is caused by Rahu-Ketu axis affecting all planets. Remedies include worshipping Lord Shiva, chanting 'Om Namah Shivaya', and visiting Shiva temples on Mondays.\n\nFor detailed dosha analysis, visit /doshas. Want me to explain any specific dosha in detail?"
            return f"No significant doshas detected in your chart, {chart.get('name', 'friend')}. Your chart is relatively clean. For a detailed dosha check, visit /doshas."
        if any(w in msg for w in ["remedy", "remedies", "upay", "solution"]):
            dosha_text = chart.get("doshas", "")
            remedies = []
            if "Manglik" in dosha_text:
                remedies.append("- Chant Hanuman Chalisa daily (especially Tuesdays and Saturdays)")
                remedies.append("- Fast on Tuesdays and offer red lentils")
                remedies.append("- Wear red coral (Moonga) after consulting an astrologer")
                remedies.append("- Visit Hanuman temple on Tuesdays")
            if "Kaal Sarp" in dosha_text:
                remedies.append("- Chant 'Om Namah Shivaya' 108 times daily")
                remedies.append("- Visit Shiva temple on Mondays and offer milk")
                remedies.append("- Wear silver serpent ring on middle finger")
                remedies.append("- Perform Kaal Sarp Dosha nivaran puja")
            if "Pitru" in dosha_text:
                remedies.append("- Perform Pitru Tarpanam during Pitru Paksha")
                remedies.append("- Offer food to crows and dogs on Saturdays")
                remedies.append("- Chant 'Om Pitrabhyah Swadha Namah'")
            if "Sade Sati" in dosha_text:
                remedies.append("- Chant Shani Mantra: 'Om Sham Shanaishcharaya Namah'")
                remedies.append("- Donate black sesame seeds and iron on Saturdays")
                remedies.append("- Wear blue sapphire (after consulting an astrologer)")
            if not remedies:
                remedies = [
                    "- Visit /kundli to generate your chart for personalized remedies",
                    "- General remedies: chant Gayatri Mantra daily, offer water to Sun at sunrise",
                    "- Donate to temples and feed the needy on auspicious days",
                    "- Practice meditation and maintain a sattvic lifestyle"
                ]
            return f"Here are your recommended remedies, {chart.get('name', 'friend')}:\n\n" + "\n".join(remedies[:6]) + "\n\nFor personalized gemstone and mantra recommendations, visit /predictions. Want me to explain any remedy in detail?"
        if any(w in msg for w in ["kundli", "chart", "birth chart", "kundali"]):
            return f"Here's your Vedic birth chart summary, {chart.get('name', 'friend')}:\n\nAscendant: {chart['ascendant']}\nMoon Sign: {chart['moon_sign']}\nPlanets: {', '.join(p['name'] + '-' + p['sign'] + ' H' + p['house'] for p in chart['planets'] if p['house'])}\nDoshas: {chart['doshas']}\n\nWould you like me to analyze any specific aspect — career, marriage, health, finance, or love? I can also explain what each planet's placement means for you."
        if any(w in msg for w in ["matching", "compatibility", "gun milan"]):
            return "Marriage matching (Ashtakoot Gun Milan) requires both partners' birth details — name, date, time, and place of birth.\n\nVisit /matching to enter both birth details and get a complete compatibility analysis with 8 koota scores out of 36 points, Nadi Dosha detection, and a personalized recommendation.\n\nWould you like to know what each koota means?"
        if any(w in msg for w in ["numerology", "number", "life path"]):
            return "Numerology reveals your life purpose through numbers. Visit /numerology with your name and birthdate."
        if any(w in msg for w in ["panchang", "tithi", "rahu kaal"]):
            return "Visit /panchang for today's complete Hindu calendar with Tithi, Nakshatra, Rahu Kaal, and auspicious timings."
        if any(w in msg for w in ["horoscope", "daily", "rashifal"]):
            return "Visit /horoscope for your daily horoscope with love, career, and health ratings."
        if any(w in msg for w in ["planet", "graha"]):
            planet_info = "\n".join(f"  - {p['name']}: {p['sign']} house {p['house']}" + (" (retrograde)" if p['retrograde'] else "") for p in chart['planets'])
            return f"Here are the planets in your chart, {chart.get('name', 'friend')}:\n\n{planet_info}\n\nWould you like me to explain what any specific planet means for your life?"
        if any(w in msg for w in ["thank", "thanks", "dhanyavad"]):
            return "You're welcome! Feel free to ask me anything else about your chart, doshas, remedies, or any aspect of Vedic astrology."
        # Default: give a chart summary with available analysis
        return f"Here's your chart overview, {chart.get('name', 'friend')}:\n\nAscendant: {chart['ascendant']}\nMoon Sign: {chart['moon_sign']}\nDoshas: {chart['doshas']}\n\nYou can ask me about:\n  - Career and job prospects\n  - Marriage and relationship analysis\n  - Health and wellness\n  - Financial outlook\n  - Love and romance\n  - Doshas and remedies\n  - Planet explanations\n\nWhat would you like to know?"

    # No chart context
    if any(w in msg for w in ["kundli", "chart", "birth chart", "kundali"]):
        return "A Kundli shows your planetary positions at birth. Visit /kundli to generate yours, then come back and I'll analyze it for you personally!"
    if any(w in msg for w in ["matching", "marriage", "gun"]):
        return "Marriage matching requires both partners' birth details. Visit /matching for a complete Ashtakoot analysis."
    if any(w in msg for w in ["manglik", "mars dosha"]):
        return "Manglik Dosha occurs when Mars is in the 1st, 2nd, 4th, 7th, 8th, or 12th house. Visit /kundli to check your chart, or /doshas for detailed analysis."
    if any(w in msg for w in ["kaal sarp", "rahu", "ketu"]):
        return "Kaal Sarp Dosha forms when all planets are between Rahu and Ketu. Check your chart at /kundli or visit /doshas."
    if any(w in msg for w in ["sade sati", "saturn", "shani"]):
        return "Sade Sati occurs when Saturn transits near your Moon sign for 7.5 years. Check your chart at /kundli or visit /doshas."
    if any(w in msg for w in ["numerology", "number", "life path"]):
        return "Numerology reveals your life purpose through numbers. Visit /numerology with your name and birthdate."
    if any(w in msg for w in ["panchang", "tithi", "rahu kaal"]):
        return "Visit /panchang for today's complete Hindu calendar with Tithi, Nakshatra, Rahu Kaal, and auspicious timings."
    if any(w in msg for w in ["horoscope", "daily", "rashifal"]):
        return "Visit /horoscope for your daily horoscope with love, career, and health ratings."
    if any(w in msg for w in ["remedy", "remedies", "upay"]):
        return "Vedic remedies include gemstones, mantras, donations, fasting, and temple visits. Generate your Kundli first for personalized remedies."
    if any(w in msg for w in ["planet", "graha"]):
        return "Vedic astrology has 9 planets: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu. Visit /kundli to see where each sits in your chart."
    if any(w in msg for w in ["thank", "thanks", "dhanyavad"]):
        return "You're welcome! Feel free to ask me anything else about your chart, doshas, remedies, or any aspect of Vedic astrology."

    return "I'm AstroSeva AI, your Vedic astrology assistant. To give you personalized readings, first generate your Kundli at /kundli, then come back and I'll analyze your chart. You can ask about career, marriage, health, doshas, remedies, and more!"


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.post("/send")
async def send_chat_message(request: ChatRequest):
    """Send a chat message to AstroSeva AI."""
    try:
        history_data = [msg.model_dump() for msg in (request.history or [])]
        response = generate_chat_response(
            message=request.message,
            history=history_data,
            language=request.language or "en",
            birth_details=request.birth_details,
        )
        return {"response": response, "model": get_model_name()}
    except Exception as e:
        logger.error(f"Chat error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate response. Please try again.")


@router.get("/suggestions")
async def get_chat_suggestions():
    """Get suggested questions for the chat."""
    return {
        "suggestions": [
            "Analyze my birth chart",
            "What doshas do I have?",
            "How is my career outlook?",
            "What are my remedies?",
            "How is my marriage prospects?",
            "Tell me about Sade Sati effects",
            "What gemstone should I wear?",
            "How does Jupiter affect my life?",
        ]
    }
