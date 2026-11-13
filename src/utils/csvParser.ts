import { WTGPoint } from '../types/wtg';
import { dmsToDecimal, isLikelyUtm, utmToLatLon } from './coordinateConversion';

/**
 * Splits a CSV text line into cells, respecting quoted fields.
 */
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (!inQuotes) {
        // Only open a quoted field at the start of a cell; mid-cell quotes (e.g. DMS 32.75") are literal
        if (current.trim().length === 0) {
          inQuotes = true;
          current = '';
        } else {
          current += '"';
        }
      } else if (line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        // Only close the quoted field if followed by delimiter or end-of-line (allows unescaped DMS " inside quotes)
        const rest = line.slice(i + 1).trimStart();
        if (rest.length === 0 || rest.startsWith(delimiter)) {
          inQuotes = false;
        } else {
          current += '"';
        }
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detects the delimiter used in CSV text (comma, tab, semicolon).
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

export interface CsvParseOptions {
  coordinateType?: 'auto' | 'decimal_degrees' | 'dms' | 'utm';
  defaultUtmZone?: number;
  defaultUtmHemisphere?: 'N' | 'S';
}

export interface CsvParseResult {
  points: WTGPoint[];
  headers: string[];
  coordinateTypeDetected: 'decimal_degrees' | 'dms' | 'utm';
  utmZoneUsed?: string;
}

/**
 * Parses a numeric coordinate value from a CSV cell, handling thousand-separator commas,
 * optional trailing unit markers ("m", "°"), and whitespace.
 */
export function parseCoordNumber(raw: string | undefined): number {
  if (!raw) return NaN;
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  // Strip thousand commas only if formatted as grouped thousands or general numeric with commas
  const noCommas = trimmed.replace(/,/g, '');
  const cleaned = noCommas.replace(/\s*(m|meters|deg|°)$/i, '').trim();
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  return parseFloat(cleaned);
}

/**
 * Checks whether a cell string represents a DMS (Degrees Minutes Seconds) or cardinal-suffixed coordinate.
 */
export function looksLikeDmsString(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Pure decimal number (optionally with trailing °) is not multi-part DMS unless cardinal letter present
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) return false;
  if (/[°'"′″:]/.test(trimmed)) return true;
  if (/\d\s*[NSEWnsew]\s*$/.test(trimmed) || /^[NSEWnsew]\s*\d/.test(trimmed)) return true;
  // Space-separated D M S (e.g. "15 11 03.16")
  if (/^[+-]?\d{1,3}\s+\d{1,2}(\s+\d{1,2}(\.\d+)?)?$/.test(trimmed)) return true;
  return false;
}

/**
 * Parses UTM zone number and hemisphere from Zone / Hemisphere cell values.
 */
function parseUtmZoneAndHemi(
  zoneCell: string | undefined,
  hemiCell: string | undefined,
  defaultZone: number,
  defaultHemi: 'N' | 'S'
): { zone: number; hemi: 'N' | 'S'; zoneStr?: string } {
  let zone = defaultZone;
  let hemi: 'N' | 'S' = defaultHemi;
  const zTrim = zoneCell?.trim() || '';
  const hTrim = hemiCell?.trim() || '';

  if (zTrim) {
    const zMatch = zTrim.match(/(\d{1,2})/);
    if (zMatch) {
      const parsed = parseInt(zMatch[1], 10);
      if (parsed >= 1 && parsed <= 60) zone = parsed;
    }
    if (/south/i.test(zTrim) || /\d\s*s$/i.test(zTrim)) {
      hemi = 'S';
    } else if (/north/i.test(zTrim) || /\d\s*n$/i.test(zTrim)) {
      hemi = 'N';
    } else {
      // MGRS band letter fallback: C-M Southern, N-X Northern
      const bandMatch = zTrim.match(/\d\s*([C-Xc-x])$/);
      if (bandMatch) {
        const ch = bandMatch[1].toUpperCase();
        if (ch >= 'C' && ch <= 'M') hemi = 'S';
        else hemi = 'N';
      }
    }
  }

  if (hTrim) {
    if (/^s(outh)?$/i.test(hTrim)) hemi = 'S';
    else if (/^n(orth)?$/i.test(hTrim)) hemi = 'N';
  }

  return {
    zone,
    hemi,
    zoneStr: zTrim ? (hTrim && !/[NSns]/.test(zTrim) ? `${zone}${hemi}` : zTrim) : undefined,
  };
}

/**
 * Parses a CSV string containing WTG or infrastructure placemarks with attributes.
 * Enforces standard GIS axis mapping:
 * - Easting = X axis (Longitude in DD/DMS, Easting in UTM)
 * - Northing = Y axis (Latitude in DD/DMS, Northing in UTM)
 * Handles Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and UTM.
 */
export function parseCsvWithCoordinates(
  csvText: string,
  options: CsvParseOptions = {}
): CsvParseResult {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV file is empty.');
  }

  const delimiter = detectDelimiter(cleanText);
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const normalizedHeaders = rawHeaders.map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.\(\)\[\]\/]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^_+|_+$/g, '')
  );

  // Prioritized exact-first, then token/word-safe column matcher
  const findBestCol = (
    exactCandidates: string[],
    tokenCandidates: string[] = []
  ): number => {
    for (const pat of exactCandidates) {
      const idx = normalizedHeaders.findIndex((h) => h === pat);
      if (idx !== -1) return idx;
    }
    for (const pat of tokenCandidates) {
      const idx = normalizedHeaders.findIndex((h) => {
        const tokens = h.split('_');
        return tokens.includes(pat) || (pat.length >= 4 && h.includes(pat));
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // 1. Identify coordinate columns strictly preserving GIS convention:
  //    X = Easting / Longitude, Y = Northing / Latitude
  const utmEastIdx = findBestCol(
    [
      'easting',
      'utm_easting',
      'utmeasting',
      'utm_east',
      'utmeast',
      'utm_x',
      'utmx',
      'x_utm',
      'xutm',
      'e_utm',
      'eutm',
      'x_easting',
      'easting_x',
      'easting_m',
      'east_m',
      'east_coord',
      'east',
      'e',
      'x_east',
      'east_x',
    ],
    ['easting', 'utm_east', 'x_utm', 'easting_m', 'e_utm']
  );

  const utmNorthIdx = findBestCol(
    [
      'northing',
      'utm_northing',
      'utmnorthing',
      'utm_north',
      'utmnorth',
      'utm_y',
      'utmy',
      'y_utm',
      'yutm',
      'n_utm',
      'nutm',
      'y_northing',
      'northing_y',
      'northing_m',
      'north_m',
      'north_coord',
      'north',
      'n',
      'y_north',
      'north_y',
    ],
    ['northing', 'utm_north', 'y_utm', 'northing_m', 'n_utm']
  );

  const xGenericIdx = findBestCol(
    [
      'x',
      'x_coord',
      'xcoord',
      'coor_x',
      'coorx',
      'x_coordinate',
      'xcoordinate',
      'coord_x',
      'coordx',
      'point_x',
      'pointx',
      'x_m',
      'xm',
      'pos_x',
      'posx',
      'x_dd',
      'x_wgs84',
      'wgs84_x',
      'wtg_x',
    ],
    ['point_x', 'coord_x', 'x_coord', 'x_coordinate', 'coor_x']
  );

  const yGenericIdx = findBestCol(
    [
      'y',
      'y_coord',
      'ycoord',
      'coor_y',
      'coory',
      'y_coordinate',
      'ycoordinate',
      'coord_y',
      'coordy',
      'point_y',
      'pointy',
      'y_m',
      'ym',
      'pos_y',
      'posy',
      'y_dd',
      'y_wgs84',
      'wgs84_y',
      'wtg_y',
    ],
    ['point_y', 'coord_y', 'y_coord', 'y_coordinate', 'coor_y']
  );

  const latExplicitIdx = findBestCol(
    [
      'gda_lat',
      'latitude',
      'lat_dms',
      'latdms',
      'lat_dd',
      'latdd',
      'lat',
      'lat_deg',
      'y_lat',
      'lat_y',
    ],
    ['latitude', 'gda_lat', 'lat_dms', 'lat_dd']
  );

  const lonExplicitIdx = findBestCol(
    [
      'gda_long',
      'gda_lon',
      'longitude',
      'long_dms',
      'londms',
      'lon_dms',
      'long_dd',
      'lon_dd',
      'londd',
      'lon',
      'long',
      'lng',
      'lon_deg',
      'long_deg',
      'x_lon',
      'x_long',
      'lon_x',
    ],
    ['longitude', 'gda_long', 'gda_lon', 'long_dms', 'lon_dms', 'long_dd', 'lon_dd']
  );

  const zoneColIdx = findBestCol(['utm_zone', 'utmzone', 'zone'], ['utm_zone', 'zone']);
  const hemiColIdx = findBestCol(
    ['hemisphere', 'hemi', 'utm_hemi', 'utm_hemisphere', 'ns', 'n_s', 'zone_hemi'],
    ['hemisphere', 'hemi']
  );

  // Resolved axis indices:
  // X-axis = Easting / Longitude
  // Y-axis = Northing / Latitude
  let eastingColIdx = utmEastIdx !== -1 ? utmEastIdx : xGenericIdx;
  let northingColIdx = utmNorthIdx !== -1 ? utmNorthIdx : yGenericIdx;
  let latColIdx = latExplicitIdx !== -1 ? latExplicitIdx : yGenericIdx;
  let lonColIdx = lonExplicitIdx !== -1 ? lonExplicitIdx : xGenericIdx;

  // Cross-fallback: if user has DD inside columns named Easting/Northing OR UTM inside Lat/Lon
  if (latColIdx === -1 && utmNorthIdx !== -1) latColIdx = utmNorthIdx;
  if (lonColIdx === -1 && utmEastIdx !== -1) lonColIdx = utmEastIdx;
  if (eastingColIdx === -1 && lonExplicitIdx !== -1) eastingColIdx = lonExplicitIdx;
  if (northingColIdx === -1 && latExplicitIdx !== -1) northingColIdx = latExplicitIdx;

  // Gather sample data rows (up to first 5 non-empty data rows)
  const sampleRows: string[][] = [];
  for (let i = 1; i < lines.length && sampleRows.length < 5; i++) {
    const row = parseCsvLine(lines[i], delimiter);
    if (row.length >= 2) sampleRows.push(row);
  }
  const firstDataLine = sampleRows[0] || [];

  // Fallback if no coordinate headers were recognized at all:
  // Scan columns of sample rows to locate two coordinate columns
  if (
    (eastingColIdx === -1 || northingColIdx === -1) &&
    (latColIdx === -1 || lonColIdx === -1) &&
    firstDataLine.length >= 2
  ) {
    const candidateCols: number[] = [];
    for (let c = 0; c < firstDataLine.length; c++) {
      if (c === zoneColIdx || c === hemiColIdx) continue;
      const cell = firstDataLine[c];
      if (!isNaN(parseCoordNumber(cell)) || looksLikeDmsString(cell)) {
        candidateCols.push(c);
      }
    }
    if (candidateCols.length >= 2) {
      // Pick pair of coordinate columns (prefer last two numeric non-integer-id columns or adjacent numeric pair)
      let c1 = candidateCols[0];
      let c2 = candidateCols[1];
      if (candidateCols.length > 2) {
        // Skip small integer serial numbers (e.g. col 0 = 1, 2, 3) if another decimal/UTM pair exists
        for (let k = 0; k < candidateCols.length - 1; k++) {
          const v1 = parseCoordNumber(firstDataLine[candidateCols[k]]);
          const v2 = parseCoordNumber(firstDataLine[candidateCols[k + 1]]);
          if (
            (!isNaN(v1) && !isNaN(v2) && (isLikelyUtm(v1, v2) || (Math.abs(v1) <= 180 && Math.abs(v2) <= 180 && (v1 % 1 !== 0 || v2 % 1 !== 0)))) ||
            (looksLikeDmsString(firstDataLine[candidateCols[k]]) && looksLikeDmsString(firstDataLine[candidateCols[k + 1]]))
          ) {
            c1 = candidateCols[k];
            c2 = candidateCols[k + 1];
            break;
          }
        }
      }
      // Assume GIS X, Y order (c1 = X / Easting / Lon, c2 = Y / Northing / Lat)
      if (eastingColIdx === -1) eastingColIdx = c1;
      if (northingColIdx === -1) northingColIdx = c2;
      if (lonColIdx === -1) lonColIdx = c1;
      if (latColIdx === -1) latColIdx = c2;
    }
  }

  // Name column finder (ensure it doesn't accidentally collide with a resolved coordinate column)
  const usedCoordCols = new Set(
    [eastingColIdx, northingColIdx, latColIdx, lonColIdx].filter((i) => i !== -1)
  );
  let nameColIdx = findBestCol(
    [
      'name',
      'wtg_name',
      'wtg_id',
      'wtg_no',
      'wtg',
      'turbine_name',
      'turbine_id',
      'turbine_no',
      'turbine',
      'project_id',
      'projectid',
      'label',
      'placemark',
      'sec_num',
      'id',
      'fid',
      'sl_no',
      'sr_no',
    ],
    ['wtg_name', 'turbine_name', 'project_id', 'wtg_id', 'name', 'turbine', 'label', 'placemark', 'sec_num', 'str_type']
  );
  if (nameColIdx === -1 || usedCoordCols.has(nameColIdx)) {
    const firstNonCoord = rawHeaders.findIndex((_, idx) => !usedCoordCols.has(idx));
    nameColIdx = firstNonCoord !== -1 ? firstNonCoord : 0;
  }

  // 2. Determine coordinate mode
  const requestedType: 'auto' | 'decimal_degrees' | 'dms' | 'utm' = options.coordinateType || 'auto';
  let coordinateType: 'decimal_degrees' | 'dms' | 'utm' = 'decimal_degrees';

  if (requestedType === 'auto') {
    const hasExplicitUtm = utmEastIdx !== -1 && utmNorthIdx !== -1;
    const hasExplicitLatLon = latExplicitIdx !== -1 && lonExplicitIdx !== -1;

    // Choose which pair to inspect first for auto-detection
    let inspectXIdx = -1;
    let inspectYIdx = -1;

    if (hasExplicitUtm && !hasExplicitLatLon) {
      inspectXIdx = utmEastIdx;
      inspectYIdx = utmNorthIdx;
    } else if (hasExplicitLatLon && !hasExplicitUtm) {
      inspectXIdx = lonExplicitIdx;
      inspectYIdx = latExplicitIdx;
    } else if (xGenericIdx !== -1 && yGenericIdx !== -1) {
      inspectXIdx = xGenericIdx;
      inspectYIdx = yGenericIdx;
    } else if (hasExplicitUtm && hasExplicitLatLon) {
      // Both sets exist: inspect UTM columns first to verify they actually have values
      const u1 = parseCoordNumber(firstDataLine[utmEastIdx]);
      const u2 = parseCoordNumber(firstDataLine[utmNorthIdx]);
      if (!isNaN(u1) && !isNaN(u2) && isLikelyUtm(u1, u2)) {
        inspectXIdx = utmEastIdx;
        inspectYIdx = utmNorthIdx;
      } else {
        inspectXIdx = lonExplicitIdx;
        inspectYIdx = latExplicitIdx;
      }
    } else {
      inspectXIdx = eastingColIdx !== -1 ? eastingColIdx : lonColIdx;
      inspectYIdx = northingColIdx !== -1 ? northingColIdx : latColIdx;
    }

    // Inspect sample rows
    let detected: 'decimal_degrees' | 'dms' | 'utm' | null = null;
    for (const row of sampleRows) {
      const rawX = inspectXIdx !== -1 ? row[inspectXIdx] : undefined;
      const rawY = inspectYIdx !== -1 ? row[inspectYIdx] : undefined;
      if (!rawX && !rawY) continue;

      if (looksLikeDmsString(rawX) || looksLikeDmsString(rawY)) {
        detected = 'dms';
        break;
      }

      const numX = parseCoordNumber(rawX);
      const numY = parseCoordNumber(rawY);
      if (!isNaN(numX) && !isNaN(numY)) {
        if (isLikelyUtm(numX, numY) || Math.abs(numX) > 180 || Math.abs(numY) > 90) {
          detected = 'utm';
          break;
        } else {
          detected = 'decimal_degrees';
          break;
        }
      }
    }

    if (detected) {
      coordinateType = detected;
    } else if (hasExplicitUtm) {
      coordinateType = 'utm';
    } else {
      coordinateType = 'decimal_degrees';
    }
  } else {
    coordinateType = requestedType;
  }

  const defaultZone = options.defaultUtmZone || 43;
  const defaultHemi = options.defaultUtmHemisphere || 'N';
  let utmZoneUsed = `${defaultZone}${defaultHemi}`;

  const points: WTGPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter);
    if (cells.length < 2) continue;

    // Build row attributes map with original header names
    const attributes: Record<string, string | number> = {};
    const rawRow: Record<string, string> = {};
    rawHeaders.forEach((hdr, colIdx) => {
      const val = cells[colIdx] || '';
      rawRow[hdr] = val;
      const numVal = Number(val);
      attributes[hdr] = !isNaN(numVal) && val.trim() !== '' ? numVal : val;
    });

    const name = (!usedCoordCols.has(nameColIdx) && cells[nameColIdx]) ? cells[nameColIdx] : `WTG_${i}`;
    let lat = NaN;
    let lon = NaN;
    let easting: number | undefined;
    let northing: number | undefined;
    let zoneStr: string | undefined;

    if (coordinateType === 'utm') {
      // Easting = X, Northing = Y
      const eIdx = eastingColIdx !== -1 ? eastingColIdx : lonColIdx !== -1 ? lonColIdx : 1;
      const nIdx = northingColIdx !== -1 ? northingColIdx : latColIdx !== -1 ? latColIdx : 2;

      easting = parseCoordNumber(cells[eIdx]);
      northing = parseCoordNumber(cells[nIdx]);

      const zoneInfo = parseUtmZoneAndHemi(
        zoneColIdx !== -1 ? cells[zoneColIdx] : undefined,
        hemiColIdx !== -1 ? cells[hemiColIdx] : undefined,
        defaultZone,
        defaultHemi
      );
      zoneStr = zoneInfo.zoneStr;

      if (!isNaN(easting) && !isNaN(northing)) {
        // In case Easting (X) and Northing (Y) were accidentally swapped in source file
        if (easting > 1000000 && northing >= 100000 && northing <= 999999) {
          const temp = easting;
          easting = northing;
          northing = temp;
        }
        const converted = utmToLatLon(easting, northing, zoneInfo.zone, zoneInfo.hemi);
        lat = converted.lat;
        lon = converted.lon;
        utmZoneUsed = `${zoneInfo.zone}${zoneInfo.hemi}`;
      }
    } else if (coordinateType === 'dms') {
      // Y = Latitude / Northing, X = Longitude / Easting
      const lIdx = latColIdx !== -1 ? latColIdx : northingColIdx !== -1 ? northingColIdx : 1;
      const lnIdx = lonColIdx !== -1 ? lonColIdx : eastingColIdx !== -1 ? eastingColIdx : 2;

      const dmsLat = dmsToDecimal(cells[lIdx]);
      const dmsLon = dmsToDecimal(cells[lnIdx]);

      if (dmsLat !== null && dmsLon !== null) {
        lat = dmsLat;
        lon = dmsLon;
        // Auto-unswap if cardinal indicator or value shows lat/lon were inverted
        if (
          (/[EWew]/.test(cells[lIdx] || '') && /[NSns]/.test(cells[lnIdx] || '')) ||
          (Math.abs(lat) > 90 && Math.abs(lon) <= 90)
        ) {
          const temp = lat;
          lat = lon;
          lon = temp;
        }
      }
    } else {
      // Decimal degrees:
      // Y = Latitude (Northing), X = Longitude (Easting)
      const lIdx = latColIdx !== -1 ? latColIdx : northingColIdx !== -1 ? northingColIdx : 1;
      const lnIdx = lonColIdx !== -1 ? lonColIdx : eastingColIdx !== -1 ? eastingColIdx : 2;

      const rawLat = cells[lIdx];
      const rawLon = cells[lnIdx];

      lat = parseCoordNumber(rawLat);
      lon = parseCoordNumber(rawLon);

      // Handle DD with cardinal suffix like "15.1842 N" or "75.8924 E"
      if (isNaN(lat) && rawLat) {
        const parsed = dmsToDecimal(rawLat);
        if (parsed !== null) lat = parsed;
      }
      if (isNaN(lon) && rawLon) {
        const parsed = dmsToDecimal(rawLon);
        if (parsed !== null) lon = parsed;
      }

      // If lat and lon got swapped (e.g. lon > 90 such as 153.13 in lat slot and -27.38 in lon slot)
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
        const temp = lat;
        lat = lon;
        lon = temp;
      }
    }

    const isValidCoord =
      !isNaN(lat) &&
      !isNaN(lon) &&
      isFinite(lat) &&
      isFinite(lon) &&
      (coordinateType === 'utm' || (Math.abs(lat) <= 90 && Math.abs(lon) <= 180));

    if (isValidCoord) {
      points.push({
        id: `wtg-csv-${i}`,
        name,
        lat,
        lon,
        attributes,
        rawRow,
        easting,
        northing,
        utmZone: zoneStr || (coordinateType === 'utm' ? utmZoneUsed : undefined),
      });
    }
  }

  if (points.length === 0) {
    if (coordinateType !== 'utm') {
      throw new Error(
        'Could not extract valid geographic coordinates (Lat in -90..90, Lon in -180..180). If your X/Easting and Y/Northing values are in meters, select UTM or Auto-Detect.'
      );
    }
    throw new Error(
      'Could not extract valid coordinates from CSV. Please check coordinate columns (X/Easting, Y/Northing or Lat, Lon).'
    );
  }

  return {
    points,
    headers: rawHeaders,
    coordinateTypeDetected: coordinateType,
    utmZoneUsed: coordinateType === 'utm' ? utmZoneUsed : undefined,
  };
}


