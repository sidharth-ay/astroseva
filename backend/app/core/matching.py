"""Ashtakoot Marriage Matching (Gun Milan) for Vedic Astrology."""

from typing import Optional
from .nakshatras import NAKSHATRAS, get_nakshatra_from_longitude
from .rashis import RASHI_NAMES, get_gender, get_enemy_signs

# Maximum points for each Koota
MAX_POINTS = {
    "varna": 1,
    "vashya": 2,
    "tara": 3,
    "yoni": 4,
    "graha_maitri": 5,
    "gana": 6,
    "bhakoot": 7,
    "nadi": 8,
}

TOTAL_MAX = 36


def calculate_varna(boy_sign: int, girl_sign: int) -> dict:
    """Calculate Varna (1 point) - Spiritual compatibility."""
    # Brahmin=0, Kshatriya=1, Vaishya=2, Shudra=3
    varna_map = {0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 0, 9: 0, 10: 1, 11: 1}

    boy_varna = varna_map.get(boy_sign, 0)
    girl_varna = varna_map.get(girl_sign, 0)

    score = 0
    if boy_varna <= girl_varna:
        score = 1

    return {
        "koota": "Varna",
        "max_points": 1,
        "score": score,
        "boy_varna": ["Brahmin", "Kshatriya", "Vaishya", "Shudra"][boy_varna],
        "girl_varna": ["Brahmin", "Kshatriya", "Vaishya", "Shudra"][girl_varna],
    }


def calculate_vashya(boy_sign: int, girl_sign: int) -> dict:
    """Calculate Vashya (2 points) - Mutual attraction."""
    # Categories: Chatushpad, Manav, Jalachara, Vanachara, Keet
    vashya_categories = {
        0: "Chatushpad", 1: "Chatushpad", 2: "Manav",
        3: "Jalachara", 4: "Vanachara", 5: "Manav",
        6: "Chatushpad", 7: "Jalachara", 8: "Vanachara",
        9: "Chatushpad", 10: "Jalachara", 11: "Jalachara"
    }

    boy_cat = vashya_categories.get(boy_sign, "Manav")
    girl_cat = vashya_categories.get(girl_sign, "Manav")

    score = 0
    if boy_cat == girl_cat:
        score = 2
    elif boy_cat in ["Manav", "Chatushpad"] and girl_cat in ["Manav", "Chatushpad"]:
        score = 1

    return {
        "koota": "Vashya",
        "max_points": 2,
        "score": score,
        "boy_category": boy_cat,
        "girl_category": girl_cat,
    }


def calculate_tara(boy_nakshatra: int, girl_nakshatra: int) -> dict:
    """Calculate Tara (3 points) - Birth star compatibility."""
    # Count from boy to girl and girl to boy
    boy_to_girl = (girl_nakshatra - boy_nakshatra) % 27
    girl_to_boy = (boy_nakshatra - girl_nakshatra) % 27

    # Remainder when divided by 9
    b2g_rem = (boy_to_girl + 1) % 9 if boy_to_girl > 0 else 9
    g2b_rem = (girl_to_boy + 1) % 9 if girl_to_boy > 0 else 9

    # 1, 5, 7 are inauspicious (Visham, Sadhak, Atithi)
    inauspicious = {1, 5, 7}

    score = 3
    if b2g_rem in inauspicious:
        score -= 1
    if g2b_rem in inauspicious:
        score -= 1
    score = max(0, score)

    return {
        "koota": "Tara",
        "max_points": 3,
        "score": score,
        "boy_to_girl": b2g_rem,
        "girl_to_boy": g2b_rem,
    }


def calculate_yoni(boy_nakshatra: int, girl_nakshatra: int) -> dict:
    """Calculate Yoni (4 points) - Physical compatibility."""
    # Each nakshatra has a yoni animal
    yoni_animals = [
        "Horse", "Elephant", "Sheep", "Serpent", "Serpent",
        "Dog", "Cat", "Sheep", "Cat", "Rat",
        "Rat", "Cow", "Buffalo", "Tiger", "Buffalo",
        "Tiger", "Hare", "Hare", "Dog", "Monkey",
        "Mongoose", "Monkey", "Lion", "Horse", "Lion",
        "Cow", "Elephant"
    ]

    # Enemy pairs
    yoni_enemies = {
        "Horse": "Buffalo", "Buffalo": "Horse",
        "Elephant": "Lion", "Lion": "Elephant",
        "Sheep": "Monkey", "Monkey": "Sheep",
        "Serpent": "Mongoose", "Mongoose": "Serpent",
        "Dog": "Hare", "Hare": "Dog",
        "Cat": "Rat", "Rat": "Cat",
        "Cow": "Tiger", "Tiger": "Cow",
    }

    boy_yoni = yoni_animals[boy_nakshatra]
    girl_yoni = yoni_animals[girl_nakshatra]

    score = 0
    if boy_yoni == girl_yoni:
        score = 4  # Same yoni - excellent
    elif yoni_enemies.get(boy_yoni) == girl_yoni:
        score = 0  # Enemy yonis
    else:
        score = 2  # Neutral

    return {
        "koota": "Yoni",
        "max_points": 4,
        "score": score,
        "boy_animal": boy_yoni,
        "girl_animal": girl_yoni,
        "relationship": "Enemy" if score == 0 else ("Same" if score == 4 else "Friendly"),
    }


