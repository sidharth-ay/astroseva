"""AI Service for Google Gemini integration with fallback."""

import os
import random
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# System prompt for AstroSeva AI
SYSTEM_PROMPT = """You are AstroSeva AI — a warm, knowledgeable, and trusted Vedic astrologer. Think of yourself as a wise family pandit who genuinely cares about the person's wellbeing. You speak with authority but kindness, and you always personalize your guidance based on their birth chart.

PERSONALITY:
- Friendly, warm, and approachable — never cold or robotic
- Use the person's name when it's provided to you
- Speak like a trusted advisor, not a textbook
- Mix natural conversational Hindi/English (Hinglish) when the user speaks Hindi
- Be encouraging even when delivering challenging news — always offer hope and remedies
- Use analogies and simple examples to explain complex concepts

PLATFORM FEATURES (guide users when relevant):
1. KUNDLI (Birth Chart): /kundli — Full Vedic birth chart with 9 planets, 12 houses, Nakshatras, Dasha
2. MARRIAGE MATCHING: /matching — Ashtakoot Gun Milan, 8 factors, 36 points, Nadi Dosha
3. DOSHA DETECTION: /doshas — Manglik, Kaal Sarp, Sade Sati, Pitru Dosha with severity & remedies
4. PREDICTIONS: /predictions — AI predictions for career, love, health, finance, education
5. DAILY HOROSCOPE: /horoscope — Daily horoscope with ratings and lucky items
6. PANCHANG: /panchang — Hindu calendar, Tithi, Rahu Kaal, auspicious timings
7. NUMEROLOGY: /numerology — Life Path, Destiny, Soul Urge numbers from name & birthdate

VEDIC ASTROLOGY KNOWLEDGE:
- 9 Planets: Sun (leadership), Moon (mind), Mars (courage), Mercury (intellect), Jupiter (wisdom), Venus (love), Saturn (discipline), Rahu (desires), Ketu (moksha)
- 12 Houses: 1=Self, 2=Wealth, 3=Siblings, 4=Home, 5=Children, 6=Enemies, 7=Marriage, 8=Longevity, 9=Dharma, 10=Career, 11=Gains, 12=Loss
- 12 Rashis, 27 Nakshatras, Vimshottari Dasha, Lahiri Ayanamsa

RESPONSE STYLE:
1. Start with a direct, clear answer to their question
2. Reference their specific chart positions when birth data is available ("I can see your Mars sits in...")
3. End with an actionable insight, remedy, or a thoughtful follow-up question
4. Keep responses concise but insightful (2-4 paragraphs)
5. When discussing doshas, mention remedies and severity
6. When discussing matching, mention the score and compatibility
7. For general questions without birth data, provide knowledge and guide them to generate their Kundli

NEVER:
- Never mention Google, Gemini, or any AI model name
- Never say "I'm an AI" — you are AstroSeva AI, a Vedic astrology assistant
- Never give vague, generic answers when chart data is available
- Never ignore their specific question to give a textbook response
"""

