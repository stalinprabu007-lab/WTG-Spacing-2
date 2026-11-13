export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS = 6378137; // WGS84 Earth radius in meters

/**
 * Calculates the destination point from a given point having traveled the given distance
 * on the given initial bearing (bearing in degrees, clockwise from north).
 */
export function destinationPoint(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDeg: number
): LatLon {
  const δ = distanceMeters / EARTH_RADIUS; // angular distance in radians
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: (φ2 * 180) / Math.PI,
    lon: (λ2 * 180) / Math.PI,
  };
}

/**
 * Generates coordinates for a circle around a center point.
 */
export function getCircleCoordinates(
  lat: number,
  lon: number,
  radiusMeters: number,
  segments: number = 72
): LatLon[] {
  const points: LatLon[] = [];
  const step = 360 / segments;
  for (let i = 0; i <= segments; i++) {
    const bearing = (i * step) % 360;
    points.push(destinationPoint(lat, lon, radiusMeters, bearing));
  }
  return points;
}

/**
 * Generates coordinates for an ellipse around a center point.
 * @param longRadius Semi-major axis in meters (7D)
 * @param shortRadius Semi-minor axis in meters (5D)
 * @param longAxisDeg Orientation of long axis in degrees from North
 */
export function getEllipseCoordinates(
  lat: number,
  lon: number,
  longRadius: number,
  shortRadius: number,
  longAxisDeg: number,
  segments: number = 72
): LatLon[] {
  const points: LatLon[] = [];
  const step = (2 * Math.PI) / segments;
  const longAxisRad = (longAxisDeg * Math.PI) / 180;

  for (let i = 0; i <= segments; i++) {
    const t = i * step;
    // Parametric ellipse in local frame: x is along long axis, y is along short axis
    const x = longRadius * Math.cos(t);
    const y = shortRadius * Math.sin(t);

    const dist = Math.sqrt(x * x + y * y);
    const localAngle = Math.atan2(y, x); // angle from long axis

    // Convert local orientation to geographical bearing from North
    const bearingDeg = ((longAxisRad + localAngle) * 180) / Math.PI;

    points.push(destinationPoint(lat, lon, dist, bearingDeg));
  }
  return points;
}

export interface RoseGeometry {
  inner5DCircle: LatLon[];
  wakeSector1: LatLon[]; // Upwind 7D sector
  wakeSector2: LatLon[]; // Downwind 7D sector
  dimLineNS: [LatLon, LatLon]; // Vertical cross line (5D up and down)
  dimLineEW: [LatLon, LatLon]; // Horizontal wind line (7D left and right)
  arrowNS1: LatLon[]; // Arrowhead pointing south
  arrowNS2: LatLon[]; // Arrowhead pointing north
  arrowEW1: LatLon[]; // Arrowhead pointing west
  arrowEW2: LatLon[]; // Arrowhead pointing east
  labelPos5DNorth: LatLon;
  labelPos5DSouth: LatLon;
  labelPos7DEast: LatLon;
  labelPos7DWest: LatLon;
  dist5D: number;
  dist7D: number;
}

/**
 * Calculates a closed 3-point arrowhead polygon at a tip pointing along bearingDeg.
 */
export function getArrowheadCoordinates(
  tip: LatLon,
  pointingBearingDeg: number,
  lengthMeters: number = 32,
  barbAngleDeg: number = 24
): LatLon[] {
  const backBearing = (pointingBearingDeg + 180) % 360;
  const leftBarb = destinationPoint(tip.lat, tip.lon, lengthMeters, (backBearing - barbAngleDeg + 360) % 360);
  const rightBarb = destinationPoint(tip.lat, tip.lon, lengthMeters, (backBearing + barbAngleDeg) % 360);
  return [tip, leftBarb, rightBarb, tip];
}

/**
 * Generates 5Dx7D Rose geometry:
 * 5D inner circle (crosswind), 7D sectors along wind direction, dimension arrows & label points.
 */
