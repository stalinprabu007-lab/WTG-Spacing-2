import JSZip from 'jszip';
import { DiagramSettings, WTGPoint } from '../types/wtg';
import {
  getCircleCoordinates,
  getEllipseCoordinates,
  getRectangleCoordinates,
  getRose5Dx7D,
  LatLon,
} from './geo';
import { generateMeasurementBadgePng } from './imageBadges';
import { parseCsvWithCoordinates, CsvParseOptions } from './csvParser';

/**
 * Generates an HTML table balloon matching the Google Earth attribute table
 * reference from image_23f10d02.png (clean zebra striping, neat borders, uppercase headers)
 */
/**
 * Resolves the placemark display name based on an optional selected column or default name
 */
export function getPlacemarkName(p: WTGPoint, labelField?: string): string {
  if (labelField && labelField.trim() !== '') {
    if (p.attributes && p.attributes[labelField] !== undefined && String(p.attributes[labelField]).trim() !== '') {
      return String(p.attributes[labelField]).trim();
    }
    if (p.rawRow && p.rawRow[labelField] !== undefined && String(p.rawRow[labelField]).trim() !== '') {
      return String(p.rawRow[labelField]).trim();
    }
  }
  return p.name || p.originalName || 'WTG';
}

/**
 * Generates an HTML table balloon matching the Google Earth attribute table
 * reference from image_23f10d02.png (clean zebra striping, neat borders, uppercase headers)
 * All attribute typography is strictly 12px per specification.
 */
