/**
 * Supported countries for Romety.
 * Each entry has:
 *   name    – Dutch display name
 *   code    – ISO 3166-1 alpha-2 (lowercase), used for Nominatim countrycodes
 *   center  – [lat, lng] map center
 *   zoom    – default map zoom when centering on this country
 *   bounds  – [lat_min, lat_max, lng_min, lng_max] used to filter Club coordinates
 */
export const COUNTRIES = [
  { name: 'Argentinië',               code: 'ar', center: [-34.61,  -58.38], zoom: 4,  bounds: [-55, -21, -74, -53] },
  { name: 'Australië',                code: 'au', center: [-25.27,  133.78], zoom: 4,  bounds: [-44, -9,  113, 154] },
  { name: 'België',                   code: 'be', center: [50.85,    4.35],  zoom: 8,  bounds: [49.5, 51.5,  2.5,  6.5] },
  { name: 'Canada',                   code: 'ca', center: [56.13,  -106.35], zoom: 3,  bounds: [41, 84,  -141, -52] },
  { name: 'Denemarken',               code: 'dk', center: [56.26,    9.50],  zoom: 7,  bounds: [54.5, 57.8,  8.0, 15.3] },
  { name: 'Duitsland',                code: 'de', center: [51.17,   10.45],  zoom: 6,  bounds: [47.3, 55.1,  5.9, 15.1] },
  { name: 'Estland',                  code: 'ee', center: [58.60,   25.01],  zoom: 7,  bounds: [57.5, 59.8, 21.8, 28.2] },
  { name: 'Filipijnen',               code: 'ph', center: [12.88,   121.77], zoom: 5,  bounds: [4.6, 21.3, 116.9, 126.6] },
  { name: 'Finland',                  code: 'fi', center: [64.95,   25.75],  zoom: 5,  bounds: [59.7, 70.1, 19.3, 31.6] },
  { name: 'Frankrijk',                code: 'fr', center: [46.23,    2.21],  zoom: 5,  bounds: [41.3, 51.2, -5.4, 9.7] },
  { name: 'Griekenland',              code: 'gr', center: [39.07,   21.82],  zoom: 6,  bounds: [34.8, 42.0, 19.4, 29.6] },
  { name: 'Ierland',                  code: 'ie', center: [53.41,   -8.24],  zoom: 7,  bounds: [51.4, 55.4, -10.5, -5.9] },
  { name: 'Israël',                   code: 'il', center: [31.05,   34.85],  zoom: 7,  bounds: [29.5, 33.3, 34.3, 35.9] },
  { name: 'Italië',                   code: 'it', center: [41.87,   12.57],  zoom: 5,  bounds: [36.6, 47.1, 6.6, 18.5] },
  { name: 'Japan',                    code: 'jp', center: [36.20,  138.25],  zoom: 5,  bounds: [24.0, 45.5, 122.9, 153.9] },
  { name: 'Luxemburg',                code: 'lu', center: [49.82,    6.13],  zoom: 9,  bounds: [49.4, 50.2,  5.7,  6.5] },
  { name: 'Maleisië',                 code: 'my', center: [4.21,   108.96],  zoom: 5,  bounds: [0.8, 7.4, 99.6, 119.3] },
  { name: 'Nederland',                code: 'nl', center: [52.37,    4.90],  zoom: 7,  bounds: [50.7, 53.6,  3.3,  7.3] },
  { name: 'Nieuw-Zeeland',            code: 'nz', center: [-40.90,  174.89], zoom: 5,  bounds: [-47.4, -34.4, 166.4, 178.6] },
  { name: 'Noorwegen',                code: 'no', center: [64.57,   17.89],  zoom: 4,  bounds: [57.9, 71.2,  4.5, 31.2] },
  { name: 'Oostenrijk',               code: 'at', center: [47.52,   14.55],  zoom: 7,  bounds: [46.4, 49.0,  9.5, 17.2] },
  { name: 'Polen',                    code: 'pl', center: [51.92,   19.15],  zoom: 6,  bounds: [49.0, 54.8, 14.1, 24.2] },
  { name: 'Portugal',                 code: 'pt', center: [39.40,   -8.22],  zoom: 6,  bounds: [36.9, 42.2, -9.5, -6.2] },
  { name: 'Singapore',                code: 'sg', center: [1.35,   103.82],  zoom: 11, bounds: [1.2,  1.5,  103.6, 104.1] },
  { name: 'Spanje',                   code: 'es', center: [40.46,   -3.75],  zoom: 5,  bounds: [36.0, 43.8, -9.3,  4.3] },
  { name: 'Tsjechië',                 code: 'cz', center: [49.82,   15.47],  zoom: 7,  bounds: [48.6, 51.1, 12.1, 18.9] },
  { name: 'Verenigd Koninkrijk',      code: 'gb', center: [55.38,   -3.44],  zoom: 5,  bounds: [49.9, 60.9, -8.6,  1.8] },
  { name: 'Verenigde Arabische Emiraten', code: 'ae', center: [23.42, 53.85], zoom: 7, bounds: [22.6, 26.1, 51.6, 56.4] },
  { name: 'Verenigde Staten',         code: 'us', center: [37.09, -95.71],   zoom: 4,  bounds: [24.5, 49.4, -125, -66] },
  { name: 'Zweden',                   code: 'se', center: [60.13,   18.64],  zoom: 5,  bounds: [55.3, 69.1, 10.9, 24.2] },
];

/** Default country when a user has no country set */
export const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'nl');

/** Look up a country by name (Dutch). Returns DEFAULT_COUNTRY if not found. */
export function getCountryByName(name) {
  return COUNTRIES.find(c => c.name === name) || DEFAULT_COUNTRY;
}

/** Check whether a venue coordinate [lat, lng] falls within a country's bounds */
export function venueInCountry(lat, lng, country) {
  if (!country || !country.bounds) return true;
  const [latMin, latMax, lngMin, lngMax] = country.bounds;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}
