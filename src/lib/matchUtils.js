/**
 * Central matching algorithm for Welove
 * Strict validation: missing essential data = no match (return false).
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
  const clean = t.toLowerCase().trim();
  return TRAIT_MAP[clean] || clean;
}

export function normalizeInterest(i) {
  if (!i) return '';
  const clean = i.toLowerCase().trim();
  return INTEREST_MAP[clean] || clean;
}

function genderMatch(myProfile, other) {
  if (!myProfile.gender || !myProfile.looking_for) return false;
  if (!other.gender || !other.looking_for) return false;

  const iWantThem = myProfile.looking_for === 'both' || myProfile.looking_for === other.gender;
  const theyWantMe = other.looking_for === 'both' || other.looking_for === myProfile.gender;
  return iWantThem && theyWantMe;
}

function relationshipGoalMatch(myProfile, other) {
  if (!myProfile.relationship_status || !other.relationship_status) return false;
  return myProfile.relationship_status === other.relationship_status;
}

function heightMatch(myProfile, other) {
  if (!myProfile.min_height_pref || !myProfile.max_height_pref || !other.height_cm) return false;
  if (!other.min_height_pref || !other.max_height_pref || !myProfile.height_cm) return false;

  const myPrefVsOtherHeight = other.height_cm >= myProfile.min_height_pref && other.height_cm <= myProfile.max_height_pref;
  const otherPrefVsMyHeight = myProfile.height_cm >= other.min_height_pref && myProfile.height_cm <= other.max_height_pref;
  return myPrefVsOtherHeight && otherPrefVsMyHeight;
}

function ageMatch(myProfile, other) {
  if (!myProfile.min_age_pref || !myProfile.max_age_pref || !other.age) return false;
  if (!other.min_age_pref || !other.max_age_pref || !myProfile.age) return false;

  const myPrefVsOtherAge = other.age >= myProfile.min_age_pref && other.age <= myProfile.max_age_pref;
  const otherPrefVsMyAge = myProfile.age >= other.min_age_pref && myProfile.age <= other.max_age_pref;
  return myPrefVsOtherAge && otherPrefVsMyAge;
}

export function getArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(e) { return val.split(',').map(s=>s.replace(/^"|"$/g,'').trim()); }
  }
  return [];
}

function traitsMatch(myProfile, other) {
  const t1 = getArray(myProfile.traits).map(normalizeTrait);
  const t2 = getArray(other.traits).map(normalizeTrait);
  if (!t1.length || !t2.length) return false;
  const shared = t1.filter((t) => t2.includes(t));
  return shared.length >= 1;
}

function interestsMatch(myProfile, other) {
  const i1 = getArray(myProfile.interests).map(normalizeInterest);
  const i2 = getArray(other.interests).map(normalizeInterest);
  if (!i1.length || !i2.length) return false;
  const shared = i1.filter((i) => i2.includes(i));
  return shared.length >= 1;
}

export function isMatch(myProfile, other) {
  if (!myProfile || !other) return false;
  if (!genderMatch(myProfile, other)) return false;
  if (!relationshipGoalMatch(myProfile, other)) return false;
  if (!ageMatch(myProfile, other)) return false;
  if (!heightMatch(myProfile, other)) return false;
  
  if (!traitsMatch(myProfile, other) && !interestsMatch(myProfile, other)) return false;
  
  return true;
}

export function calculateCompatibility(myProfile, other) {
  if (!isMatch(myProfile, other)) return 0;
  let score = 40;
  const t1 = getArray(myProfile.traits).map(normalizeTrait);
  const t2 = getArray(other.traits).map(normalizeTrait);
  const i1 = getArray(myProfile.interests).map(normalizeInterest);
  const i2 = getArray(other.interests).map(normalizeInterest);
  
  const sharedTraits = t1.filter((t) => t2.includes(t));
  const sharedInterests = i1.filter((i) => i2.includes(i));
  score += sharedTraits.length * 8;
  score += sharedInterests.length * 6;
  return Math.min(99, score);
}