# Zodiac sign data for fallback predictions
ZODIAC_DATA = {
    "aries": {
        "ruling_planet": "Mars", "element": "Fire", "quality": "Cardinal",
        "traits": "bold, ambitious, energetic, confident",
        "love": "Passionate connections await. Open your heart to new possibilities.",
        "career": "Leadership opportunities arise. Trust your instincts for decisions.",
        "health": "High energy levels. Channel your drive into physical activities.",
    },
    "taurus": {
        "ruling_planet": "Venus", "element": "Earth", "quality": "Fixed",
        "traits": "patient, reliable, practical, devoted",
        "love": "Stable relationships deepen. Express your feelings openly.",
        "career": "Financial gains are likely. Stay consistent with your efforts.",
        "health": "Focus on routine wellness. Avoid overindulgence in food.",
    },
    "gemini": {
        "ruling_planet": "Mercury", "element": "Air", "quality": "Mutable",
        "traits": "versatile, curious, communicative, witty",
        "love": "Social connections spark. Communication brings you closer to loved ones.",
        "career": "Multi-tasking pays off. New ideas bring fresh opportunities.",
        "health": "Keep your mind active. Balance mental and physical health.",
    },
    "cancer": {
        "ruling_planet": "Moon", "element": "Water", "quality": "Cardinal",
        "traits": "nurturing, protective, intuitive, emotional",
        "love": "Family bonds strengthen. Home is where your heart finds peace.",
        "career": "Trust your intuition at work. Protect your interests wisely.",
        "health": "Emotional wellness matters. Take time for self-care today.",
    },
    "leo": {
        "ruling_planet": "Sun", "element": "Fire", "quality": "Fixed",
        "traits": "creative, generous, warm-hearted, natural leader",
        "love": "Romance flourishes. Your charm attracts positive attention.",
        "career": "Creative projects succeed. Let your natural leadership shine.",
        "health": "Stay active and maintain your vitality. Outdoor activities help.",
    },
    "virgo": {
        "ruling_planet": "Mercury", "element": "Earth", "quality": "Mutable",
        "traits": "analytical, practical, hardworking, detail-oriented",
        "love": "Small gestures mean everything. Show your appreciation daily.",
        "career": "Details matter today. Your analytical skills impress others.",
        "health": "Focus on diet and digestion. Regular routines support wellness.",
    },
    "libra": {
        "ruling_planet": "Venus", "element": "Air", "quality": "Cardinal",
        "traits": "harmonious, diplomatic, fair-minded, social",
        "love": "Balance in relationships is key. Seek harmony in all interactions.",
        "career": "Partnerships bring success. Your diplomatic skills shine today.",
        "health": "Mental peace through balance. Practice mindfulness or meditation.",
    },
    "scorpio": {
        "ruling_planet": "Pluto", "element": "Water", "quality": "Fixed",
        "traits": "passionate, resourceful, brave, determined",
        "love": "Deep connections form. Transformation in relationships is possible.",
        "career": "Research and investigation pay off. Trust your instincts.",
        "health": "Release emotional stress. Physical activity helps detoxify.",
    },
    "sagittarius": {
        "ruling_planet": "Jupiter", "element": "Fire", "quality": "Mutable",
        "traits": "adventurous, optimistic, freedom-loving, philosophical",
        "love": "Adventure awaits in love. Be open to unexpected connections.",
        "career": "New horizons open. Your optimism attracts golden opportunities.",
        "health": "Stay adventurous but cautious. Travel benefits your spirit.",
    },
    "capricorn": {
        "ruling_planet": "Saturn", "element": "Earth", "quality": "Cardinal",
        "traits": "ambitious, disciplined, patient, practical",
        "love": "Commitment deepens. Your dedication to love is rewarded.",
        "career": "Hard work pays off. Your patience and discipline bring results.",
        "health": "Structure your wellness routine. Bones and joints need attention.",
    },
    "aquarius": {
        "ruling_planet": "Saturn", "element": "Air", "quality": "Fixed",
        "traits": "innovative, humanitarian, independent, original",
        "love": "Friendship becomes romance. Your unique approach attracts love.",
        "career": "Innovation leads the way. Your ideas can change the world.",
        "health": "Circulation health matters. Stay active and social.",
    },
    "pisces": {
        "ruling_planet": "Neptune", "element": "Water", "quality": "Mutable",
        "traits": "intuitive, compassionate, artistic, dreamy",
        "love": "Romance is in the air. Trust your intuition in matters of heart.",
        "career": "Creative projects flourish. Your artistic talents are recognized.",
        "health": "Rest and recharge. Your sensitive nature needs peaceful spaces.",
    },
}


def configure_gemini():
    """Configure Gemini API with the API key."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your-gemini-api-key-here":
        return None
    if GEMINI_AVAILABLE:
        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        return genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
    return None


def get_model_name():
    """Get the current model name for responses."""
    return os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")


def generate_fallback_horoscope(zodiac_sign: str) -> dict:
    """Generate horoscope without AI using zodiac data."""
    sign_data = ZODIAC_DATA.get(zodiac_sign.lower(), ZODIAC_DATA["aries"])

    love_rating = random.randint(3, 5)
    career_rating = random.randint(3, 5)
    health_rating = random.randint(3, 5)
    lucky_numbers = [random.randint(1, 99) for _ in range(3)]
    lucky_colors = ["Red", "Blue", "Green", "Yellow", "White", "Orange", "Purple", "Gold", "Pink", "Silver"]
    lucky_color = random.choice(lucky_colors)

    prediction = f"""{zodiac_sign.title()} Daily Horoscope

