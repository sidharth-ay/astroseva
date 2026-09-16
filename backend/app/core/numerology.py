"""Numerology calculations for Vedic Astrology."""

from typing import Optional

# Number meanings
NUMBER_MEANINGS = {
    1: {
        "planet": "Sun",
        "element": "Fire",
        "traits": ["Leadership", "Independence", "Originality", "Ambition"],
        "career": ["Business", "Politics", "Management", "Engineering"],
        "lucky_color": "Red",
        "lucky_gem": "Ruby",
        "lucky_day": "Sunday",
    },
    2: {
        "planet": "Moon",
        "element": "Water",
        "traits": ["Diplomacy", "Cooperation", "Sensitivity", "Intuition"],
        "career": ["Art", "Music", "Counseling", "Design"],
        "lucky_color": "White",
        "lucky_gem": "Pearl",
        "lucky_day": "Monday",
    },
    3: {
        "planet": "Jupiter",
        "element": "Fire",
        "traits": ["Creativity", "Optimism", "Communication", "Expansion"],
        "career": ["Teaching", "Writing", "Entertainment", "Philosophy"],
        "lucky_color": "Yellow",
        "lucky_gem": "Yellow Sapphire",
        "lucky_day": "Thursday",
    },
    4: {
        "planet": "Rahu",
        "element": "Earth",
        "traits": ["Stability", "Hard Work", "Practicality", "Order"],
        "career": ["Technology", "Engineering", "Real Estate", "Accounting"],
        "lucky_color": "Green",
        "lucky_gem": "Hessonite",
        "lucky_day": "Saturday",
    },
    5: {
        "planet": "Mercury",
        "element": "Air",
        "traits": ["Versatility", "Freedom", "Adventure", "Communication"],
        "career": ["Sales", "Marketing", "Travel", "Media"],
        "lucky_color": "Light Green",
        "lucky_gem": "Emerald",
        "lucky_day": "Wednesday",
    },
    6: {
        "planet": "Venus",
        "element": "Earth",
        "traits": ["Harmony", "Responsibility", "Love", "Family"],
        "career": ["Healthcare", "Education", "Service", "Hospitality"],
        "lucky_color": "Blue",
        "lucky_gem": "Blue Sapphire",
        "lucky_day": "Friday",
    },
    7: {
        "planet": "Neptune",
        "element": "Water",
        "traits": ["Spirituality", "Analysis", "Introspection", "Mystery"],
        "career": ["Research", "Spirituality", "Science", "Philosophy"],
        "lucky_color": "Purple",
        "lucky_gem": "Cat's Eye",
        "lucky_day": "Tuesday",
    },
    8: {
        "planet": "Saturn",
        "element": "Earth",
        "traits": ["Authority", "Achievement", "Karma", "Discipline"],
        "career": ["Business", "Finance", "Law", "Management"],
        "lucky_color": "Black",
        "lucky_gem": "Blue Sapphire",
        "lucky_day": "Saturday",
    },
    9: {
        "planet": "Mars",
        "element": "Fire",
        "traits": ["Compassion", "Humanitarian", "Completion", "Energy"],
        "career": ["Medicine", "Social Work", "Art", "Politics"],
        "lucky_color": "Red",
        "lucky_gem": "Red Coral",
        "lucky_day": "Tuesday",
    },
}


def reduce_to_single_digit(number: int) -> int:
    """Reduce a number to single digit (unless master number)."""
    while number > 9 and number not in [11, 22, 33]:
        number = sum(int(digit) for digit in str(number))
    return number


def calculate_life_path_number(birth_date: str) -> dict:
    """Calculate Life Path Number from birth date (DD-MM-YYYY)."""
    parts = birth_date.replace("/", "-").split("-")
    if len(parts) != 3:
        raise ValueError("Date must be in DD-MM-YYYY format")

    day = int(parts[0])
    month = int(parts[1])
    year = int(parts[2])

    # Reduce each component
    day_reduced = reduce_to_single_digit(day)
    month_reduced = reduce_to_single_digit(month)
    year_reduced = reduce_to_single_digit(year)

    # Sum and reduce
    total = day_reduced + month_reduced + year_reduced
    life_path = reduce_to_single_digit(total)

    # Check for master numbers
    is_master = life_path in [11, 22, 33]

    meaning = NUMBER_MEANINGS.get(life_path if not is_master else (life_path % 9 or 9), {})

    return {
        "life_path_number": life_path,
        "is_master_number": is_master,
        "day": day,
        "month": month,
        "year": year,
        "reduction": f"{day} + {month} + {year} = {day_reduced} + {month_reduced} + {year_reduced} = {total} = {life_path}",
        "traits": meaning.get("traits", []),
        "career": meaning.get("career", []),
        "planet": meaning.get("planet", ""),
        "element": meaning.get("element", ""),
        "lucky_color": meaning.get("lucky_color", ""),
        "lucky_gem": meaning.get("lucky_gem", ""),
        "lucky_day": meaning.get("lucky_day", ""),
    }