def calculate_graha_maitri(boy_sign: int, girl_sign: int) -> dict:
    """Calculate Graha Maitri (5 points) - Planetary friendship."""
    # Sign lords
    sign_lords = {
        0: "Sun", 1: "Venus", 2: "Mercury", 3: "Moon",
        4: "Sun", 5: "Mercury", 6: "Venus", 7: "Mars",
        8: "Jupiter", 9: "Saturn", 10: "Saturn", 11: "Jupiter"
    }

    boy_lord = sign_lords.get(boy_sign, "Sun")
    girl_lord = sign_lords.get(girl_sign, "Sun")

    # Planet friendships (simplified)
    friends = {
        "Sun": ["Moon", "Mars", "Jupiter"],
        "Moon": ["Sun", "Mercury"],
        "Mars": ["Sun", "Moon", "Jupiter"],
        "Mercury": ["Sun", "Venus"],
        "Jupiter": ["Sun", "Moon", "Mars"],
        "Venus": ["Mercury", "Saturn"],
        "Saturn": ["Mercury", "Venus"],
        "Rahu": ["Saturn", "Mercury", "Venus"],
        "Ketu": ["Mars", "Jupiter"],
    }

    enemies = {
        "Sun": ["Venus", "Saturn", "Rahu"],
        "Moon": ["Rahu", "Ketu"],
        "Mars": ["Mercury", "Rahu", "Ketu"],
        "Mercury": ["Moon"],
        "Jupiter": ["Venus", "Mercury"],
        "Venus": ["Sun", "Moon"],
        "Saturn": ["Sun", "Moon", "Mars"],
        "Rahu": ["Sun", "Moon", "Mars"],
        "Ketu": ["Venus", "Mercury"],
    }

    boy_friends = friends.get(boy_lord, [])
    girl_friends = friends.get(girl_lord, [])

    if boy_lord == girl_lord:
        score = 5
    elif girl_lord in boy_friends and boy_lord in girl_friends:
        score = 4
    elif girl_lord in boy_friends or boy_lord in girl_friends:
        score = 3
    elif (girl_lord in enemies.get(boy_lord, [])) or (boy_lord in enemies.get(girl_lord, [])):
        score = 1
    else:
        score = 2

    return {
        "koota": "Graha Maitri",
        "max_points": 5,
        "score": score,
        "boy_lord": boy_lord,
        "girl_lord": girl_lord,
    }


def calculate_gana(boy_nakshatra: int, girl_nakshatra: int) -> dict:
    """Calculate Gana (6 points) - Temperament matching."""
    # Deva, Manushya, Rakshasa
    gana_map = [
        "Deva", "Manushya", "Rakshasa",  # Ashwini, Bharani, Krittika
        "Manushya", "Deva", "Manushya",  # Rohini, Mrigashira, Ardra
        "Deva", "Deva", "Rakshasa",      # Punarvasu, Pushya, Ashlesha
        "Rakshasa", "Manushya", "Manushya", # Magha, P.Phalguni, U.Phalguni
        "Deva", "Rakshasa", "Deva",      # Hasta, Chitra, Swati
        "Rakshasa", "Deva", "Rakshasa",  # Vishakha, Anuradha, Jyeshtha
        "Rakshasa", "Manushya", "Manushya", # Mula, P.Ashadha, U.Ashadha
        "Deva", "Rakshasa", "Manushya",  # Shravana, Dhanishta, Shatabhisha
        "Manushya", "Manushya", "Deva",  # P.Bhadra, U.Bhadra, Revati
    ]

    boy_gana = gana_map[boy_nakshatra]
    girl_gana = gana_map[girl_nakshatra]

    score = 0
    if boy_gana == girl_gana:
        score = 6
    elif (boy_gana == "Deva" and girl_gana == "Manushya") or \
         (boy_gana == "Manushya" and girl_gana == "Deva"):
        score = 5
    elif (boy_gana == "Deva" and girl_gana == "Rakshasa") or \
         (boy_gana == "Rakshasa" and girl_gana == "Deva"):
        score = 1
    elif (boy_gana == "Manushya" and girl_gana == "Rakshasa") or \
         (boy_gana == "Rakshasa" and girl_gana == "Manushya"):
        score = 0
    elif boy_gana == "Rakshasa" and girl_gana == "Rakshasa":
        score = 6

    return {
        "koota": "Gana",
        "max_points": 6,
        "score": score,
        "boy_gana": boy_gana,
        "girl_gana": girl_gana,
    }


