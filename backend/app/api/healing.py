"""Healing API endpoints — crystals, chakras, aromatherapy, sound healing, and personalised recommendations."""

import logging
from fastapi import Request
from fastapi import APIRouter, HTTPException

from ..models.birth_data import BirthData

logger = logging.getLogger(__name__)

from ..core.rate_limit import limiter
router = APIRouter(prefix="/api/v1/healing", tags=["healing"])


# ---------------------------------------------------------------------------
# Static data — crystals
# ---------------------------------------------------------------------------

CRYSTALS = [
    {
        "name": "Amethyst",
        "properties": "Calming, protective, spiritual awareness",
        "zodiac_associations": ["pisces", "aquarius", "capricorn"],
        "chakra_associations": ["third_eye", "crown"],
        "benefits": [
            "Enhances intuition and spiritual growth",
            "Relieves stress and anxiety",
            "Promotes restful sleep",
            "Supports sobriety and healthy habits",
        ],
    },
    {
        "name": "Rose Quartz",
        "properties": "Unconditional love, compassion, emotional healing",
        "zodiac_associations": ["taurus", "libra"],
        "chakra_associations": ["heart"],
        "benefits": [
            "Opens the heart to give and receive love",
            "Heals emotional wounds and grief",
            "Encourages self-love and self-acceptance",
            "Strengthens relationships and trust",
        ],
    },
    {
        "name": "Citrine",
        "properties": "Abundance, joy, manifestation",
        "zodiac_associations": ["gemini", "leo", "libra"],
        "chakra_associations": ["solar_plexus"],
        "benefits": [
            "Attracts prosperity and success",
            "Boosts confidence and motivation",
            "Dispels negative energy",
            "Stimulates creativity",
        ],
    },
    {
        "name": "Black Tourmaline",
        "properties": "Protection, grounding, purification",
        "zodiac_associations": ["libra", "capricorn"],
        "chakra_associations": ["root"],
        "benefits": [
            "Shields against electromagnetic radiation",
            "Promotes a sense of safety and security",
            "Aids in releasing negative thought patterns",
            "Supports physical detoxification",
        ],
    },
    {
        "name": "Lapis Lazuli",
        "properties": "Truth, wisdom, inner power",
        "zodiac_associations": ["sagittarius", "aquarius"],
        "chakra_associations": ["third_eye", "throat"],
        "benefits": [
            "Enhances intellectual ability and memory",
            "Promotes honest and clear communication",
            "Encourages deep self-reflection",
            "Supports the immune system",
        ],
    },
    {
        "name": "Carnelian",
        "properties": "Vitality, courage, creativity",
        "zodiac_associations": ["aries", "leo", "virgo"],
        "chakra_associations": ["sacral"],
        "benefits": [
            "Boosts physical energy and stamina",
            "Ignites passion and motivation",
            "Enhances creativity and artistic expression",
            "Supports reproductive health",
        ],
    },
    {
        "name": "Selenite",
        "properties": "Clarity, cleansing, angelic connection",
        "zodiac_associations": ["taurus"],
        "chakra_associations": ["crown"],
        "benefits": [
            "Clears energy blockages",
            "Promotes mental clarity and focus",
            "Facilitates deep meditation",
            "Cleanses other crystals and spaces",
        ],
    },
    {
        "name": "Tiger's Eye",
        "properties": "Confidence, willpower, protection",
        "zodiac_associations": ["gemini", "capricorn"],
        "chakra_associations": ["solar_plexus", "root"],
        "benefits": [
            "Attracts wealth and prosperity",
            "Boosts self-confidence and determination",
            "Shields from negative energies",
            "Helps make grounded decisions",
        ],
    },
    {
        "name": "Moonstone",
        "properties": "Intuition, new beginnings, emotional balance",
        "zodiac_associations": ["cancer", "libra", "scorpio"],
        "chakra_associations": ["third_eye", "crown"],
        "benefits": [
            "Enhances psychic abilities and intuition",
            "Supports women's health cycles",
            "Encourages emotional stability",
            "Promotes new beginnings and fresh starts",
        ],
    },
    {
        "name": "Emerald",
        "properties": "Love, prosperity, harmony",
        "zodiac_associations": ["taurus", "gemini", "cancer"],
        "chakra_associations": ["heart"],
        "benefits": [
            "Attracts love and loyalty",
            "Promotes emotional balance and harmony",
            "Supports heart health and circulation",
            "Encourages abundance and success",
        ],
    },
        {
            "name": "Aquamarine",
            "properties": "Calm, courage, clear communication",
            "zodiac_associations": ["pisces", "leo"],
            "chakra_associations": ["throat", "third_eye"],
            "benefits": [
                "Calms anxiety and nervous tension",
                "Supports clear expression of truth",
                "Traditionally linked to protection while travelling",
            ],
        },
        {
            "name": "Clear Quartz",
            "properties": "Clarity, amplification, focus",
            "zodiac_associations": ["aries", "leo", "sagittarius", "capricorn"],
            "chakra_associations": ["crown", "third_eye"],
            "benefits": [
                "Amplifies the intention of other stones",
                "Traditionally used for clarity and focus",
            ],
        },
        {
            "name": "Orange Calcite",
            "properties": "Creativity, confidence, joy",
            "zodiac_associations": ["aries", "sagittarius", "leo"],
            "chakra_associations": ["sacral", "solar_plexus"],
            "benefits": [
                "Encourages creative expression",
                "Traditionally used for confidence and personal drive",
            ],
        },
        {
            "name": "Red Jasper",
            "properties": "Grounding, vitality, steadiness",
            "zodiac_associations": ["aries", "scorpio", "capricorn"],
            "chakra_associations": ["root"],
            "benefits": [
                "Grounds scattered energy",
                "Traditionally worn as a steady protective stone",
            ],
        },
]


