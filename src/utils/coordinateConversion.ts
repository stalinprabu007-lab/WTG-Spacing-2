/**
 * Robust coordinate conversion module:
 * 1. UTM (Universal Transverse Mercator) to Lat/Lon (WGS84)
 * 2. Lat/Lon to UTM
 * 3. DMS (Degrees Minutes Seconds) to Decimal Degrees
 * 4. Decimal Degrees to DMS
 */

const WGS84_A = 6378137.0; // semi-major axis
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_B = WGS84_A * (1 - WGS84_F); // semi-minor axis
const WGS84_E = Math.sqrt(1 - (WGS84_B * WGS84_B) / (WGS84_A * WGS84_A)); // first eccentricity
const WGS84_E_PRIME_SQ = (WGS84_E * WGS84_E) / (1 - WGS84_E * WGS84_E); // second eccentricity squared
const UTM_K0 = 0.9996; // scale factor

export interface UtmCoordinate {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
}

/**
 * Converts UTM (WGS84) Easting, Northing, Zone, Hemisphere to Latitude and Longitude.
 */
export function utmToLatLon(
  easting: number,
  northing: number,
  zone: number,
  hemisphere: 'N' | 'S'
): { lat: number; lon: number } {
  const x = easting - 500000.0; // remove 500,000m false easting
  const y = hemisphere === 'S' ? northing - 10000000.0 : northing;

  const m = y / UTM_K0;
  const mu =
    m /
    (WGS84_A *
      (1 -
        Math.pow(WGS84_E, 2) / 4 -
        (3 * Math.pow(WGS84_E, 4)) / 64 -
        (5 * Math.pow(WGS84_E, 6)) / 256));

  const e1 = (1 - Math.sqrt(1 - Math.pow(WGS84_E, 2))) / (1 + Math.sqrt(1 - Math.pow(WGS84_E, 2)));

  const j1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
  const j2 = (21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32;
  const j3 = (151 * Math.pow(e1, 3)) / 96;
  const j4 = (1097 * Math.pow(e1, 4)) / 512;

  const fp =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);

  const c1 = WGS84_E_PRIME_SQ * Math.pow(cosFp, 2);
  const t1 = Math.pow(tanFp, 2);
  const r1 = (WGS84_A * (1 - Math.pow(WGS84_E, 2))) / Math.pow(1 - Math.pow(WGS84_E * sinFp, 2), 1.5);
  const n1 = WGS84_A / Math.sqrt(1 - Math.pow(WGS84_E * sinFp, 2));

  const d = x / (n1 * UTM_K0);

  // Latitude
  const latFactor1 = (n1 * tanFp) / r1;
  const latFactor2 = Math.pow(d, 2) / 2;
  const latFactor3 = ((5 + 3 * t1 + 10 * c1 - 4 * Math.pow(c1, 2) - 9 * WGS84_E_PRIME_SQ) * Math.pow(d, 4)) / 24;
  const latFactor4 =
    ((61 + 90 * t1 + 298 * c1 + 45 * Math.pow(t1, 2) - 252 * WGS84_E_PRIME_SQ - 3 * Math.pow(c1, 2)) *
      Math.pow(d, 6)) /
    720;

  const latRad = fp - latFactor1 * (latFactor2 - latFactor3 + latFactor4);
  const lat = (latRad * 180) / Math.PI;

  // Longitude
  const lonFactor1 = d;
  const lonFactor2 = ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6;
  const lonFactor3 =
    ((5 - 2 * c1 + 28 * t1 - 3 * Math.pow(c1, 2) + 8 * WGS84_E_PRIME_SQ + 24 * Math.pow(t1, 2)) *
      Math.pow(d, 5)) /
    120;

  const lonRad = (lonFactor1 - lonFactor2 + lonFactor3) / cosFp;
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const lon = centralMeridian + (lonRad * 180) / Math.PI;

  return { lat, lon };
}

/**
 * Converts Latitude and Longitude to UTM (WGS84).
 */