def calculate_bhakoot(boy_sign: int, girl_sign: int) -> dict:
    """Calculate Bhakoot (7 points) - Love compatibility."""
    # Count from boy sign to girl sign and vice versa
    boy_to_girl = (girl_sign - boy_sign) % 12 + 1
    girl_to_boy = (boy_sign - girl_sign) % 12 + 1

    # Inauspicious combinations (2/12, 5/9, 6/8)
    inauspicious = [
        (2, 12), (12, 2),  # 2/12
        (5, 9), (9, 5),    # 5/9
        (6, 8), (8, 6),    # 6/8
    ]

    score = 7
    if (boy_to_girl, girl_to_boy) in inauspicious:
        score = 0

    return {
        "koota": "Bhakoot",
        "max_points": 7,
        "score": score,
        "boy_to_girl": boy_to_girl,
        "girl_to_boy": girl_to_boy,
    }


def calculate_nadi(boy_nakshatra: int, girl_nakshatra: int) -> dict:
    """Calculate Nadi (8 points) - Health compatibility."""
    # Aadi, Madhya, Antya
    nadi_map = [
        "Aadi", "Madhya", "Antya",  # Ashwini, Bharani, Krittika
        "Aadi", "Madhya", "Antya",  # Rohini, Mrigashira, Ardra
        "Aadi", "Madhya", "Antya",  # Punarvasu, Pushya, Ashlesha
        "Antya", "Aadi", "Madhya",  # Magha, P.Phalguni, U.Phalguni
        "Antya", "Aadi", "Madhya",  # Hasta, Chitra, Swati
        "Antya", "Aadi", "Madhya",  # Vishakha, Anuradha, Jyeshtha
        "Antya", "Aadi", "Madhya",  # Mula, P.Ashadha, U.Ashadha
        "Madhya", "Antya", "Aadi",  # Shravana, Dhanishta, Shatabhisha
        "Madhya", "Antya", "Aadi",  # P.Bhadra, U.Bhadra, Revati
    ]

    boy_nadi = nadi_map[boy_nakshatra]
    girl_nadi = nadi_map[girl_nakshatra]

    score = 0
    if boy_nadi != girl_nadi:
        score = 8  # Different nadis - excellent
    else:
        score = 0  # Same nadi - Nadi Dosha

    return {
        "koota": "Nadi",
        "max_points": 8,
        "score": score,
        "boy_nadi": boy_nadi,
        "girl_nadi": girl_nadi,
        "nadi_dosha": boy_nadi == girl_nadi,
    }


def analyze_matching(boy_longitude: float, girl_longitude: float,
                     boy_sign: int, girl_sign: int) -> dict:
    """Complete Ashtakoot matching analysis."""
    boy_nakshatra = get_nakshatra_from_longitude(boy_longitude)
    girl_nakshatra = get_nakshatra_from_longitude(girl_longitude)

    boy_nak_idx = boy_nakshatra["index"]
    girl_nak_idx = girl_nakshatra["index"]

    # Calculate all Kootas
    varna = calculate_varna(boy_sign, girl_sign)
    vashya = calculate_vashya(boy_sign, girl_sign)
    tara = calculate_tara(boy_nak_idx, girl_nak_idx)
    yoni = calculate_yoni(boy_nak_idx, girl_nak_idx)
    graha_maitri = calculate_graha_maitri(boy_sign, girl_sign)
    gana = calculate_gana(boy_nak_idx, girl_nak_idx)
    bhakoot = calculate_bhakoot(boy_sign, girl_sign)
    nadi = calculate_nadi(boy_nak_idx, girl_nak_idx)

    total_score = (
        varna["score"] + vashya["score"] + tara["score"] +
        yoni["score"] + graha_maitri["score"] + gana["score"] +
        bhakoot["score"] + nadi["score"]
    )

    compatibility_pct = (total_score / TOTAL_MAX) * 100

    # Determine recommendation
    if total_score >= 25:
        recommendation = "Highly Recommended"
    elif total_score >= 18:
        recommendation = "Recommended"
    elif total_score >= 12:
        recommendation = "Average - Consult Astrologer"
    else:
        recommendation = "Not Recommended"

    return {
        "total_score": total_score,
        "max_score": TOTAL_MAX,
        "compatibility_percentage": round(compatibility_pct, 1),
        "recommendation": recommendation,
        "nadi_dosha": nadi["nadi_dosha"],
        "kootas": {
            "varna": varna,
            "vashya": vashya,
            "tara": tara,
            "yoni": yoni,
            "graha_maitri": graha_maitri,
            "gana": gana,
            "bhakoot": bhakoot,
            "nadi": nadi,
        },
        "boy_nakshatra": boy_nakshatra,
        "girl_nakshatra": girl_nakshatra,
    }
