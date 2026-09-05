/**
 * TOEGANKELIJK / MINDER STRENG Matching Algoritme voor Welove (Actief)
 * 
 * Matcht primair op:
 * 1. Geslacht & Zoekvoorkeur (man / vrouw / both / overig)
 * 2. Leeftijd & Leeftijdsvoorkeur (binnen elkaars minimum en maximum leeftijdsvoorkeur)
 * 3. Land (Nederland, België, etc.)
 * 
 * Lengte, eigenschappen (traits), interesses en relatiedoel zijn GEEN harde uitsluitingscriteria,
 * waardoor gebruikers veel sneller en gemakkelijker matches kunnen vinden.
 * 
 * (Het strikte originele algoritme is veilig opgeslagen in: src/lib/matchUtils.strict.js)
 */

const TRAIT_MAP = {
  'adventurous': 'avontuurlijk',
  'creative': 'creatief',
  'ambitious': 'ambitieus',
  'caring': 'zorgzaam',
  'funny': 'grappig',
  'intellectual': 'intellectueel',
  'romantic': 'romantisch',
  'spontaneous': 'spontaan',
  'athletic': 'sportief',
  'laid-back': 'relaxed',
  'passionate': 'gepassioneerd',
  'loyal': 'loyaal'
};

const INTEREST_MAP = {
  'travel': 'reizen',
  'music': 'muziek',
  'fitness': 'fitness',
  'art': 'kunst',
  'cooking': 'koken',
  'photography': 'fotografie',
  'reading': 'lezen',
  'gaming': 'gaming',
  'dancing': 'dansen',
  'yoga': 'yoga',
  'movies': 'films',
  'nature': 'natuur'
};

export function normalizeTrait(t) {
  if (!t) return '';
  const clean = String(t).toLowerCase().trim();
  return TRAIT_MAP[clean] || clean;
}

export function normalizeInterest(i) {
  if (!i) return '';
  const clean = String(i).toLowerCase().trim();
  return INTEREST_MAP[clean] || clean;
}

export function getArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { 
      const parsed = JSON.parse(val); 
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Controleert geslacht en zoekvoorkeur (man, vrouw, both/allebei/overig).
 */
function genderMatch(myProfile, other) {
  if (!myProfile || !other) return false;
  
  const myGender = (myProfile.gender || '').toLowerCase().trim();
  const myLookingFor = (myProfile.looking_for || 'both').toLowerCase().trim();
  const otherGender = (other.gender || '').toLowerCase().trim();
  const otherLookingFor = (other.looking_for || 'both').toLowerCase().trim();

  // Als data nog ontbreekt, sluit niet direct uit
  if (!myGender || !otherGender) return true;

  const iWantThem = myLookingFor === 'both' || myLookingFor === 'iedereen' || myLookingFor === 'all' || myLookingFor === otherGender;
  const theyWantMe = otherLookingFor === 'both' || otherLookingFor === 'iedereen' || otherLookingFor === 'all' || otherLookingFor === myGender;

  return iWantThem && theyWantMe;
}

/**
 * Controleert leeftijdsvoorkeur.
 */
function ageMatch(myProfile, other) {
  if (!myProfile || !other) return false;

  const myAge = parseInt(myProfile.age, 10);
  const otherAge = parseInt(other.age, 10);

  const myMin = parseInt(myProfile.min_age_pref, 10) || 18;
  const myMax = parseInt(myProfile.max_age_pref, 10) || 99;

  const otherMin = parseInt(other.min_age_pref, 10) || 18;
  const otherMax = parseInt(other.max_age_pref, 10) || 99;

  // Controleer of de ander binnen mijn leeftijdsvoorkeur valt (indien leeftijd bekend)
  if (!isNaN(otherAge)) {
    if (otherAge < myMin || otherAge > myMax) return false;
  }

  // Controleer of ik binnen de leeftijdsvoorkeur van de ander val (indien mijn leeftijd bekend)
  if (!isNaN(myAge)) {
    if (myAge < otherMin || myAge > otherMax) return false;
  }

  return true;
}

/**
 * Controleert of beide profielen zich in hetzelfde land bevinden.
 */
function countryMatch(myProfile, other) {
  const myCountry = (myProfile?.country || 'Nederland').trim().toLowerCase();
  const otherCountry = (other?.country || 'Nederland').trim().toLowerCase();
  return myCountry === otherCountry;
}

/**
 * Bepaalt of een profiel getoond mag worden aan de huidige gebruiker.
 * Nu minder streng: alleen geslacht, leeftijd en land.
 */
export function isMatch(myProfile, other) {
  if (!myProfile || !other) return false;
  if (myProfile.id && other.id && myProfile.id === other.id) return false;

  if (!genderMatch(myProfile, other)) return false;
  if (!ageMatch(myProfile, other)) return false;
  if (!countryMatch(myProfile, other)) return false;

  return true;
}

/**
 * Berekent de compatibiliteitsscore (tussen 50% en 99%).
 * Geeft een mooie score op basis van eventuele overlap in interesses, traits of relatiestatus.
 */
export function calculateCompatibility(myProfile, other) {
  if (!isMatch(myProfile, other)) return 0;

  let score = 55; // Vriendelijke basis score

  // Bonus als relatiestatus overeenkomt
  if (myProfile.relationship_status && other.relationship_status && myProfile.relationship_status === other.relationship_status) {
    score += 10;
  }

  // Bonus voor gedeelde traits
  const t1 = getArray(myProfile.traits).map(normalizeTrait);
  const t2 = getArray(other.traits).map(normalizeTrait);
  const sharedTraits = t1.filter(t => t && t2.includes(t));
  score += sharedTraits.length * 6;

  // Bonus voor gedeelde interesses
  const i1 = getArray(myProfile.interests).map(normalizeInterest);
  const i2 = getArray(other.interests).map(normalizeInterest);
  const sharedInterests = i1.filter(i => i && i2.includes(i));
  score += sharedInterests.length * 5;

  return Math.min(99, Math.max(50, score));
}