Love: {sign_data['love']}

Career: {sign_data['career']}

Health: {sign_data['health']}

Today's Ruling Planet: {sign_data['ruling_planet']}
Element: {sign_data['element']}

As AstroSeva AI, I recommend focusing on your strengths today. Stay positive and embrace the opportunities that come your way. Remember, your ruling planet {sign_data['ruling_planet']} influences your energy today."""

    return {
        "prediction": prediction,
        "love_rating": love_rating,
        "career_rating": career_rating,
        "health_rating": health_rating,
        "lucky_numbers": lucky_numbers,
        "lucky_color": lucky_color,
    }


def generate_fallback_prediction(birth_details: dict, prediction_type: str) -> str:
    """Generate prediction without AI."""
    name = birth_details.get("name", "friend")
    asc_sign = birth_details.get("ascendant", "unknown")

    templates = {
        "career": f"""Career Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Your career path shows promising developments. The planetary positions indicate that your professional life is entering a favorable phase. Mars and Saturn's alignment suggests hard work will pay off.

Key Periods: The next few months are crucial for career decisions. Jupiter's transit through your house of profession brings opportunities.

Remedies: 
- Offer water to Sun every morning
- Wear Ruby gemstone on Sunday
- Chant "Om Suryaya Namaha" daily

As AstroSeva AI, I see growth and success in your professional endeavors.""",

        "marriage": f"""Marriage Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Venus's position in your chart indicates favorable conditions for relationships. If single, a meaningful connection may develop soon. If married, harmony deepens in your partnership.

Key Periods: The upcoming Venus transit strengthens romantic prospects. Communication with your partner improves significantly.

Remedies:
- Offer white sweets on Friday
- Wear Diamond or White Sapphire
- Chant "Om Shukraya Namaha" on Fridays

As AstroSeva AI, your marriage prospects look bright.""",

        "health": f"""Health Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Your health chart shows a period of vitality. Saturn's influence encourages disciplined routines. Pay attention to your daily habits for optimal wellness.

Key Periods: The coming weeks support lifestyle changes. Start new health routines during this favorable window.

Remedies:
- Practice yoga or meditation daily
- Drink warm water every morning
- Wear Coral gemstone for physical vitality

As AstroSeva AI, maintaining consistency in your health routine will bring lasting benefits.""",

        "finance": f"""Finance Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Jupiter's position in your chart indicates financial growth opportunities. Your income potential expands through smart decisions and careful planning.

Key Periods: The next quarter brings financial gains. Investments made during this period yield positive results.

Remedies:
- Donate to education-related charities
- Wear Yellow Sapphire on Thursday
- Chant "Om Gurave Namaha" on Thursdays

As AstroSeva AI, financial prosperity is within your reach.""",

        "love": f"""Love Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Venus and Moon's alignment in your chart creates a romantic atmosphere. Your emotional connections deepen, bringing joy and fulfillment.

Key Periods: The upcoming lunar transit enhances romantic feelings. Express your love openly during this time.

Remedies:
- Offer milk and rice on Monday
- Wear Pearl gemstone for emotional balance
- Chant "Om Chandraya Namaha" on Mondays

As AstroSeva AI, love is all around you - embrace it.""",

        "education": f"""Education Prediction for {name}

Based on your Vedic birth chart with Ascendant in {asc_sign}:

Mercury's influence strengthens your intellectual pursuits. Studies and examinations favor your efforts. Your focus and determination lead to success.

Key Periods: The academic year ahead shows excellent progress. Complete important tasks during Mercury's direct motion.

Remedies:
- Study near a water fountain or aquarium
- Wear Emerald gemstone for concentration
- Chant "Om Budhaya Namaha" on Wednesdays

