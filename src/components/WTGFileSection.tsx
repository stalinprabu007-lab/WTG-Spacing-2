import React, { useRef, useState } from 'react';
import { CoordinateFormat, WTGPoint } from '../types/wtg';
import {
  parseCoordinateFile,
  generatePureCsvKmzBlob,
  buildPureCsvKmlString,
  downloadBlob,
} from '../utils/kmlKmz';
import {
  SAMPLE_WTG_POINTS,
  SAMPLE_GIS_ATTRIBUTE_POINTS,
  SAMPLE_CSV_TEMPLATES,
} from '../data/wtgModels';
import {
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Table,
  SlidersHorizontal,
  Compass,
  FileSpreadsheet,
  Download,
  FileCode,
  Tag,
} from 'lucide-react';
import { parseCsvWithCoordinates } from '../utils/csvParser';
import { OpenGoogleEarthModal } from './OpenGoogleEarthModal';
import { getPlacemarkName } from '../utils/kmlKmz';

interface Props {
  points: WTGPoint[];
  setPoints: React.Dispatch<React.SetStateAction<WTGPoint[]>>;
  loadedFileName: string;
  setLoadedFileName: (name: string) => void;
  includeAttributes: boolean;
  setIncludeAttributes: (val: boolean) => void;
  placemarkLabelColumn?: string;
  setPlacemarkLabelColumn?: (val: string) => void;
  onOpenAttributeTable: () => void;
  onSwitchToMap?: () => void;
}