# ---------------------------------------------------------------------------
# Static data — chakras
# ---------------------------------------------------------------------------

CHAKRAS = [
    {
        "id": "root",
        "name": "Muladhara (Root Chakra)",
        "color": "Red",
        "description": "Foundation of the energy body, governs survival, stability, and grounding.",
        "associated_planet": "Saturn",
        "stone": "Red Jasper / Black Tourmaline",
        "mantra": "LAM",
        "healing_methods": [
            "Walking barefoot on earth (grounding)",
            "Root chakra meditation with visualization of red light",
            "Yoga poses: Mountain, Warrior I, Child's pose",
            "Essential oils: Vetiver, Cedarwood",
            "Drumming and percussion sound therapy",
        ],
    },
    {
        "id": "sacral",
        "name": "Svadhisthana (Sacral Chakra)",
        "color": "Orange",
        "description": "Centre of creativity, passion, pleasure, and emotional flow.",
        "associated_planet": "Venus",
        "stone": "Carnelian / Orange Calcite",
        "mantra": "VAM",
        "healing_methods": [
            "Dance and creative movement",
            "Sacral chakra meditation with warm water visualization",
            "Yoga poses: Goddess, Pigeon, Bound Angle",
            "Essential oils: Ylang-Ylang, Sandalwood",
            "Tabla and mridangam rhythmic healing",
        ],
    },
    {
        "id": "solar_plexus",
        "name": "Manipura (Solar Plexus Chakra)",
        "color": "Yellow",
        "description": "Seat of personal power, confidence, self-esteem, and willpower.",
        "associated_planet": "Sun / Mars",
        "stone": "Citrine / Tiger's Eye",
        "mantra": "RAM",
        "healing_methods": [
            "Sun exposure and solar breathing exercises",
            "Solar plexus meditation with golden light",
            "Yoga poses: Boat, Warrior III, Plank",
            "Essential oils: Lemon, Ginger, Juniper",
            # 396 Hz belongs to the Root Chakra per SOUND_HEALING below, which
            # names it "Liberating Guilt and Fear" and lists Saturn. The
            # solar plexus entry quoted it, pointing a reader at the wrong bowl.
            # 528 Hz is the one SOUND_HEALING associates with this chakra.
            "Singing bowl therapy tuned to 528 Hz",
        ],
    },
    {
        "id": "heart",
        "name": "Anahata (Heart Chakra)",
        "color": "Green / Pink",
        "description": "Centre of love, compassion, forgiveness, and emotional healing.",
        "associated_planet": "Venus / Jupiter",
        "stone": "Rose Quartz / Emerald",
        "mantra": "YAM",
        "healing_methods": [
            "Heart-opening yoga sequences",
            "Heart chakra meditation with emerald green light",
            "Yoga poses: Camel, Cobra, Bridge",
            "Essential oils: Rose, Eucalyptus, Bergamot",
            "Crystal singing bowl tuned to 639 Hz",
        ],
    },
    {
        "id": "throat",
        "name": "Vishuddha (Throat Chakra)",
        "color": "Blue",
        "description": "Centre of communication, self-expression, and truth.",
        "associated_planet": "Mercury / Jupiter",
        "stone": "Lapis Lazuli / Aquamarine",
        "mantra": "HAM",
        "healing_methods": [
            "Chanting and vocal exercises",
            "Throat chakra meditation with blue light",
            "Yoga poses: Shoulder stand, Fish, Plow",
            "Essential oils: Peppermint, Chamomile",
            "Singing bowl therapy tuned to 741 Hz",
        ],
    },
    {
        "id": "third_eye",
        "name": "Ajna (Third Eye Chakra)",
        "color": "Indigo",
        "description": "Centre of intuition, insight, imagination, and inner wisdom.",
        "associated_planet": "Moon / Jupiter",
        "stone": "Amethyst / Lapis Lazuli",
        "mantra": "OM",
        "healing_methods": [
            "Guided visualization and astral meditation",
            "Third eye meditation with indigo light",
            "Yoga poses: Eagle, Child's pose, Dolphin",
            "Essential oils: Frankincense, Sandalwood",
            "Singing bowl therapy tuned to 852 Hz",
        ],
    },
    {
        "id": "crown",
        "name": "Sahasrara (Crown Chakra)",
        "color": "Violet / White",
        "description": "Gateway to the divine, governs spiritual connection and universal consciousness.",
        "associated_planet": "Neptune / Ketu",
        "stone": "Selenite / Clear Quartz",
        "mantra": "AUM / Silence",
        "healing_methods": [
            "Silent meditation and prayer",
            "Crown chakra meditation with violet/white light",
            "Yoga poses: Headstand, Lotus, Corpse (Savasana)",
            "Essential oils: Lavender, Myrrh",
            "Singing bowl therapy tuned to 963 Hz",
        ],
    },
]


