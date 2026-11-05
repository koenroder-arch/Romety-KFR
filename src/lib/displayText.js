import { getLang } from '@/lib/LanguageContext';

/**
 * Vertaalt teksten die in de DATABASE staan (dierennamen, eigenschappen, interesses,
 * relatiedoelen, vaste meldingsteksten) naar de taal van de kijker.
 *
 * In de database blijft alles zoals het is opgeslagen; alleen de weergave verandert.
 * Werkt in beide richtingen: een Engelse waarde wordt voor een Nederlandse kijker
 * vertaald naar het Nederlands, en andersom.
 *
 * Gebruik:  import { dt } from '@/lib/displayText';   dt(profile.avatar)
 */

// Nederlands → Engels
const PAIRS = {
  // Dieren (avatars)
  Leeuw: 'Lion', Olifant: 'Elephant', Kangoeroe: 'Kangaroo', Dolfijn: 'Dolphin',
  Jachtluipaard: 'Cheetah', Ijsbeer: 'Polar bear', Gorilla: 'Gorilla', Vleermuis: 'Bat',
  Kameel: 'Camel', Egel: 'Hedgehog', Adelaar: 'Eagle', 'Pinguïn': 'Penguin',
  Kolibrie: 'Hummingbird', Uil: 'Owl', Flamingo: 'Flamingo', Zwaan: 'Swan', Specht: 'Woodpecker',
  Kameleon: 'Chameleon', Krokodil: 'Crocodile', Schildpad: 'Turtle', Salamander: 'Salamander',
  Kikker: 'Frog', Haai: 'Shark', Inktvis: 'Octopus', Zeester: 'Starfish', Koraalduivel: 'Lionfish',
  Zwaardvis: 'Swordfish', Vlinder: 'Butterfly', Libelle: 'Dragonfly', Vuurvliegje: 'Firefly',
  Vos: 'Fox',
  // Diercategorieën
  Zoogdieren: 'Mammals', Vogels: 'Birds', Reptielen: 'Reptiles', Zeedieren: 'Sea creatures', Overig: 'Other',

  // Eigenschappen
  Avontuurlijk: 'Adventurous', Creatief: 'Creative', Ambitieus: 'Ambitious', Zorgzaam: 'Caring',
  Grappig: 'Funny', Intellectueel: 'Intellectual', Romantisch: 'Romantic', Spontaan: 'Spontaneous',
  Sportief: 'Athletic', Relaxed: 'Laid-back', Gepassioneerd: 'Passionate', Loyaal: 'Loyal',

  // Interesses
  Reizen: 'Travel', Muziek: 'Music', Fitness: 'Fitness', Kunst: 'Art', Koken: 'Cooking',
  Fotografie: 'Photography', Lezen: 'Reading', Gaming: 'Gaming', Dansen: 'Dancing', Yoga: 'Yoga',
  Films: 'Movies', Natuur: 'Nature',

  // Relatiedoel / geslacht
  Relatie: 'Relationship', 'Fun time': 'Fun time', 'Ik weet het nog niet': 'Not sure yet',
  Man: 'Male', Vrouw: 'Female', Anders: 'Other', Beide: 'Both', 'Niet ingesteld': 'Not set',
  man: 'male', vrouw: 'female',

  // Landen die als naam in profielen staan
  Nederland: 'Netherlands', 'België': 'Belgium', Duitsland: 'Germany',

  // Vaste teksten in meldingen / systeemberichten
  'Wil met je chatten! 💬': 'Wants to chat with you! 💬',
  'Je supermatch': 'Your supermatch',
  'je supermatch': 'your supermatch',
  'Een Match': 'A match',
  'Je match': 'Your match',
  'Iemand': 'Someone',
  'iemand': 'someone',
  'Een chat is beëindigd wegens 7 dagen inactiviteit.': 'A chat was ended due to 7 days of inactivity.',
  'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.': 'A chat was ended because your match chose not to continue.',
  'Je chat-uitnodiging is geaccepteerd! 🎉': 'Your chat invite was accepted! 🎉',
  '💬 Chat gestart! Jullie hebben 48 uur om te chatten.': '💬 Chat started! You have 48 hours to chat.',
  '🎉 Beide contactgegevens zijn uitgewisseld! De chat wordt over 5 dagen verwijderd.': '🎉 Both contact details have been exchanged! The chat will be deleted in 5 days.',
  '📷 Heeft een foto gestuurd': '📷 Sent a photo',
  '48 uur extra chat! Stuur een foto': '48 extra hours of chat! Send a photo',
  'Nog 24 uur om te chatten!': '24 more hours to chat!',
  'Jullie kunnen nu contactgegevens uitwisselen!': 'You can now exchange contact details!',
  'Chat verlengd!': 'Chat extended!',
  Nummer: 'Number',
};

const NL_TO_EN = PAIRS;
const EN_TO_NL = Object.fromEntries(Object.entries(PAIRS).map(([nl, en]) => [en, nl]));

// Patronen met een variabel deel
const PATTERNS = [
  // "24 jaar" ↔ "24 years"
  { nl: /^(\d+) jaar$/, en: /^(\d+) years?$/, toEn: (m) => `${m[1]} years`, toNl: (m) => `${m[1]} jaar` },
  // 'Je hint: "..."' ↔ 'Your hint: "..."'
  { nl: /^Je hint: (.*)$/s, en: /^Your hint: (.*)$/s, toEn: (m) => `Your hint: ${m[1]}`, toNl: (m) => `Je hint: ${m[1]}` },
  // Gedeelde contactgegevens in de chat: "Nummer: 06..." ↔ "Number: 06..."
  { nl: /^Nummer: (.*)$/s, en: /^Number: (.*)$/s, toEn: (m) => `Number: ${m[1]}`, toNl: (m) => `Nummer: ${m[1]}` },
  // Melding: "📱 Contactgegevens gedeeld: Instagram"
  { nl: /^📱 Contactgegevens gedeeld: (.*)$/s, en: /^📱 Contact details shared: (.*)$/s,
    toEn: (m) => `📱 Contact details shared: ${m[1] === 'Nummer' ? 'Number' : m[1]}`,
    toNl: (m) => `📱 Contactgegevens gedeeld: ${m[1] === 'Number' ? 'Nummer' : m[1]}` },
];

const translateOne = (s, isEn) => {
  const key = s.trim();
  const dict = isEn ? NL_TO_EN : EN_TO_NL;
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  for (const p of PATTERNS) {
    const m = key.match(isEn ? p.nl : p.en);
    if (m) return isEn ? p.toEn(m) : p.toNl(m);
  }
  return null;
};

/** Vertaal één opgeslagen tekst. Onbekende tekst blijft ongewijzigd. */
export function dt(text, lang = getLang()) {
  if (text === null || text === undefined || typeof text !== 'string' || !text) return text;
  const isEn = lang === 'en';

  const whole = translateOne(text, isEn);
  if (whole !== null) return whole;

  // "🐊 Krokodil" of "🐊 Krokodil • 24 jaar": vertaal per deel, emoji blijft staan
  if (text.includes(' • ')) {
    return text.split(' • ').map((part) => dt(part, lang)).join(' • ');
  }
  const m = text.match(/^(\S+)\s+(.+)$/u);
  if (m && /\p{Extended_Pictographic}/u.test(m[1])) {
    const rest = translateOne(m[2], isEn);
    if (rest !== null) return `${m[1]} ${rest}`;
  }
  return text;
}

/** Vertaal een lijst opgeslagen waarden (bijv. traits/interests). */
export const dtList = (list, lang) => (Array.isArray(list) ? list.map((x) => dt(x, lang)) : list);