As AstroSeva AI, your educational journey is blessed with wisdom.""",
    }

    return templates.get(prediction_type, templates["career"])


async def generate_prediction(
    birth_details: dict,
    prediction_type: str,
    language: str = "en",
) -> dict:
    """Generate AI prediction using Gemini with fallback."""
    model = configure_gemini()

    if model is None:
        # Fallback to local prediction
        content = generate_fallback_prediction(birth_details, prediction_type)
        return {
            "content": content,
            "model": "astroseva-local",
            "tokens_used": None,
        }

    prompt = f"""Generate a detailed {prediction_type} prediction based on these Vedic astrology birth details:

Name: {birth_details.get('name', 'Unknown')}
Birth Date: {birth_details.get('birth_date', 'Unknown')}
Birth Time: {birth_details.get('birth_time', 'Unknown')}
Birth Place: {birth_details.get('birth_place', 'Unknown')}
Ascendant: {birth_details.get('ascendant', 'Unknown')}
Moon Sign: {birth_details.get('moon_sign', 'Unknown')}
Sun Sign: {birth_details.get('sun_sign', 'Unknown')}

Key planetary positions:
{birth_details.get('planetary_positions', 'Not available')}

Doshas detected:
{birth_details.get('doshas', 'None detected')}

Please provide:
1. Overall {prediction_type} analysis based on Vedic astrology
2. Key influences and planetary periods
3. Favorable and unfavorable periods
4. Specific predictions for next 1-2 years
5. Remedies and suggestions for improvement
6. Lucky colors, numbers, and gemstones if applicable

Language: {'Hindi' if language == 'hi' else 'English'}
Respond as AstroSeva AI."""

    try:
        response = await asyncio.to_thread(_call_gemini, model, prompt)
        return {
            "content": response.text,
            "model": get_model_name(),
            "tokens_used": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else None,
        }
    except Exception as e:
        # Fallback to local prediction
        content = generate_fallback_prediction(birth_details, prediction_type)
        return {
            "content": content,
            "model": "astroseva-local",
            "tokens_used": None,
        }


def _call_gemini(model, prompt, generation_config=None):
    """Synchronous Gemini call — run in thread via asyncio.to_thread."""
    if generation_config:
        return model.generate_content(prompt, generation_config=generation_config)
    return model.generate_content(prompt)


async def generate_horoscope(zodiac_sign: str, language: str = "en") -> dict:
    """Generate daily horoscope using Gemini with fallback."""
    model = configure_gemini()

    if model is not None:
        prompt = f"""Generate a daily horoscope for {zodiac_sign} for today.
