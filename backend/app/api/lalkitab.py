"""Lal Kitab chart and remedies API."""

from fastapi import APIRouter, HTTPException
import logging

from ..models.birth_data import BirthData
from ..core.planets import get_planetary_positions
from ..core.houses import get_house_from_longitude

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/lalkitab", tags=["lalkitab"])

LALKITAB_REMEDIES = {
    "Sun": {
        "house_remedies": {
            1: "Offer water to Sun at sunrise. Wear Ruby gemstone.",
            2: "Donate wheat and jaggery on Sunday.",
            3: "Feed roti to dogs on Tuesday.",
            4: "Keep a copper vessel filled with water at your workplace.",
            5: "Donate honey at a temple.",
            6: "Keep a silver square with you.",
            7: "Offer water mixed with red flowers to Sun.",
            8: "Keep a copper coin in your pocket.",
            9: "Donate wheat and red cloth on Sunday.",
            10: "Offer water to Sun daily for career growth.",
            11: "Donate jaggery and wheat on Sunday.",
            12: "Keep a copper triangle under your pillow.",
        },
        "general": "Surya Namaskar, offering water to Sun, donating wheat on Sundays.",
    },
    "Moon": {
        "house_remedies": {
            1: "Keep a silver pot filled with water near your bed.",
            2: "Donate rice and silver on Monday.",
            3: "Feed white sweets to girls on Monday.",
            4: "Keep a silver ball or pearl with you.",
            5: "Donate milk at a temple on Monday.",
            6: "Keep a silver cup filled with milk under your pillow.",
            7: "Offer water mixed with milk to Moon on Monday.",
            8: "Keep a silver moon-shaped pendant.",
            9: "Donate white clothes and rice on Monday.",
            10: "Keep a silver Ganesha at your workplace.",
            11: "Donate white sweets on Monday.",
            12: "Keep a silver coin under your pillow.",
        },
        "general": "Fasting on Monday, wearing Pearl, donating rice and milk.",
    },
    "Mars": {
        "house_remedies": {
            1: "Keep a copper triangle with you. Donate masoor dal on Tuesday.",
            2: "Feed jaggery to monkeys on Tuesday.",
            3: "Donate red cloth and masoor dal on Tuesday.",
            4: "Keep a copper box at home.",
            5: "Donate sweets made of honey on Tuesday.",
            6: "Keep a copper coin in your pocket.",
            7: "Offer sweets to sisters/daughters on Tuesday.",
            8: "Keep a copper sword-shaped object at home.",
            9: "Donate a copper vessel at a temple.",
            10: "Keep red handkerchief with you.",
            11: "Feed lentils to dogs on Tuesday.",
            12: "Keep a copper Ganesha at home.",
        },
        "general": "Hanuman Chalisa on Tuesday, donating red lentils, visiting Hanuman temple.",
    },
    "Mercury": {
        "house_remedies": {
            1: "Wear emerald. Plant tulsi at home.",
            2: "Donate green moong dal on Wednesday.",
            3: "Feed green grass to cows on Wednesday.",
            4: "Keep a green handkerchief.",
            5: "Donate green sweets on Wednesday.",
            6: "Keep a silver Ganesha.",
            7: "Offer green vegetables to a priest on Wednesday.",
            8: "Keep a copper pot with green items.",
            9: "Donate green clothes on Wednesday.",
            10: "Keep green plants at workplace.",
            11: "Feed parrots green food.",
            12: "Keep emerald under your pillow.",
        },
        "general": "Donating green moong dal, wearing emerald, worshiping Vishnu.",
    },
    "Jupiter": {
        "house_remedies": {
            1: "Wear yellow sapphire. Donate turmeric on Thursday.",
            2: "Keep a yellow handkerchief.",
            3: "Feed bananas to monkeys on Thursday.",
            4: "Keep a yellow cloth at home.",
            5: "Donate yellow sweets on Thursday.",
            6: "Keep a silver pot with honey.",
            7: "Offer yellow flowers at a temple on Thursday.",
            8: "Keep a copper pot with turmeric water.",
            9: "Donate yellow clothes on Thursday.",
            10: "Keep yellow flowers at workplace.",
            11: "Feed yellow lentils to priests on Thursday.",
            12: "Keep yellow sapphire under your pillow.",
        },
        "general": "Donating yellow items on Thursday, wearing Yellow Sapphire, worshiping Brahaspati.",
    },
    "Venus": {
        "house_remedies": {
            1: "Wear diamond. Donate white sweets on Friday.",
            2: "Keep silver items at home.",
            3: "Feed white sweets to sisters/daughters on Friday.",
            4: "Keep a silver pot filled with water.",
            5: "Donate white clothes on Friday.",
            6: "Keep a silver square-shaped object.",
            7: "Offer white flowers at a temple on Friday.",
            8: "Keep a copper box with silver items.",
            9: "Donate silver on Friday.",
            10: "Keep white flowers at workplace.",
            11: "Feed white sweets to girls on Friday.",
            12: "Keep diamond under your pillow.",
        },
        "general": "Donating white sweets on Friday, wearing Diamond, worshiping Lakshmi.",
    },
    "Saturn": {
        "house_remedies": {
            1: "Wear blue sapphire. Donate mustard oil on Saturday.",
            2: "Keep iron items at home.",
            3: "Feed crows on Saturday.",
            4: "Keep a blue cloth at home.",
            5: "Donate black sesame seeds on Saturday.",
            6: "Keep a iron square-shaped object.",
            7: "Offer blue flowers at a temple on Saturday.",
            8: "Keep a copper pot with mustard oil.",
            9: "Donate black clothes on Saturday.",
            10: "Keep iron items at workplace.",
            11: "Feed black lentils to crows on Saturday.",
            12: "Keep blue sapphire under your pillow.",
        },
        "general": "Donating black sesame on Saturday, wearing Blue Sapphire (after testing), worshiping Shani.",
    },
}

RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

@router.post("/chart")
async def get_lalkitab_chart(birth_data: BirthData):
    """Generate Lal Kitab chart with house placements and remedies."""
    try:
        positions = get_planetary_positions(
            year=birth_data.birth_date.year,
            month=birth_data.birth_date.month,
            day=birth_data.birth_date.day,
            hour=birth_data.birth_time.hour,
            minute=birth_data.birth_time.minute,
            timezone_offset=birth_data.timezone_offset,
        )

        asc_sign = int(positions["ascendant"] / 30)

        # Assign planets to houses (whole-sign from ascendant)
        planet_houses = {}
        planet_signs = {}
        for p in positions["planets"]:
            planet_houses[p["planet"]] = get_house_from_longitude(
                p["longitude"], positions["ascendant"]
            )
            planet_signs[p["planet"]] = RASHI_NAMES[int(p["longitude"] / 30) % 12]

        # Build Lal Kitab chart (12 houses)
        lalkitab_chart = {}
        for house_num in range(1, 13):
            occupants = [
                name for name, h in planet_houses.items() if h == house_num
            ]
            lalkitab_chart[house_num] = {
                "house_number": house_num,
                "sign": RASHI_NAMES[(asc_sign + house_num - 1) % 12],
                "planets": occupants,
                # The page reads `occ.planet` for each occupant, so each needs
                # to be an object. The old response listed bare name strings,
                # which rendered as "undefined" in all twelve house cells.
                "occupants": [
                    {"planet": name, "sign": planet_signs.get(name)}
                    for name in occupants
                ],
            }

        # Collect remedies for each planet in chart.
        #
        # Returned as a LIST. The page renders `result.remedies.map(...)` and
        # reads `r.house`, `r.planet`, `r.sign` and `r.remedy`, but this was a
        # dict keyed by planet name with `house_remedy` and no `sign` at all,
        # so the page threw on the first call: `.map` is not a function.
        remedies_list = []
        for planet_name, house_num in planet_houses.items():
            if planet_name not in LALKITAB_REMEDIES:
                continue
            remedies = LALKITAB_REMEDIES[planet_name]
            remedies_list.append({
                "planet": planet_name,
                "house": house_num,
                "sign": planet_signs.get(planet_name),
                "remedy": remedies["house_remedies"].get(
                    house_num, remedies["general"]
                ),
                "general_remedy": remedies["general"],
            })
        remedies_list.sort(key=lambda r: r["house"])

        # A per-planet list, which is what the placements table renders. The
        # page formats `p.degree` to one decimal, so the within-sign degree is
        # included; the old response had no per-planet list at all.
        planets_list = [
            {
                "planet": p["planet"],
                "house": planet_houses[p["planet"]],
                "sign": planet_signs.get(p["planet"]),
                "degree": round(p["longitude"] % 30, 2),
            }
            for p in positions["planets"]
        ]
        planets_list.sort(key=lambda p: p["house"])

        # `houses` keyed by string, matching what the 12-house grid looks up.
        houses = {
            str(num): cell["occupants"] for num, cell in lalkitab_chart.items()
        }

        return {
            "name": birth_data.name,
            "birth_date": str(birth_data.birth_date),
            "birth_time": str(birth_data.birth_time),
            "birth_place": birth_data.birth_place,
            "asc_sign": RASHI_NAMES[asc_sign % 12],
            "houses": houses,
            "planets": planets_list,
            "remedies": remedies_list,
            "chart": lalkitab_chart,
            "planet_houses": planet_houses,
            "summary": "Lal Kitab remedies are simple, practical solutions based on planetary house placements in your birth chart.",
        }
    except Exception as e:
        logger.error(f"Lal Kitab error: {e}")
        raise HTTPException(status_code=500, detail="Error generating Lal Kitab chart.")