# ---------------------------------------------------------------------------
# Static data — aromatherapy
# ---------------------------------------------------------------------------

AROMATHERAPY = [
    {
        "name": "Lavender",
        "planetary_association": "Mercury",
        "zodiac_association": "virgo",
        "benefits": [
            "Calms the nervous system and reduces anxiety",
            "Promotes restful sleep and relieves insomnia",
            "Eases headaches and migraines",
            "Supports emotional balance and inner peace",
        ],
        "usage": "Diffuser, topical (diluted), bath",
    },
    {
        "name": "Sandalwood",
        "planetary_association": "Venus / Moon",
        "zodiac_association": "taurus",
        "benefits": [
            "Deepens meditation and spiritual practice",
            "Soothes restlessness and nervous tension",
            "Enhances mental clarity and focus",
            "Nourishes and rejuvenates the skin",
        ],
        "usage": "Diffuser, topical (diluted), prayer/incense",
    },
    {
        "name": "Frankincense",
        "planetary_association": "Sun",
        "zodiac_association": "leo",
        "benefits": [
            "Elevates spiritual awareness and connection",
            "Reduces inflammation and supports joint health",
            "Purifies the air and negative energies",
            "Calms the mind during deep meditation",
        ],
        "usage": "Diffuser, topical (diluted), resin incense",
    },
    {
        "name": "Peppermint",
        "planetary_association": "Mercury",
        "zodiac_association": "gemini",
        "benefits": [
            "Boosts energy, alertness, and concentration",
            "Relieves muscle tension and headaches",
            "Supports healthy digestion",
            "Opens the sinuses and respiratory passages",
        ],
        "usage": "Diffuser, topical (diluted), inhalation",
    },
    {
        "name": "Rose",
        "planetary_association": "Venus",
        "zodiac_association": "taurus / libra",
        "benefits": [
            "Opens the heart chakra and attracts love",
            "Alleviates grief, sadness, and depression",
            "Balances hormones and supports reproductive health",
            "Nourishes and rejuvenates the skin",
        ],
        "usage": "Diffuser, topical (diluted), rose water",
    },
    {
        "name": "Vetiver",
        "planetary_association": "Saturn / Mars",
        "zodiac_association": "capricorn",
        "benefits": [
            "Deeply grounding and stabilising",
            "Calms ADHD and hyperactivity",
            "Repels insects naturally",
            "Supports deep sleep and relaxation",
        ],
        "usage": "Diffuser, topical (diluted), bath",
    },
    {
        "name": "Cedarwood",
        "planetary_association": "Saturn",
        "zodiac_association": "capricorn",
        "benefits": [
            "Promotes a sense of safety and security",
            "Supports hair growth and scalp health",
            "Enhances focus during meditation",
            "Repels insects and purifies the air",
        ],
        "usage": "Diffuser, topical (diluted), room spray",
    },
    {
        "name": "Eucalyptus",
        "planetary_association": "Mercury / Mars",
        "zodiac_association": "aries",
        "benefits": [
            "Opens respiratory pathways and eases breathing",
            "Clears mental fog and improves concentration",
            "Supports immune function",
            "Relieves muscular aches and pains",
        ],
        "usage": "Diffuser, steam inhalation, topical (diluted)",
    },
    {
        "name": "Bergamot",
        "planetary_association": "Mercury",
        "zodiac_association": "virgo",
        "benefits": [
            "Traditionally used to lift mood",
            "Astringent, used in skin preparations",
        ],
        "usage": "Diffuser, topical (diluted)",
    },
    {
        "name": "Chamomile",
        "planetary_association": "Moon",
        "zodiac_association": "cancer",
        "benefits": [
            "Traditionally used to calm and ease tension",
            "Widely drunk as a tea",
        ],
        "usage": "Diffuser, tea, topical (diluted)",
    },
    {
        "name": "Ginger",
        "planetary_association": "Mars / Sun",
        "zodiac_association": "leo",
        "benefits": [
            "Traditionally used as a warming stimulant",
            "Used in digestive preparations",
        ],
        "usage": "Diffuser, culinary, topical (diluted)",
    },
    {
        "name": "Juniper",
        "planetary_association": "Saturn / Mars",
        "zodiac_association": "capricorn",
        "benefits": [
            "Traditionally used for purification",
            "Sharp, resinous aroma",
        ],
        "usage": "Diffuser, topical (diluted)",
    },
    {
        "name": "Lemon",
        "planetary_association": "Mercury / Sun",
        "zodiac_association": "gemini",
        "benefits": [
            "Traditionally used to lift mood and sharpen focus",
            "Bright, clean scent",
        ],
        "usage": "Diffuser, culinary, topical (diluted)",
    },
    {
        "name": "Myrrh",
        "planetary_association": "Saturn",
        "zodiac_association": "scorpio",
        "benefits": [
            "Traditionally used as a meditation resin",
            "Deep, resinous aroma",
        ],
        "usage": "Resin incense, diffuser, topical (diluted)",
    },
    {
        "name": "Rosemary",
        "planetary_association": "Sun / Moon",
        "zodiac_association": "aries",
        "benefits": [
            "Traditionally used to sharpen memory and focus",
            "Stimulating herb, also culinary",
        ],
        "usage": "Diffuser, culinary, topical (diluted)",
    },
    {
        # The sign map for Sagittarius named "Orange", which is a fruit rather
        # than an oil. Named here as sweet orange, the essential oil of it.
        "name": "Sweet Orange",
        "planetary_association": "Sun / Jupiter",
        "zodiac_association": "sagittarius",
        "benefits": [
            "Traditionally used to lift mood",
            "Warm, bright citrus aroma",
        ],
        "usage": "Diffuser, culinary, topical (diluted)",
    },
    {
        "name": "Ylang-Ylang",
        "planetary_association": "Venus / Moon",
        "zodiac_association": "libra",
        "benefits": [
            "Traditionally used to ease tension",
            "Sweet, floral aroma",
        ],
        "usage": "Diffuser, topical (diluted)",
    },
]


