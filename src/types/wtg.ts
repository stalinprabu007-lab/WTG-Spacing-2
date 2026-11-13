export type DiagramType = 'Circle' | 'Ellipse' | '5Dx7D' | 'Rectangle';

export type ExportMode = 'all' | 'single';

export interface WTGModel {
  id: string;
  name: string;
  rd: number; // Rotor diameter in meters
  hh: number; // Hub height in meters
  isCustom?: boolean;
}

export type CoordinateFormat = 'auto' | 'decimal_degrees' | 'dms' | 'utm';

export interface WTGPoint {
  id: string;
  name: string;
  originalName?: string;
  lat: number;
  lon: number;
  description?: string;
  attributes?: Record<string, string | number>;
  rawRow?: Record<string, string>;
  easting?: number;
  northing?: number;
  utmZone?: string;
}

export interface DiagramSettings {
  exportMode: ExportMode;
  includeAttributes: boolean; // "with attributes and without attribute" toggle
  attributeFields?: string[];
  placemarkLabelColumn?: string; // Selected column to use for placemark label / <name>
  selectedWtgId: string;
  wtgModelId: string;
  rotorDiameter: number;
  hubHeight: number;
  windDirection: number; // 0 to 360, 0 = north, clockwise
  sectorShadeAngle: number; // Total shade angle for 7D sector (default 60 deg)
  diagramType: DiagramType;

  // Common Style Controls (per user request: "Opacity make and Width make it common")
  commonLineWidth: number; // px e.g. 2.3
  commonOpacity: number; // % e.g. 60

  // Circle options
  circleRadius: number; // meters (defaults to 5*RD)
  circleColor: string; // Hex color e.g. #ff0000
  circleWidth: number; // px e.g. 2.3

  // Ellipse options
  ellipseShortRadius: number; // 5D e.g. 5*RD
  ellipseLongRadius: number; // 7D e.g. 7*RD
  ellipseLongAxis: number; // Long-axis (°) e.g. 270
  ellipseColor: string; // Hex color e.g. #ffff00
  ellipseWidth: number; // px e.g. 2.3

  // 5Dx7D options
  rose5DColor: string; // Red e.g. #e53935
  rose5DWidth: number; // px e.g. 2.0
  rose5DOpacity: number; // % e.g. 60
  rose7DColor: string; // Blue e.g. #1976d2
  rose7DWidth: number; // px e.g. 2.0
  rose7DOpacity: number; // % e.g. 60
  measurementLabels: boolean; // Measurement Label on/off
  measurementLines: boolean; // Measurement lines on/off
  labelColor: string; // Label text / badge color e.g. #ffffff

  // Rectangle options
  rectColor: string; // Yellow e.g. #ffeb3b
  rectWidth: number; // px e.g. 2.3
  rectOpacity: number; // % e.g. 0 (outline only)
  rect5DDistance: number; // meters north/south (default 5*RD)
  rect7DDistance: number; // meters east/west (default 7*RD)
}