export function generateAttributeHtmlTable(
  attributes?: Record<string, string | number>,
  title?: string
): string {
  if (!attributes || Object.keys(attributes).length === 0) {
    return `<div style="font-family: Arial, sans-serif; font-size: 12px; padding: 6px;"><b>${escapeXml(title || 'Placemark')}</b></div>`;
  }

  const rows = Object.entries(attributes)
    .map(([key, val], idx) => {
      const bg = idx % 2 === 0 ? '#eaf2f9' : '#ffffff';
      const displayVal = val !== undefined && val !== null ? String(val) : '';
      return `<tr style="background-color: ${bg}; font-size: 12px;">
        <td style="padding: 4px 8px; font-weight: 700; color: #1e3a5f; border-bottom: 1px solid #d0dce8; white-space: nowrap; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${escapeXml(key)}</td>
        <td style="padding: 4px 8px; color: #2c3e50; border-bottom: 1px solid #d0dce8; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px;">${escapeXml(displayVal)}</td>
      </tr>`;
    })
    .join('');

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; max-width: 400px; min-width: 260px; border: 1px solid #b8cde3; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.12);">
    <div style="background-color: #0288d1; color: #ffffff; padding: 7px 10px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
      ${escapeXml(title || 'Turbine Attributes')}
    </div>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>`;
}

/**
 * Generates KML ExtendedData tags for placemarks
 */
export function generateExtendedDataXml(attributes?: Record<string, string | number>): string {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  const dataTags = Object.entries(attributes)
    .map(([key, val]) => {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      return `        <Data name="${safeKey}"><value>${escapeXml(String(val ?? ''))}</value></Data>`;
    })
    .join('\n');
  return `      <ExtendedData>\n${dataTags}\n      </ExtendedData>`;
}

/**
 * Converts Hex color string (#RRGGBB) and opacity percentage (0-100)
 * to Google Earth KML color format: AABBGGRR (Alpha, Blue, Green, Red in Hex).
 */
export function hexToKmlColor(hex: string, opacityPercent: number = 100): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleanHex.length !== 6) {
    cleanHex = 'ffffff';
  }

  const r = cleanHex.slice(0, 2);
  const g = cleanHex.slice(2, 4);
  const b = cleanHex.slice(4, 6);

  const alpha = Math.round(Math.max(0, Math.min(100, opacityPercent)) * 2.55)
    .toString(16)
    .padStart(2, '0');

  // KML uses AABBGGRR
  return `${alpha}${b}${g}${r}`.toLowerCase();
}

function escapeXml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function coordsToKmlString(coords: LatLon[]): string {
  return coords.map((c) => `${c.lon.toFixed(7)},${c.lat.toFixed(7)},0`).join(' ');
}

/**
 * Generates KML XML and image assets for KMZ packaging
 */
export async function buildKmzPackage(
  points: WTGPoint[],
  settings: DiagramSettings
): Promise<{ kmlString: string; images: Record<string, Uint8Array> }> {
  const images: Record<string, Uint8Array> = {};

  // Determine active target points based on ExportMode
  const activePoints =
    settings.exportMode === 'single'
      ? points.filter((p) => p.id === settings.selectedWtgId)
      : points;

  // Folder names as required:
  // Folder 1: Imported placemarks with their labels (no extra words or attributes)
  // Folder 2: Only the diagrams (without attributes, labels, or additional info)
  const folder1Name = 'Imported WTG placemarks';
  let folder2Name = 'Circles';
  if (settings.diagramType === 'Ellipse') folder2Name = 'Ellipses';
  else if (settings.diagramType === '5Dx7D') folder2Name = '5Dx7D';
  else if (settings.diagramType === 'Rectangle') folder2Name = 'Rectangles';

  // Styles definition
  const styles: string[] = [];
  const lineWidth = settings.commonLineWidth || settings.circleWidth || 2.3;
  const opacity = settings.commonOpacity ?? 60;

  if (settings.diagramType === 'Circle') {
    const kmlColor = hexToKmlColor(settings.circleColor, 100);
    styles.push(`
    <Style id="circleStyle">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>${lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <fill>0</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>`);
  } else if (settings.diagramType === 'Ellipse') {
    const kmlColor = hexToKmlColor(settings.ellipseColor, 100);
    styles.push(`
    <Style id="ellipseStyle">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>${lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <fill>0</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>`);
  } else if (settings.diagramType === '5Dx7D') {
    const kml5DLine = hexToKmlColor(settings.rose5DColor, 100);
    const kml5DFill = hexToKmlColor(settings.rose5DColor, opacity);
    const kml7DLine = hexToKmlColor(settings.rose7DColor, 100);
    const kml7DFill = hexToKmlColor(settings.rose7DColor, opacity);
    const kmlDimLine = hexToKmlColor(settings.labelColor, 95);

    styles.push(`
    <Style id="rose5DStyle">
      <LineStyle>
        <color>${kml5DLine}</color>
        <width>${lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <color>${kml5DFill}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Style id="rose7DStyle">
      <LineStyle>
        <color>${kml7DLine}</color>
        <width>${lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <color>${kml7DFill}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Style id="dimLineStyle">
      <LineStyle>
        <color>${kmlDimLine}</color>
        <width>1.8</width>
      </LineStyle>
    </Style>
    <Style id="dimArrowStyle">
      <LineStyle>
        <color>${kmlDimLine}</color>
        <width>1.5</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlDimLine}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>`);
  } else if (settings.diagramType === 'Rectangle') {
    const kmlRectLine = hexToKmlColor(settings.rectColor, 100);
    const kmlDimLine = hexToKmlColor(settings.labelColor, 95);

    // Outline only, no area fill per user instruction: "Except 5Dx7D, all make line area not required."
    styles.push(`
    <Style id="rectStyle">
      <LineStyle>
        <color>${kmlRectLine}</color>
        <width>${lineWidth}</width>
      </LineStyle>
      <PolyStyle>
        <fill>0</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <Style id="dimLineStyle">
      <LineStyle>
        <color>${kmlDimLine}</color>
        <width>1.8</width>
      </LineStyle>
    </Style>
    <Style id="dimArrowStyle">
      <LineStyle>
        <color>${kmlDimLine}</color>
        <width>1.5</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlDimLine}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>`);
  }

  // Pre-generate measurement label badge PNG images if needed
  if (settings.diagramType === '5Dx7D' && settings.measurementLabels) {
    const dist5D = Math.round(5 * settings.rotorDiameter);
    const dist7D = Math.round(7 * settings.rotorDiameter);

    const img5D = await generateMeasurementBadgePng(
      `${dist5D}m`,
      settings.labelColor,
      'rgba(180, 20, 20, 0.85)',
      22
    );
    const img7D = await generateMeasurementBadgePng(
      `${dist7D}m`,
      settings.labelColor,
      'rgba(20, 50, 180, 0.85)',
      22
    );

    images['images/label_5d.png'] = img5D;
    images['images/label_7d.png'] = img7D;

    styles.push(`
    <Style id="labelIcon5D">
      <IconStyle>
        <Icon><href>images/label_5d.png</href></Icon>
        <scale>0.9</scale>
      </IconStyle>
      <LabelStyle><scale>0</scale></LabelStyle>
    </Style>
    <Style id="labelIcon7D">
      <IconStyle>
        <Icon><href>images/label_7d.png</href></Icon>
        <scale>0.9</scale>
      </IconStyle>
      <LabelStyle><scale>0</scale></LabelStyle>
    </Style>`);
  }

  if (settings.diagramType === 'Rectangle' && settings.measurementLabels) {
    const dist5D = Math.round(settings.rect5DDistance);
    const dist7D = Math.round(settings.rect7DDistance);

    const img5D = await generateMeasurementBadgePng(
      `${dist5D}m`,
      settings.labelColor,
      'rgba(30, 40, 55, 0.85)',
      22
    );
    const img7D = await generateMeasurementBadgePng(
      `${dist7D}m`,
      settings.labelColor,
      'rgba(30, 40, 55, 0.85)',
      22
    );

    images['images/rect_label_5d.png'] = img5D;
    images['images/rect_label_7d.png'] = img7D;

    styles.push(`
    <Style id="rectLabelIcon5D">
      <IconStyle>
        <Icon><href>images/rect_label_5d.png</href></Icon>
        <scale>0.9</scale>
      </IconStyle>
      <LabelStyle><scale>0</scale></LabelStyle>
    </Style>
    <Style id="rectLabelIcon7D">
      <IconStyle>
        <Icon><href>images/rect_label_7d.png</href></Icon>
        <scale>0.9</scale>
      </IconStyle>
      <LabelStyle><scale>0</scale></LabelStyle>
    </Style>`);
  }

  // Build Folder 1: Placemarks (with attributes or without attribute per user toggle)
  const folder1Placemarks = activePoints
    .map((p) => {
      const displayName = getPlacemarkName(p, settings.placemarkLabelColumn);
      if (settings.includeAttributes) {
        const attrs: Record<string, string | number> = { ...(p.attributes || {}) };
        if (Object.keys(attrs).length === 0) {
          attrs['NAME'] = displayName;
          attrs['LATITUDE'] = p.lat.toFixed(6);
          attrs['LONGITUDE'] = p.lon.toFixed(6);
          if (p.easting && p.northing) {
            attrs['EASTING'] = p.easting;
            attrs['NORTHING'] = p.northing;
            attrs['UTM_ZONE'] = p.utmZone || '';
          }
        }
        const htmlTable = generateAttributeHtmlTable(attrs, displayName);
        const extData = generateExtendedDataXml(attrs);

        return `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <Snippet maxLines="0"/>
        <description><![CDATA[${htmlTable}]]></description>
${extData}
        <Point>
          <coordinates>${p.lon.toFixed(7)},${p.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`;
      } else {
        // Without attribute: clean, strictly placemark name and coordinates (matching ref-2)
        return `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <Snippet maxLines="0"/>
        <Point>
          <coordinates>${p.lon.toFixed(7)},${p.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`;
      }
    })
    .join('\n');

  // Build Folder 2: Diagrams only, without attributes or labels
  const folder2Items: string[] = [];

  for (const p of activePoints) {
    if (settings.diagramType === 'Circle') {
      const radius = settings.circleRadius || 5 * settings.rotorDiameter;
      const coords = getCircleCoordinates(p.lat, p.lon, radius);
      folder2Items.push(`      <Placemark>
        <styleUrl>#circleStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(coords)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);
    } else if (settings.diagramType === 'Ellipse') {
      const longRadius = settings.ellipseLongRadius || 7 * settings.rotorDiameter;
      const shortRadius = settings.ellipseShortRadius || 5 * settings.rotorDiameter;
      const longAxis = settings.ellipseLongAxis;
      const coords = getEllipseCoordinates(p.lat, p.lon, longRadius, shortRadius, longAxis);

      folder2Items.push(`      <Placemark>
        <styleUrl>#ellipseStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(coords)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);
    } else if (settings.diagramType === '5Dx7D') {
      const rose = getRose5Dx7D(
        p.lat,
        p.lon,
        settings.rotorDiameter,
        settings.windDirection,
        settings.sectorShadeAngle
      );

      // Inner 5D Circle
      folder2Items.push(`      <Placemark>
        <styleUrl>#rose5DStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.inner5DCircle)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

      // 7D Sector 1 (Upwind)
      folder2Items.push(`      <Placemark>
        <styleUrl>#rose7DStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.wakeSector1)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

      // 7D Sector 2 (Downwind)
      folder2Items.push(`      <Placemark>
        <styleUrl>#rose7DStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.wakeSector2)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

      // Measurement lines & labels if toggled
      if (settings.measurementLabels) {
        // Dimension lines
        folder2Items.push(`      <Placemark>
        <styleUrl>#dimLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordsToKmlString(rose.dimLineNS)}</coordinates>
        </LineString>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordsToKmlString(rose.dimLineEW)}</coordinates>
        </LineString>
      </Placemark>`);

        // Dimension line arrowheads (user request: "For measurement line add arrow also")
        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.arrowNS1)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.arrowNS2)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.arrowEW1)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rose.arrowEW2)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        // Image Badges as Icons (Page 5 Output 2c requirement)
        folder2Items.push(`      <Placemark>
        <styleUrl>#labelIcon5D</styleUrl>
        <Point>
          <coordinates>${rose.labelPos5DNorth.lon.toFixed(7)},${rose.labelPos5DNorth.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#labelIcon5D</styleUrl>
        <Point>
          <coordinates>${rose.labelPos5DSouth.lon.toFixed(7)},${rose.labelPos5DSouth.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#labelIcon7D</styleUrl>
        <Point>
          <coordinates>${rose.labelPos7DEast.lon.toFixed(7)},${rose.labelPos7DEast.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#labelIcon7D</styleUrl>
        <Point>
          <coordinates>${rose.labelPos7DWest.lon.toFixed(7)},${rose.labelPos7DWest.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);
      }
    } else if (settings.diagramType === 'Rectangle') {
      const dist5D = settings.rect5DDistance || 5 * settings.rotorDiameter;
      const dist7D = settings.rect7DDistance || 7 * settings.rotorDiameter;
      const rect = getRectangleCoordinates(p.lat, p.lon, dist5D, dist7D);

      // Rectangle border / polygon
      folder2Items.push(`      <Placemark>
        <styleUrl>#rectStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rect.corners)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

      // Optional measurement lines with arrowheads
      if (settings.measurementLines) {
        folder2Items.push(`      <Placemark>
        <styleUrl>#dimLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordsToKmlString(rect.dimLineNS)}</coordinates>
        </LineString>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimLineStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${coordsToKmlString(rect.dimLineEW)}</coordinates>
        </LineString>
      </Placemark>`);

        // Dimension arrowheads (user request: "For measurement line add arrow also")
        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rect.arrowNS1)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rect.arrowNS2)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rect.arrowEW1)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#dimArrowStyle</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToKmlString(rect.arrowEW2)}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`);
      }

      // Measurement labels
      if (settings.measurementLabels) {
        folder2Items.push(`      <Placemark>
        <styleUrl>#rectLabelIcon5D</styleUrl>
        <Point>
          <coordinates>${rect.labelPos5DNorth.lon.toFixed(7)},${rect.labelPos5DNorth.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#rectLabelIcon5D</styleUrl>
        <Point>
          <coordinates>${rect.labelPos5DSouth.lon.toFixed(7)},${rect.labelPos5DSouth.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#rectLabelIcon7D</styleUrl>
        <Point>
          <coordinates>${rect.labelPos7DEast.lon.toFixed(7)},${rect.labelPos7DEast.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);

        folder2Items.push(`      <Placemark>
        <styleUrl>#rectLabelIcon7D</styleUrl>
        <Point>
          <coordinates>${rect.labelPos7DWest.lon.toFixed(7)},${rect.labelPos7DWest.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`);
      }
    }
  }

  const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>WTG Spacing Diagrams</name>
    <open>1</open>
${styles.join('\n')}
    <Folder>
      <name>${folder1Name}</name>
      <open>1</open>
${folder1Placemarks}
    </Folder>
    <Folder>
      <name>${folder2Name}</name>
      <open>1</open>
${folder2Items.join('\n')}
    </Folder>
  </Document>
</kml>`;

  return { kmlString, images };
}

/**
 * Creates and downloads a genuine .kmz archive
 */
export async function generateKmzBlob(
  points: WTGPoint[],
  settings: DiagramSettings
): Promise<Blob> {
  const { kmlString, images } = await buildKmzPackage(points, settings);

  const zip = new JSZip();
  zip.file('doc.kml', kmlString);

  for (const [imgPath, imgData] of Object.entries(images)) {
    zip.file(imgPath, imgData);
  }

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.google-earth.kmz',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Parses KML text into WTGPoint array, extracting coordinates and ExtendedData attributes
 */
export function parseKmlString(kmlText: string): WTGPoint[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  const points: WTGPoint[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl?.textContent?.trim() || `WTG_${i + 1}`;

    // Extract attributes from ExtendedData or description if present
    const attributes: Record<string, string | number> = {};
    const extDataEl = pm.getElementsByTagName('ExtendedData')[0];
    if (extDataEl) {
      const dataNodes = extDataEl.getElementsByTagName('Data');
      for (let d = 0; d < dataNodes.length; d++) {
        const dNode = dataNodes[d];
        const key = dNode.getAttribute('name');
        const val = dNode.getElementsByTagName('value')[0]?.textContent?.trim();
        if (key && val !== undefined) {
          const num = Number(val);
          attributes[key] = !isNaN(num) && val !== '' ? num : val;
        }
      }
      const simpleDataNodes = extDataEl.getElementsByTagName('SimpleData');
      for (let s = 0; s < simpleDataNodes.length; s++) {
        const sNode = simpleDataNodes[s];
        const key = sNode.getAttribute('name');
        const val = sNode.textContent?.trim();
        if (key && val !== undefined) {
          const num = Number(val);
          attributes[key] = !isNaN(num) && val !== '' ? num : val;
        }
      }
    }

    const pointEl = pm.getElementsByTagName('Point')[0];
    if (pointEl) {
      const coordsEl = pointEl.getElementsByTagName('coordinates')[0];
      if (coordsEl?.textContent) {
        const parts = coordsEl.textContent.trim().split(',');
        if (parts.length >= 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            points.push({
              id: `wtg-imported-${i + 1}`,
              name,
              lat,
              lon,
              attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            });
          }
        }
      }
    }
  }

  return points;
}

export interface ParseCoordinateFileResult {
  points: WTGPoint[];
  coordinateTypeDetected?: 'decimal_degrees' | 'dms' | 'utm' | 'kml';
  headers?: string[];
  utmZoneUsed?: string;
}

/**
 * Parses imported KML, KMZ, or CSV (UTM, DMS, DD) file with full attributes support
 */
export async function parseCoordinateFile(
  file: File,
  options: CsvParseOptions = {}
): Promise<ParseCoordinateFileResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.kmz')) {
    const zip = await JSZip.loadAsync(file);
    // Find .kml file inside
    let kmlFileName = Object.keys(zip.files).find((name) => name.toLowerCase().endsWith('.kml'));
    if (!kmlFileName) {
      throw new Error('No .kml document found inside the KMZ archive.');
    }
    const kmlText = await zip.files[kmlFileName].async('string');
    const pts = parseKmlString(kmlText);
    if (pts.length === 0) {
      throw new Error('No point placemarks with coordinates found in KMZ.');
    }
    return { points: pts, coordinateTypeDetected: 'kml' };
  }

  // Text / KML / CSV
  const text = await file.text();
  if (fileName.endsWith('.kml') || text.includes('<kml')) {
    const pts = parseKmlString(text);
    if (pts.length === 0) {
      throw new Error('No point placemarks with coordinates found in KML.');
    }
    return { points: pts, coordinateTypeDetected: 'kml' };
  }

  // Robust CSV / TSV / TXT format parser (UTM Easting/Northing, DMS, or Decimal Degrees + attributes)
  const csvRes = parseCsvWithCoordinates(text, options);
  return {
    points: csvRes.points,
    coordinateTypeDetected: csvRes.coordinateTypeDetected,
    headers: csvRes.headers,
    utmZoneUsed: csvRes.utmZoneUsed,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface PureCsvKmzOptions {
  includeAttributes: boolean;
  folderName?: string;
  documentName?: string;
  pinColorHex?: string;
  labelField?: string; // Column header selected for placemark labels
}

/**
 * Builds clean KML string directly from CSV points:
 * - With Attributes: Includes styled HTML table balloon matching image_23f10d02.png + ExtendedData
 * - Without Attribute: Strict placemark with label and coordinates only (matching ref-2 image_c4bc31b2.png)
 * - Includes <Snippet maxLines="0"/> to suppress table preview in Google Earth sidebar folder
 */
export function buildPureCsvKmlString(
  points: WTGPoint[],
  options: PureCsvKmzOptions
): string {
  const folderName = options.folderName || 'CSV Imported Placemarks';
  const docName = options.documentName || 'CSV to KMZ Export';
  const pinColor = hexToKmlColor(options.pinColorHex || '#ffff00', 100);

  const styleXml = `    <Style id="csvPlacemarkPin">
      <IconStyle>
        <color>${pinColor}</color>
        <scale>1.1</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
        <hotSpot x="20" y="2" xunits="pixels" yunits="pixels"/>
      </IconStyle>
      <LabelStyle>
        <scale>0.9</scale>
      </LabelStyle>
    </Style>`;

  const placemarksXml = points
    .map((p) => {
      const displayName = getPlacemarkName(p, options.labelField);
      if (options.includeAttributes) {
        const attrs: Record<string, string | number> = { ...(p.attributes || {}) };
        if (Object.keys(attrs).length === 0) {
          attrs['NAME'] = displayName;
          attrs['LATITUDE'] = p.lat.toFixed(6);
          attrs['LONGITUDE'] = p.lon.toFixed(6);
          if (p.easting && p.northing) {
            attrs['EASTING'] = p.easting;
            attrs['NORTHING'] = p.northing;
            attrs['UTM_ZONE'] = p.utmZone || '';
          }
        }
        const htmlTable = generateAttributeHtmlTable(attrs, displayName);
        const extData = generateExtendedDataXml(attrs);

        return `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <Snippet maxLines="0"/>
        <styleUrl>#csvPlacemarkPin</styleUrl>
        <description><![CDATA[${htmlTable}]]></description>
${extData}
        <Point>
          <coordinates>${p.lon.toFixed(7)},${p.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`;
      } else {
        return `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <Snippet maxLines="0"/>
        <styleUrl>#csvPlacemarkPin</styleUrl>
        <Point>
          <coordinates>${p.lon.toFixed(7)},${p.lat.toFixed(7)},0</coordinates>
        </Point>
      </Placemark>`;
      }
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(docName)}</name>
    <open>1</open>
${styleXml}
    <Folder>
      <name>${escapeXml(folderName)}</name>
      <open>1</open>
${placemarksXml}
    </Folder>
  </Document>
</kml>`;
}

/**
 * Creates pure KMZ zip blob for direct CSV to KMZ conversion
 */
export async function generatePureCsvKmzBlob(
  points: WTGPoint[],
  options: PureCsvKmzOptions
): Promise<Blob> {
  const kmlString = buildPureCsvKmlString(points, options);
  const zip = new JSZip();
  zip.file('doc.kml', kmlString);
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.google-earth.kmz',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