# ---------------------------------------------------------------------------
# Static data — sound healing
# ---------------------------------------------------------------------------

SOUND_HEALING = [
    {
        "frequency": "396 Hz",
        "name": "Liberating Guilt and Fear",
        "associated_planet": "Saturn",
        "benefits": [
            "Releases deep-rooted fears and anxieties",
            "Dissolves guilt and self-doubt",
            "Promotes a sense of safety and liberation",
            "Aligns with the Root Chakra",
        ],
        "recommended_raga": "Raga Darbari Kanada",
        "best_time": "Evening (6:00 PM - 9:00 PM)",
    },
    {
        "frequency": "417 Hz",
        "name": "Facilitating Change",
        "associated_planet": "Uranus / Jupiter",
        "benefits": [
            "Clears negative energy from the body and space",
            "Facilitates emotional and physical change",
            "Restores balance and creates a fresh start",
            "Aligns with the Sacral Chakra",
        ],
        "recommended_raga": "Raga Bhairavi",
        "best_time": "Sunrise (5:00 AM - 7:00 AM)",
    },
    {
        "frequency": "432 Hz",
        "name": "Natural Harmony",
        "associated_planet": "Venus",
        "benefits": [
            "Calms the nervous system and lowers blood pressure",
            "Enhances clarity, intuition, and peacefulness",
            "Resonates with nature's vibrations",
            "Deepens meditation and yoga practice",
        ],
        "recommended_raga": "Raga Yaman",
        "best_time": "Evening (7:00 PM - 10:00 PM)",
    },
    {
        "frequency": "528 Hz",
        "name": "Love and Miracles / DNA Repair",
        "associated_planet": "Sun / Jupiter",
        "benefits": [
            "Associated with DNA repair and cellular healing",
            "Promotes love, joy, and miracles in daily life",
            "Boosts energy, confidence, and inner strength",
            "Aligns with the Solar Plexus Chakra",
        ],
        "recommended_raga": "Raga Bhimpalasi",
        "best_time": "Afternoon (12:00 PM - 3:00 PM)",
    },
    {
        "frequency": "639 Hz",
        "name": "Connecting and Relationships",
        "associated_planet": "Venus / Neptune",
        "benefits": [
            "Enhances communication and understanding",
            "Deepens romantic bonds and friendships",
            "Heals heartbreak and emotional wounds",
            "Aligns with the Heart Chakra",
        ],
        "recommended_raga": "Raga Malkauns",
        "best_time": "Midnight (10:00 PM - 2:00 AM)",
    },
    {
        "frequency": "741 Hz",
        "name": "Expression and Intuition",
        "associated_planet": "Mercury / Neptune",
        "benefits": [
            "Cleanses and detoxifies the body",
            "Enhances intuitive and psychic abilities",
            "Promotes authentic self-expression",
            "Aligns with the Throat Chakra",
        ],
        "recommended_raga": "Raga Ahir Bhairav",
        "best_time": "Early Morning (4:00 AM - 7:00 AM)",
    },
    {
        "frequency": "852 Hz",
        "name": "Returning to Spiritual Order",
        "associated_planet": "Moon / Ketu",
        "benefits": [
            "Awakens the Third Eye and deepens intuition",
            "Helps you see through illusion and confusion",
            "Enhances spiritual insight and awareness",
            "Aligns with the Third Eye Chakra",
        ],
        "recommended_raga": "Raga Marwa",
        "best_time": "Sunrise (4:30 AM - 6:00 AM)",
    },
    {
        "frequency": "963 Hz",
        "name": "Divine Consciousness",
        "associated_planet": "Neptune / Ketu",
        "benefits": [
            "Connects you to the Divine and universal energy",
            "Activates the pineal gland and crown chakra",
            "Promotes a sense of oneness and spiritual awakening",
            "Aligns with the Crown Chakra",
        ],
        "recommended_raga": "Raga Todi",
        "best_time": "Sunrise (4:00 AM - 6:00 AM)",
    },
]