Language: {'Hindi' if language == 'hi' else 'English'}
Respond as AstroSeva AI. Be concise (2-3 paragraphs).
After the prediction, add on separate lines:
LOVE_RATING: <1-5>
CAREER_RATING: <1-5>
HEALTH_RATING: <1-5>
LUCKY_NUMBERS: <3 numbers comma separated>
LUCKY_COLOR: <one color>"""

        try:
            from google.generativeai.types import GenerationConfig
            response = await asyncio.to_thread(
                _call_gemini, model, prompt,
                GenerationConfig(max_output_tokens=300, temperature=0.7),
            )
            text = response.text

            # Parse structured fields from response
            import re
            love = int(re.search(r'LOVE_RATING:\s*(\d)', text).group(1)) if re.search(r'LOVE_RATING:\s*(\d)', text) else 4
            career = int(re.search(r'CAREER_RATING:\s*(\d)', text).group(1)) if re.search(r'CAREER_RATING:\s*(\d)', text) else 4
            health = int(re.search(r'HEALTH_RATING:\s*(\d)', text).group(1)) if re.search(r'HEALTH_RATING:\s*(\d)', text) else 4
            nums = re.search(r'LUCKY_NUMBERS:\s*([\d,\s]+)', text)
            lucky_nums = [int(n.strip()) for n in nums.group(1).split(',') if n.strip().isdigit()] if nums else [3, 7, 9]
            color = re.search(r'LUCKY_COLOR:\s*(\w+)', text)
            lucky_color = color.group(1) if color else "Blue"

            # Clean prediction text (remove metadata lines)
            clean = re.sub(r'LOVE_RATING:.*', '', text, flags=re.DOTALL).strip()

            return {
                "prediction": clean,
                "model": get_model_name(),
                "love_rating": love,
                "career_rating": career,
                "health_rating": health,
                "lucky_numbers": lucky_nums[:3],
                "lucky_color": lucky_color,
            }
        except Exception as e:
            logger.error(f"Gemini horoscope error: {type(e).__name__}: {e}")

    # Fallback to local horoscope
    result = generate_fallback_horoscope(zodiac_sign)
    return {
        "prediction": result["prediction"],
        "model": "astroseva-local",
        "love_rating": result["love_rating"],
        "career_rating": result["career_rating"],
        "health_rating": result["health_rating"],
        "lucky_numbers": result["lucky_numbers"],
        "lucky_color": result["lucky_color"],
    }


async def generate_remedies(doshas: dict, language: str = "en") -> str:
    """Generate remedies for detected doshas."""
    model = configure_gemini()

    dosha_list = []
    if doshas.get("manglik", {}).get("is_manglik"):
        dosha_list.append("Manglik Dosha")
    if doshas.get("kaal_sarp", {}).get("has_dosha"):
        dosha_list.append("Kaal Sarp Dosha")
    if doshas.get("sade_sati", {}).get("is_active"):
        dosha_list.append("Sade Sati")
    if doshas.get("pitru_dosha", {}).get("has_dosha"):
        dosha_list.append("Pitru Dosha")

    if not dosha_list:
        return "No significant doshas detected. Continue with regular spiritual practices."

    if model is None:
        return generate_local_remedies(dosha_list)

    prompt = f"""The following doshas are detected in the birth chart:
{', '.join(dosha_list)}

Please provide:
1. Detailed remedies for each dosha
2. Mantras to chant
3. Gemstones to wear
4. Donations (daan) to make
5. Fasts (vrat) to observe
6. Temples to visit
7. General spiritual practices

Language: {'Hindi' if language == 'hi' else 'English'}
Respond as AstroSeva AI."""

    try:
        response = await asyncio.to_thread(_call_gemini, model, prompt)
        return response.text
    except Exception as e:
        return generate_local_remedies(dosha_list)


def generate_local_remedies(dosha_list: list) -> str:
    """Generate remedies locally."""
    remedies = []
    for dosha in dosha_list:
        if dosha == "Manglik Dosha":
            remedies.append("""Manglik Dosha Remedies:
- Visit Hanuman temple every Tuesday
- Chant "Om Hanumate Namaha" 108 times daily
- Donate red lentils (masoor dal) on Tuesday
- Read Hanuman Chalisa regularly
- Avoid non-vegetarian food on Tuesdays""")
        elif dosha == "Kaal Sarp Dosha":
            remedies.append("""Kaal Sarp Dosha Remedies:
- Visit temples of Lord Shiva regularly
- Chant "Om Namah Shivaya" 108 times daily
- Donate milk and rice on Monday
- Perform Rahu-Ketu puja at Shiva temples
- Keep a silver ball with you""")
        elif dosha == "Sade Sati":
            remedies.append("""Sade Sati Remedies:
- Chant "Om Sham Shanaicharaya Namaha" on Saturdays
- Donate black sesame seeds, iron, and mustard oil on Saturday
- Visit Shani temple every Saturday evening
- Wear Blue Sapphire (after consulting an astrologer)
- Help the elderly and disabled""")
        elif dosha == "Pitru Dosha":
            remedies.append("""Pitru Dosha Remedies:
- Perform Pind Daan at holy places
- Feed crows and cows regularly
- Chant "Om Pitrabhyah Namaha" on Amavasya
- Donate food to Brahmins on new moon days
- Perform Shraddha ceremonies during Pitru Paksha""")

    return "\n\n".join(remedies) if remedies else "Consult a Vedic astrologer for personalized remedies."