export function getRose5Dx7D(
  lat: number,
  lon: number,
  rd: number,
  windDirectionDeg: number,
  sectorShadeAngleDeg: number = 60
): RoseGeometry {
  const dist5D = Math.round(5 * rd);
  const dist7D = Math.round(7 * rd);

  // 1. Inner 5D circle
  const inner5DCircle = getCircleCoordinates(lat, lon, dist5D, 72);

  // 2. 7D sectors (Two opposite lobes along the wind axis: windDir and windDir + 180)
  const halfAngle = sectorShadeAngleDeg / 2;

  const createSector = (centerBearing: number): LatLon[] => {
    const pts: LatLon[] = [{ lat, lon }]; // Start at center
    const steps = 24;
    const startBearing = centerBearing - halfAngle;
    const stepAngle = sectorShadeAngleDeg / steps;

    for (let s = 0; s <= steps; s++) {
      const b = startBearing + s * stepAngle;
      pts.push(destinationPoint(lat, lon, dist7D, b));
    }
    pts.push({ lat, lon }); // Close polygon back at center
    return pts;
  };

  const wakeSector1 = createSector(windDirectionDeg);
  const wakeSector2 = createSector((windDirectionDeg + 180) % 360);

  // 3. Dimension lines & labels along crosswind (perpendicular) and along-wind axes
  const crosswindAngle = (windDirectionDeg + 90) % 360;
  const crosswindOpposite = (crosswindAngle + 180) % 360;

  const p5DNorth = destinationPoint(lat, lon, dist5D, crosswindAngle);
  const p5DSouth = destinationPoint(lat, lon, dist5D, crosswindOpposite);

  const p7DEast = destinationPoint(lat, lon, dist7D, (windDirectionDeg + 180) % 360);
  const p7DWest = destinationPoint(lat, lon, dist7D, windDirectionDeg);

  const arrowLen = Math.max(25, rd * 0.18);

  return {
    inner5DCircle,
    wakeSector1,
    wakeSector2,
    dimLineNS: [p5DSouth, p5DNorth],
    dimLineEW: [p7DWest, p7DEast],
    arrowNS1: getArrowheadCoordinates(p5DSouth, crosswindOpposite, arrowLen),
    arrowNS2: getArrowheadCoordinates(p5DNorth, crosswindAngle, arrowLen),
    arrowEW1: getArrowheadCoordinates(p7DWest, windDirectionDeg, arrowLen),
    arrowEW2: getArrowheadCoordinates(p7DEast, (windDirectionDeg + 180) % 360, arrowLen),
    labelPos5DNorth: destinationPoint(lat, lon, dist5D * 0.55, crosswindAngle),
    labelPos5DSouth: destinationPoint(lat, lon, dist5D * 0.55, crosswindOpposite),
    labelPos7DEast: destinationPoint(lat, lon, dist7D * 0.55, (windDirectionDeg + 180) % 360),
    labelPos7DWest: destinationPoint(lat, lon, dist7D * 0.55, windDirectionDeg),
    dist5D,
    dist7D,
  };
}

export interface RectangleGeometry {
  corners: LatLon[]; // 5 points (closed loop)
  dimLineNS: [LatLon, LatLon];
  dimLineEW: [LatLon, LatLon];
  arrowNS1: LatLon[]; // Arrowhead pointing south
  arrowNS2: LatLon[]; // Arrowhead pointing north
  arrowEW1: LatLon[]; // Arrowhead pointing west
  arrowEW2: LatLon[]; // Arrowhead pointing east
  labelPos5DNorth: LatLon;
  labelPos5DSouth: LatLon;
  labelPos7DEast: LatLon;
  labelPos7DWest: LatLon;
  dist5D: number;
  dist7D: number;
}

/**
 * Generates Rectangle geometry:
 * 5D north/south (height = 2*5D) and 7D east/west (width = 2*7D).
 */
export function getRectangleCoordinates(
  lat: number,
  lon: number,
  dist5D: number,
  dist7D: number
): RectangleGeometry {
  // Center is (lat, lon)
  // North point at dist5D, South point at dist5D, East at dist7D, West at dist7D
  const northPt = destinationPoint(lat, lon, dist5D, 0);
  const southPt = destinationPoint(lat, lon, dist5D, 180);
  const eastPt = destinationPoint(lat, lon, dist7D, 90);
  const westPt = destinationPoint(lat, lon, dist7D, 270);

  // 4 corners:
  const nw = destinationPoint(northPt.lat, northPt.lon, dist7D, 270);
  const ne = destinationPoint(northPt.lat, northPt.lon, dist7D, 90);
  const se = destinationPoint(southPt.lat, southPt.lon, dist7D, 90);
  const sw = destinationPoint(southPt.lat, southPt.lon, dist7D, 270);

  const corners = [nw, ne, se, sw, nw];
  const arrowLen = Math.max(25, dist5D * 0.05);

  return {
    corners,
    dimLineNS: [southPt, northPt],
    dimLineEW: [westPt, eastPt],
    arrowNS1: getArrowheadCoordinates(southPt, 180, arrowLen),
    arrowNS2: getArrowheadCoordinates(northPt, 0, arrowLen),
    arrowEW1: getArrowheadCoordinates(westPt, 270, arrowLen),
    arrowEW2: getArrowheadCoordinates(eastPt, 90, arrowLen),
    labelPos5DNorth: destinationPoint(lat, lon, dist5D * 0.5, 0),
    labelPos5DSouth: destinationPoint(lat, lon, dist5D * 0.5, 180),
    labelPos7DEast: destinationPoint(lat, lon, dist7D * 0.5, 90),
    labelPos7DWest: destinationPoint(lat, lon, dist7D * 0.5, 270),
    dist5D,
    dist7D,
  };
}