# ---------------------------------------------------------------------------
# Helper — derive a sun-sign string from birth data
# ---------------------------------------------------------------------------

_SUN_SIGN_RANGES = [
    ("aries", (3, 21), (4, 19)),
    ("taurus", (4, 20), (5, 20)),
    ("gemini", (5, 21), (6, 20)),
    ("cancer", (6, 21), (7, 22)),
    ("leo", (7, 23), (8, 22)),
    ("virgo", (8, 23), (9, 22)),
    ("libra", (9, 23), (10, 22)),
    ("scorpio", (10, 23), (11, 21)),
    ("sagittarius", (11, 22), (12, 21)),
    ("capricorn", (12, 22), (1, 19)),
    ("aquarius", (1, 20), (2, 18)),
    ("pisces", (2, 19), (3, 20)),
]


def _sun_sign_from_birth(data: BirthData) -> str:
    """Determine zodiac sign from birth date."""
    month, day = data.birth_date.month, data.birth_date.day
    for sign, (sm, sd), (em, ed) in _SUN_SIGN_RANGES:
        if sign == "capricorn":
            if (month == 12 and day >= sd) or (month == 1 and day <= ed):
                return sign
        elif sm == em:
            if month == sm and sd <= day <= ed:
                return sign
        else:
            if (month == sm and day >= sd) or (month == em and day <= ed):
                return sign
    return "aries"