export function latLonToUtm(lat: number, lon: number): UtmCoordinate {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const centralMeridian = (zone - 1) * 6 - 180 + 3;
  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const centralMeridianRad = (centralMeridian * Math.PI) / 180;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const tanLat = Math.tan(latRad);

  const n = WGS84_A / Math.sqrt(1 - Math.pow(WGS84_E * sinLat, 2));
  const t = Math.pow(tanLat, 2);
  const c = WGS84_E_PRIME_SQ * Math.pow(cosLat, 2);
  const a = cosLat * (lonRad - centralMeridianRad);

  const m =
    WGS84_A *
    ((1 - Math.pow(WGS84_E, 2) / 4 - (3 * Math.pow(WGS84_E, 4)) / 64 - (5 * Math.pow(WGS84_E, 6)) / 256) * latRad -
      ((3 * Math.pow(WGS84_E, 2)) / 8 + (3 * Math.pow(WGS84_E, 4)) / 32 + (45 * Math.pow(WGS84_E, 6)) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * Math.pow(WGS84_E, 4)) / 256 + (45 * Math.pow(WGS84_E, 6)) / 1024) * Math.sin(4 * latRad) -
      ((35 * Math.pow(WGS84_E, 6)) / 3072) * Math.sin(6 * latRad));

  const easting =
    UTM_K0 *
      n *
      (a +
        ((1 - t + c) * Math.pow(a, 3)) / 6 +
        ((5 - 18 * t + Math.pow(t, 2) + 72 * c - 58 * WGS84_E_PRIME_SQ) * Math.pow(a, 5)) / 120) +
    500000.0;

  let northing =
    UTM_K0 *
    (m +
      n *
        tanLat *
        (Math.pow(a, 2) / 2 +
          ((5 - t + 9 * c + 4 * Math.pow(c, 2)) * Math.pow(a, 4)) / 24 +
          ((61 - 58 * t + Math.pow(t, 2) + 600 * c - 330 * WGS84_E_PRIME_SQ) * Math.pow(a, 6)) / 720));

  if (hemisphere === 'S') {
    northing += 10000000.0;
  }

  return {
    easting: Math.round(easting * 100) / 100,
    northing: Math.round(northing * 100) / 100,
    zone,
    hemisphere,
  };
}

/**
 * Parses a DMS string into decimal degrees.
 * Handles formats like:
 * - 15°11'03.16" N
 * - 15 11 03.16 S
 * - 15:11:03.16 W
 * - 153°08'19.2"E
 * - -27° 22' 57.6"
 */
export function dmsToDecimal(dmsStr: string): number | null {
  if (!dmsStr) return null;
  const clean = dmsStr.trim();
  if (!clean) return null;

  // If already pure decimal number
  const num = Number(clean);
  if (!isNaN(num)) return num;

  // Extract direction (N, S, E, W)
  const dirMatch = clean.match(/[NSEWnsew]/);
  const direction = dirMatch ? dirMatch[0].toUpperCase() : null;

  // Extract numbers (deg, min, sec) - strip degree/min/sec symbols and optional d/m/s unit suffixes
  const parts = clean
    .replace(/(\d)[dmsDMS](?=\s|$|\d)/g, '$1 ')
    .replace(/[NSEWnsew°'"′″:]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !isNaN(n));

  if (parts.length === 0) return null;

  const deg = Math.abs(parts[0] || 0);
  const min = parts[1] || 0;
  const sec = parts[2] || 0;

  let decimal = deg + min / 60 + sec / 3600;

  // Negative if S or W or leading minus sign
  if (direction === 'S' || direction === 'W' || clean.startsWith('-')) {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Converts decimal degrees to a clean formatted DMS string.
 * Example: formatToDms(15.18421, true) -> "15° 11' 03.2\" N"
 */
export function formatToDms(decimal: number, isLatitude: boolean): string {
  const dir = isLatitude ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W';
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  return `${deg}° ${min.toString().padStart(2, '0')}' ${sec.toFixed(2).padStart(5, '0')}" ${dir}`;
}

/**
 * Checks if a coordinate pair looks like UTM Easting/Northing values
 * (Easting typically 100,000 to 999,999, Northing typically 0 to 10,000,000).
 * Rejects geographic lat/lon pairs where both numbers are within [-180, 180].
 */
export function isLikelyUtm(val1: number, val2: number): boolean {
  if (!isFinite(val1) || !isFinite(val2)) return false;
  if (Math.abs(val1) <= 180 && Math.abs(val2) <= 180) return false;
  const isEasting = (val: number) => val >= 100000 && val <= 999999;
  const isNorthing = (val: number) => val >= 0 && val <= 10000000;

  return (isEasting(val1) && isNorthing(val2)) || (isEasting(val2) && isNorthing(val1));
}