export const WTGFileSection: React.FC<Props> = ({
  points,
  setPoints,
  loadedFileName,
  setLoadedFileName,
  includeAttributes,
  setIncludeAttributes,
  placemarkLabelColumn = '',
  setPlacemarkLabelColumn,
  onOpenAttributeTable,
  onSwitchToMap,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [coordFormat, setCoordFormat] = useState<CoordinateFormat>('auto');
  const [utmZone, setUtmZone] = useState<number>(43);
  const [utmHemi, setUtmHemi] = useState<'N' | 'S'>('N');
  const [detectedFormatInfo, setDetectedFormatInfo] = useState<string | null>(null);
  const [detectedCoordType, setDetectedCoordType] = useState<string | null>(null);
  const [lastCsvText, setLastCsvText] = useState<string | null>(null);
  const [isEarthModalOpen, setIsEarthModalOpen] = useState(false);
  const [exportedFilename, setExportedFilename] = useState('');

  // Extract all available attribute columns from parsed points
  const availableLabelFields = React.useMemo(() => {
    const fields = new Set<string>();
    points.forEach((p) => {
      if (p.attributes) {
        Object.keys(p.attributes).forEach((k) => fields.add(k));
      }
      if (p.rawRow) {
        Object.keys(p.rawRow).forEach((k) => fields.add(k));
      }
    });
    return Array.from(fields);
  }, [points]);

  const handleLabelColumnChange = (newCol: string) => {
    if (setPlacemarkLabelColumn) {
      setPlacemarkLabelColumn(newCol);
    }
    setPoints((prev) =>
      prev.map((p) => {
        const orig = p.originalName || p.name;
        let resolved = orig;
        if (newCol && newCol.trim() !== '') {
          if (p.attributes && p.attributes[newCol] !== undefined && String(p.attributes[newCol]).trim() !== '') {
            resolved = String(p.attributes[newCol]).trim();
          } else if (p.rawRow && p.rawRow[newCol] !== undefined && String(p.rawRow[newCol]).trim() !== '') {
            resolved = String(p.rawRow[newCol]).trim();
          }
        }
        return {
          ...p,
          originalName: orig,
          name: resolved,
        };
      })
    );
  };

  const handleDirectExportKmz = async () => {
    if (points.length === 0) return;
    try {
      const cleanBase = (loadedFileName || 'Placemarks').replace(/\.[^/.]+$/, '');
      const modeStr = includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const filename = `${cleanBase}_${points.length}pts_${modeStr}.kmz`;
      const blob = await generatePureCsvKmzBlob(points, {
        includeAttributes,
        folderName: cleanBase,
        labelField: placemarkLabelColumn,
      });
      downloadBlob(blob, filename);
      setExportedFilename(filename);
      setIsEarthModalOpen(true);
    } catch (err: unknown) {
      alert('Error exporting CSV to KMZ: ' + String(err));
    }
  };

  const handleDirectExportKml = async () => {
    if (points.length === 0) return;
    try {
      const cleanBase = (loadedFileName || 'Placemarks').replace(/\.[^/.]+$/, '');
      const modeStr = includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const filename = `${cleanBase}_${points.length}pts_${modeStr}.kml`;
      const kmlString = buildPureCsvKmlString(points, {
        includeAttributes,
        folderName: cleanBase,
        labelField: placemarkLabelColumn,
      });
      const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
      downloadBlob(blob, filename);
      setExportedFilename(filename);
      setIsEarthModalOpen(true);
    } catch (err: unknown) {
      alert('Error exporting CSV to KML: ' + String(err));
    }
  };

  const applyFormatInfo = (
    detected: 'decimal_degrees' | 'dms' | 'utm' | 'kml' | undefined,
    utmZoneUsed?: string,
    zoneFallback: number = utmZone,
    hemiFallback: 'N' | 'S' = utmHemi
  ) => {
    setDetectedCoordType(detected || null);
    if (detected === 'utm') {
      setDetectedFormatInfo(`Parsed as UTM (${utmZoneUsed || `${zoneFallback}${hemiFallback}`}) — Easting=X, Northing=Y`);
    } else if (detected === 'dms') {
      setDetectedFormatInfo('Parsed as Degrees Minutes Seconds (DMS)');
    } else if (detected === 'decimal_degrees') {
      setDetectedFormatInfo('Parsed as Decimal Degrees (DD) — Lon=X, Lat=Y');
    } else {
      setDetectedFormatInfo('Parsed as KML Placemarks');
    }
  };

  const reparseCsvText = (
    csvText: string,
    nextFormat: CoordinateFormat,
    nextZone: number,
    nextHemi: 'N' | 'S'
  ) => {
    setErrorMsg(null);
    try {
      const res = parseCsvWithCoordinates(csvText, {
        coordinateType: nextFormat,
        defaultUtmZone: nextZone,
        defaultUtmHemisphere: nextHemi,
      });
      setPoints(res.points);
      applyFormatInfo(res.coordinateTypeDetected, res.utmZoneUsed, nextZone, nextHemi);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse CSV with selected format';
      setErrorMsg(msg);
    }
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.kmz') && !lower.endsWith('.kml')) {
        const rawText = await file.text();
        if (!rawText.includes('<kml')) {
          setLastCsvText(rawText);
          const res = parseCsvWithCoordinates(rawText, {
            coordinateType: coordFormat,
            defaultUtmZone: utmZone,
            defaultUtmHemisphere: utmHemi,
          });
          setPoints(res.points);
          setLoadedFileName(file.name);
          applyFormatInfo(res.coordinateTypeDetected, res.utmZoneUsed);
          return;
        }
      }

      setLastCsvText(null);
      const res = await parseCoordinateFile(file, {
        coordinateType: coordFormat,
        defaultUtmZone: utmZone,
        defaultUtmHemisphere: utmHemi,
      });

      setPoints(res.points);
      setLoadedFileName(file.name);
      applyFormatInfo(res.coordinateTypeDetected, res.utmZoneUsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file';
      setErrorMsg(msg);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const loadSampleStandard = () => {
    setLastCsvText(null);
    setDetectedCoordType('decimal_degrees');
    setPoints(SAMPLE_WTG_POINTS);
    setLoadedFileName('Sample_Wind_Farm_5_WTG.kml');
    setDetectedFormatInfo('Sample Decimal Degrees with turbine attributes');
    setErrorMsg(null);
  };

  const loadSampleGisAttributes = () => {
    setLastCsvText(null);
    setDetectedCoordType('decimal_degrees');
    setPoints(SAMPLE_GIS_ATTRIBUTE_POINTS);
    setLoadedFileName('Culvert_GIS_Reference_Table.csv');
    setDetectedFormatInfo('Sample GIS Attribute Reference Table (image_23f10d02.png)');
    setIncludeAttributes(true);
    setErrorMsg(null);
  };

  const loadSampleUtm = () => {
    try {
      setLastCsvText(SAMPLE_CSV_TEMPLATES.utm);
      const res = parseCsvWithCoordinates(SAMPLE_CSV_TEMPLATES.utm, {
        coordinateType: 'utm',
        defaultUtmZone: utmZone,
        defaultUtmHemisphere: utmHemi,
      });
      setPoints(res.points);
      setLoadedFileName('Sample_UTM_Turbines_Zone43N.csv');
      applyFormatInfo('utm', res.utmZoneUsed);
      setErrorMsg(null);
    } catch (err: unknown) {
      setErrorMsg(String(err));
    }
  };

  const loadSampleDms = () => {
    try {
      setLastCsvText(SAMPLE_CSV_TEMPLATES.dms);
      const res = parseCsvWithCoordinates(SAMPLE_CSV_TEMPLATES.dms, {
        coordinateType: 'dms',
      });
      setPoints(res.points);
      setLoadedFileName('Sample_DMS_Coordinates.csv');
      applyFormatInfo('dms');
      setErrorMsg(null);
    } catch (err: unknown) {
      setErrorMsg(String(err));
    }
  };

  const downloadSampleTemplate = (type: 'utm' | 'dms' | 'gisWithAttributes') => {
    const content = SAMPLE_CSV_TEMPLATES[type];
    const filename =
      type === 'utm'
        ? 'Template_UTM_Coordinates.csv'
        : type === 'dms'
        ? 'Template_DMS_Coordinates.csv'
        : 'Template_GIS_With_Attributes.csv';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasAttributes = points.some((p) => p.attributes && Object.keys(p.attributes).length > 0);

  return (
    <div className="bg-[#10273d] border border-[#1b4366] rounded-sm overflow-hidden shadow-md">
      {/* Section Header Bar */}
      <div className="bg-[#143d5c] px-4 py-2 border-b border-[#1f517a] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-sm font-bold tracking-wide">
            1 | WTG coordinate file (CSV / KML / KMZ)
          </h2>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
            UTM • DMS • DD
          </span>
        </div>
        {points.length > 0 && (
          <span className="text-[11px] text-cyan-300 bg-[#0d2a40] px-2.5 py-0.5 rounded border border-[#215682] font-semibold">
            {points.length} placemark{points.length > 1 ? 's' : ''} loaded
          </span>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Main upload row */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded bg-[#0b1c2b] border ${
            isDragging ? 'border-cyan-400 bg-[#0e273d]' : 'border-[#1b3d5c]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-[#132f48] text-cyan-400">
              {points.length > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {loadedFileName || 'No file selected'}
              </div>
              <p className="text-xs text-slate-300">
                Supports <span className="text-cyan-300">CSV, TSV, KML, KMZ</span> with UTM, Degree Minute Second (DMS), or Decimal Degrees (DD).
              </p>
              {detectedFormatInfo && (
                <span className="inline-block mt-1 text-[11px] text-emerald-400 font-medium">
                  {detectedFormatInfo}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileInputChange}
              accept=".kml,.kmz,.csv,.txt,.tsv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-[#0288d1] hover:bg-[#039be5] text-white rounded transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              Browse CSV / KMZ / KML...
            </button>
          </div>
        </div>

        {/* Options Row: Coordinate Format Selector & With/Without Attributes Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded bg-[#0d2235] border border-[#184266]">
          {/* Coordinate Format Selection */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="wtg-coord-format" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Coordinate Format Parser (X = Easting/Lon, Y = Northing/Lat):
            </label>
            <div className="flex items-center gap-2">
              <select
                id="wtg-coord-format"
                value={coordFormat}
                onChange={(e) => {
                  const next = e.target.value as CoordinateFormat;
                  setCoordFormat(next);
                  if (lastCsvText) {
                    reparseCsvText(lastCsvText, next, utmZone, utmHemi);
                  }
                }}
                className="bg-[#091724] border border-[#1b4366] text-white text-xs rounded px-2.5 py-1.5 focus:border-cyan-400 outline-none flex-1"
              >
                <option value="auto">Auto-Detect (UTM / DMS / DD — supports X/Y)</option>
                <option value="decimal_degrees">Decimal Degrees (DD: Lat/Y, Lon/X)</option>
                <option value="dms">Degree Min Sec (DMS: 15° 11' 03" N, 75° 53' 32" E)</option>
                <option value="utm">UTM (Easting / X, Northing / Y)</option>
              </select>

              {/* UTM Zone settings if UTM is selected or auto-detected */}
              {(coordFormat === 'utm' || detectedCoordType === 'utm') && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    aria-label="UTM Zone"
                    min={1}
                    max={60}
                    value={utmZone}
                    onChange={(e) => {
                      const nextZ = parseInt(e.target.value, 10) || 43;
                      setUtmZone(nextZ);
                      if (lastCsvText) {
                        reparseCsvText(lastCsvText, coordFormat, nextZ, utmHemi);
                      }
                    }}
                    className="w-14 bg-[#091724] border border-[#1b4366] text-white text-xs rounded px-1.5 py-1.5 text-center font-mono"
                    title="UTM Zone (1-60)"
                  />
                  <button
                    type="button"
                    aria-label="Toggle UTM Hemisphere"
                    onClick={() => {
                      const nextH = utmHemi === 'N' ? 'S' : 'N';
                      setUtmHemi(nextH);
                      if (lastCsvText) {
                        reparseCsvText(lastCsvText, coordFormat, utmZone, nextH);
                      }
                    }}
                    className="px-2 py-1.5 bg-[#14344e] hover:bg-[#1c486e] text-cyan-300 text-xs font-bold rounded border border-[#235882] cursor-pointer"
                    title="Toggle Hemisphere (North / South)"
                  >
                    {utmHemi}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* With Attributes vs Without Attribute Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                KMZ Placemark Output:
              </label>
              {points.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenAttributeTable}
                  className="text-[11px] text-cyan-300 hover:text-white underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Table className="w-3 h-3" />
                  View Attribute Table
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIncludeAttributes(true)}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  includeAttributes
                    ? 'bg-[#0288d1] border-cyan-400 text-white shadow-sm'
                    : 'bg-[#0a1a29] border-[#1b4366] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>With Attributes</span>
                <span className="text-[10px] opacity-80">(Ref Table Balloon)</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeAttributes(false)}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !includeAttributes
                    ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                    : 'bg-[#0a1a29] border-[#1b4366] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Without Attribute</span>
                <span className="text-[10px] opacity-80">(Coordinates Only)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Placemark Label Selection Option (user requirement: "Add place mark label selection option") */}
        <div className="p-3 rounded bg-[#091b2c] border border-[#1e4d75] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-xs">
                Placemark Label Selection:
              </span>
              <span className="text-[11px] text-slate-300">
                Select which column to use as the placemark name in Google Earth (<code className="text-cyan-300">&lt;name&gt;</code>) and on the map
              </span>
            </div>
            {placemarkLabelColumn ? (
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                Column: {placemarkLabelColumn}
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                Default Placemark Name
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <select
                value={placemarkLabelColumn}
                onChange={(e) => handleLabelColumnChange(e.target.value)}
                className="w-full bg-[#0d2235] border border-[#235882] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="">Default Placemark Name (Original / WTG 1, WTG 2...)</option>
                {availableLabelFields.map((field) => {
                  const sampleVal = points[0]?.attributes?.[field] ?? points[0]?.rawRow?.[field];
                  const sampleStr = sampleVal !== undefined ? ` (e.g. "${sampleVal}")` : '';
                  return (
                    <option key={field} value={field}>
                      Use Column: {field}{sampleStr}
                    </option>
                  );
                })}
              </select>
            </div>

            {points.length > 0 && (
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 bg-[#0e273e] px-2.5 py-1.5 rounded border border-[#194164]">
                <span className="text-slate-400">Sample Placemark:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {getPlacemarkName(points[0], placemarkLabelColumn)}
                </span>
                {points.length > 1 && (
                  <>
                    <span className="text-slate-500">,</span>
                    <span className="font-mono text-cyan-300">
                      {getPlacemarkName(points[1], placemarkLabelColumn)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            Folder sidebar table preview hidden with <code className="text-cyan-300">&lt;Snippet maxLines="0"/&gt;</code> for a clean list (matching ref-2), full attributes balloon opens on click (12px font).
          </p>
        </div>

        {/* Direct CSV to KMZ / KML Export Toolbar */}
        <div className="p-3 rounded bg-[#091b2c] border border-[#1e4d75] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Download className="w-4 h-4 text-cyan-400" />
              Direct CSV to KMZ/KML Export:
            </span>
            <span className="text-[11px] text-slate-300">
              Convert loaded CSV directly to Google Earth ({includeAttributes ? 'With Attributes' : 'Without Attribute'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectExportKmz}
              disabled={points.length === 0}
              className="px-4 py-1.5 bg-[#0288d1] hover:bg-[#039be5] disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Kmz/kml
            </button>
            <button
              onClick={handleDirectExportKml}
              disabled={points.length === 0}
              className="px-3.5 py-1.5 bg-[#14344e] hover:bg-[#1d4669] disabled:bg-slate-700 text-cyan-200 border border-[#235882] font-semibold rounded flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              Export CSV to KML
            </button>
          </div>
        </div>

        {/* Quick Sample Loaders & Templates */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[#163854]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[11px]">Quick Load Samples:</span>
            <button
              onClick={loadSampleStandard}
              className="px-2.5 py-1 text-[11px] bg-[#14344e] hover:bg-[#1d4669] text-cyan-200 border border-[#235882] rounded transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Standard WTG
            </button>
            <button
              onClick={loadSampleGisAttributes}
              className="px-2.5 py-1 text-[11px] bg-[#1a4060] hover:bg-[#23537a] text-cyan-100 border border-cyan-500/40 rounded transition-colors cursor-pointer flex items-center gap-1 font-semibold"
              title="Loads exact culvert attribute reference from image_23f10d02.png"
            >
              <Table className="w-3 h-3 text-cyan-300" />
              GIS Ref Table (Image)
            </button>
            <button
              onClick={loadSampleUtm}
              className="px-2.5 py-1 text-[11px] bg-[#14344e] hover:bg-[#1d4669] text-cyan-200 border border-[#235882] rounded transition-colors cursor-pointer"
            >
              UTM (Zone 43N)
            </button>
            <button
              onClick={loadSampleDms}
              className="px-2.5 py-1 text-[11px] bg-[#14344e] hover:bg-[#1d4669] text-cyan-200 border border-[#235882] rounded transition-colors cursor-pointer"
            >
              DMS Coordinates
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">CSV Templates:</span>
            <button
              onClick={() => downloadSampleTemplate('utm')}
              className="text-[11px] text-cyan-300 hover:text-white underline cursor-pointer flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" /> UTM
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => downloadSampleTemplate('dms')}
              className="text-[11px] text-cyan-300 hover:text-white underline cursor-pointer flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" /> DMS
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => downloadSampleTemplate('gisWithAttributes')}
              className="text-[11px] text-cyan-300 hover:text-white underline cursor-pointer flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" /> GIS Table
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Collapsible Placemarks list */}
        {points.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                {showTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showTable ? 'Hide placemark coordinates' : `View all ${points.length} placemark coordinates`}
              </button>

              <button
                type="button"
                onClick={onOpenAttributeTable}
                className="text-xs bg-[#13304a] hover:bg-[#1a4163] text-cyan-200 px-3 py-1 rounded border border-[#235882] flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                Inspect Attributes ({hasAttributes ? 'Custom Fields' : 'Default'})
              </button>
            </div>

            {showTable && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded bg-[#091724] border border-[#1b3d5c] text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#0f283e] text-slate-300 border-b border-[#1b3d5c] sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-3 font-semibold">#</th>
                      <th className="py-1.5 px-3 font-semibold">Placemark Label</th>
                      <th className="py-1.5 px-3 font-semibold">Latitude (GDA_LAT)</th>
                      <th className="py-1.5 px-3 font-semibold">Longitude (GDA_LONG)</th>
                      <th className="py-1.5 px-3 font-semibold">Attributes Attached</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132f48] text-slate-300 font-mono text-[11px]">
                    {points.map((p, idx) => {
                      const attrCount = p.attributes ? Object.keys(p.attributes).length : 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#0f2438]">
                          <td className="py-1 px-3 text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-1 px-3 font-sans text-cyan-200 font-medium">{p.name}</td>
                          <td className="py-1 px-3">{p.lat.toFixed(6)}°</td>
                          <td className="py-1 px-3">{p.lon.toFixed(6)}°</td>
                          <td className="py-1 px-3 font-sans">
                            {attrCount > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                {attrCount} fields
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Earth Pro Launcher Modal */}
      <OpenGoogleEarthModal
        isOpen={isEarthModalOpen}
        onClose={() => setIsEarthModalOpen(false)}
        fileName={exportedFilename}
        onSwitchToMap={onSwitchToMap || (() => {})}
      />
    </div>
  );
};