def calculate_destiny_number(name: str) -> dict:
    """Calculate Destiny Number (Expression Number) from full name."""
    # Letter to number mapping (Pythagorean)
    letter_values = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
    }

    # Remove spaces and convert to uppercase
    name = name.replace(" ", "").upper()

    # Calculate value for each name part
    total = 0
    for char in name:
        if char in letter_values:
            total += letter_values[char]

    destiny = reduce_to_single_digit(total)
    is_master = destiny in [11, 22, 33]

    meaning = NUMBER_MEANINGS.get(destiny if not is_master else (destiny % 9 or 9), {})

    return {
        "destiny_number": destiny,
        "is_master_number": is_master,
        "name": name,
        "total_value": total,
        "traits": meaning.get("traits", []),
        "career": meaning.get("career", []),
        "planet": meaning.get("planet", ""),
        "element": meaning.get("element", ""),
    }


def calculate_soul_urge_number(name: str) -> dict:
    """Calculate Soul Urge Number from vowels in name."""
    vowels = set('AEIOU')
    letter_values = {
        'A': 1, 'E': 5, 'I': 9, 'O': 6, 'U': 3,
    }

    name = name.replace(" ", "").upper()

    total = 0
    for char in name:
        if char in vowels and char in letter_values:
            total += letter_values[char]

    soul_urge = reduce_to_single_digit(total) if total > 0 else 0

    return {
        "soul_urge_number": soul_urge,
        "name": name,
        "total_value": total,
        "vowels_used": [char for char in name if char in vowels],
    }


def calculate_personality_number(name: str) -> dict:
    """Calculate Personality Number from consonants in name."""
    vowels = set('AEIOU')
    letter_values = {
        'B': 2, 'C': 3, 'D': 4, 'F': 6, 'G': 7, 'H': 8, 'J': 1, 'K': 2,
        'L': 3, 'M': 4, 'N': 5, 'P': 7, 'Q': 8, 'R': 9, 'S': 1, 'T': 2,
        'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
    }

    name = name.replace(" ", "").upper()

    total = 0
    for char in name:
        if char not in vowels and char in letter_values:
            total += letter_values[char]

    personality = reduce_to_single_digit(total) if total > 0 else 0

    return {
        "personality_number": personality,
        "name": name,
        "total_value": total,
        "consonants_used": [char for char in name if char not in vowels and char.isalpha()],
    }


def calculate_birthday_number(day: int) -> dict:
    """Calculate Birthday Number from birth day."""
    birthday = reduce_to_single_digit(day)

    meaning = NUMBER_MEANINGS.get(birthday, {})

    return {
        "birthday_number": birthday,
        "day": day,
        "traits": meaning.get("traits", []),
        "planet": meaning.get("planet", ""),
        "element": meaning.get("element", ""),
    }


def calculate_name_number(name: str) -> dict:
    """Calculate Name Number (similar to Destiny but used in Vedic)."""
    letter_values = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
        'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
    }

    name = name.replace(" ", "").upper()
    total = sum(letter_values.get(char, 0) for char in name)
    name_number = reduce_to_single_digit(total)

    return {
        "name_number": name_number,
        "name": name,
        "total_value": total,
    }


def get_numerology_analysis(name: str, birth_date: str) -> dict:
    """Complete numerology analysis."""
    life_path = calculate_life_path_number(birth_date)
    destiny = calculate_destiny_number(name)
    soul_urge = calculate_soul_urge_number(name)
    personality = calculate_personality_number(name)

    # Birthday number
    day = int(birth_date.replace("/", "-").split("-")[0])
    birthday = calculate_birthday_number(day)

    # Name number
    name_num = calculate_name_number(name)

    return {
        "life_path": life_path,
        "destiny": destiny,
        "soul_urge": soul_urge,
        "personality": personality,
        "birthday": birthday,
        "name_number": name_num,
        "lucky_numbers": [
            life_path["life_path_number"],
            destiny["destiny_number"],
            soul_urge["soul_urge_number"],
        ],
        "compatibility": get_number_compatibility(
            life_path["life_path_number"],
            destiny["destiny_number"]
        ),
    }


def get_number_compatibility(num1: int, num2: int) -> dict:
    """Get compatibility between two numbers."""
    # Simple compatibility matrix
    compatibility = {
        (1, 1): "Strong", (1, 5): "Excellent", (1, 7): "Good",
        (2, 6): "Excellent", (2, 8): "Good", (2, 9): "Good",
        (3, 3): "Strong", (3, 5): "Excellent", (3, 9): "Good",
        (4, 7): "Excellent", (4, 8): "Good", (4, 2): "Good",
        (5, 5): "Strong", (5, 1): "Excellent", (5, 7): "Good",
        (6, 6): "Strong", (6, 2): "Excellent", (6, 9): "Good",
        (7, 7): "Strong", (7, 1): "Excellent", (7, 4): "Excellent",
        (8, 8): "Strong", (8, 2): "Good", (8, 4): "Good",
        (9, 9): "Strong", (9, 3): "Good", (9, 6): "Good",
    }

    result = compatibility.get((num1, num2), compatibility.get((num2, num1), "Neutral"))

    return {
        "number1": num1,
        "number2": num2,
        "compatibility": result,
    }