# ---------------------------------------------------------------------------
# Helper — build a personalised recommendation
# ---------------------------------------------------------------------------

# Body to chakra.
#
# Uranus and Neptune were already listed here. I had assumed they were wrong --
# that the engine computed only the seven grahas and the nodes -- and removed
# them. That was incorrect: `get_planetary_positions` returns twelve bodies,
# including Uranus, Neptune and Pluto. Pluto was missing, so the map has been
# completed rather than trimmed.
_PLANET_CHAKRA_MAP = {
    "Saturn": "root",
    "Venus": "heart",
    "Sun": "solar_plexus",
    "Mars": "solar_plexus",
    "Jupiter": "heart",
    "Mercury": "throat",
    "Moon": "third_eye",
    "Rahu": "third_eye",
    "Ketu": "crown",
    "Uranus": "sacral",
    "Neptune": "crown",
    "Pluto": "root",
}

_SIGN_DOMINANT_CHAKRA = {
    "aries": "solar_plexus",
    "taurus": "sacral",
    "gemini": "throat",
    "cancer": "heart",
    "leo": "solar_plexus",
    "virgo": "root",
    "libra": "heart",
    "scorpio": "sacral",
    "sagittarius": "throat",
    "capricorn": "root",
    "aquarius": "third_eye",
    "pisces": "crown",
}

_SIGN_RECOMMENDED_OILS = {
    "aries": ["Eucalyptus", "Peppermint", "Rosemary"],
    "taurus": ["Rose", "Sandalwood", "Cedarwood"],
    "gemini": ["Peppermint", "Lavender", "Lemon"],
    "cancer": ["Lavender", "Rose", "Chamomile"],
    "leo": ["Frankincense", "Sandalwood", "Cedarwood"],
    "virgo": ["Lavender", "Peppermint", "Eucalyptus"],
    "libra": ["Rose", "Lavender", "Ylang-Ylang"],
    "scorpio": ["Vetiver", "Frankincense", "Myrrh"],
    "sagittarius": ["Peppermint", "Cedarwood", "Sweet Orange"],
    "capricorn": ["Vetiver", "Cedarwood", "Frankincense"],
    "aquarius": ["Eucalyptus", "Lavender", "Peppermint"],
    "pisces": ["Sandalwood", "Lavender", "Frankincense"],
}


def _build_recommendation(data: BirthData) -> dict:
    """Build a healing recommendation based on birth details."""
    sign = _sun_sign_from_birth(data)
    dominant_chakra = _SIGN_DOMINANT_CHAKRA.get(sign, "heart")

    # Pick crystals that match the sun sign or dominant chakra
    matched_crystals = [
        c["name"]
        for c in CRYSTALS
        if sign in c["zodiac_associations"]
        or dominant_chakra in c["chakra_associations"]
    ]

    # Pick chakras — focus on dominant + neighbours
    chakra_ids = ["root", "sacral", "solar_plexus", "heart", "throat", "third_eye", "crown"]
    idx = chakra_ids.index(dominant_chakra) if dominant_chakra in chakra_ids else 3
    focus_chakras = [
        CHAKRAS[i]["name"]
        for i in range(max(0, idx - 1), min(len(chakra_ids), idx + 2))
    ]

    # Pick aromatherapy oils that match the sun sign
    matched_oils = _SIGN_RECOMMENDED_OILS.get(sign, ["Lavender", "Sandalwood"])

    # Pick a healing frequency that corresponds to the dominant chakra
    chakra_freq_map = {
        "root": "396 Hz",
        "sacral": "417 Hz",
        "solar_plexus": "528 Hz",
        "heart": "639 Hz",
        "throat": "741 Hz",
        "third_eye": "852 Hz",
        "crown": "963 Hz",
    }
    target_freq = chakra_freq_map.get(dominant_chakra, "528 Hz")
    matched_sound = [s for s in SOUND_HEALING if s["frequency"] == target_freq]

    return {
        "sun_sign": sign,
        "dominant_chakra": dominant_chakra,
        "recommended_crystals": matched_crystals,
        "chakras_to_focus_on": focus_chakras,
        "recommended_aromatherapy": matched_oils,
        "recommended_sound_healing": matched_sound[0] if matched_sound else SOUND_HEALING[2],
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/crystals")
@limiter.limit("30/minute")
async def get_crystals(request: Request, ):
    """Return a list of healing crystals with their properties and associations."""
    return {"crystals": CRYSTALS}


@router.get("/chakras")
@limiter.limit("30/minute")
async def get_chakras(request: Request, ):
    """Return the seven chakras with descriptions, planets, stones, mantras, and healing methods."""
    return {"chakras": CHAKRAS}


@router.get("/aromatherapy")
@limiter.limit("30/minute")
async def get_aromatherapy(request: Request, ):
    """Return aromatherapy oils with planetary/zodiac associations and benefits."""
    return {"aromatherapy": AROMATHERAPY}


@router.get("/sound-healing")
@limiter.limit("30/minute")
async def get_sound_healing(request: Request, ):
    """Return sound healing frequencies with associated planets, benefits, and recommended raga/time."""
    return {"sound_healing": SOUND_HEALING}


@router.post("/recommend")
@limiter.limit("30/minute")
async def get_healing_recommendation(request: Request, data: BirthData):
    """Recommend crystals, chakras, aromatherapy, and sound healing based on birth details."""
    try:
        recommendation = _build_recommendation(data)
        return {
            "name": data.name,
            "birth_date": data.birth_date.isoformat(),
            "recommendation": recommendation,
        }
    except Exception as e:
        logger.error(f"Healing recommendation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate healing recommendation")
