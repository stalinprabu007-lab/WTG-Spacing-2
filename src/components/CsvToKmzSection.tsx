import React, { useState, useRef } from 'react';
import { WTGPoint, CoordinateFormat } from '../types/wtg';
import {
  generatePureCsvKmzBlob,
  buildPureCsvKmlString,
  downloadBlob,
  parseCoordinateFile,
  getPlacemarkName,
} from '../utils/kmlKmz';
import { parseCsvWithCoordinates } from '../utils/csvParser';
import {
  SAMPLE_CSV_TEMPLATES,
  SAMPLE_GIS_ATTRIBUTE_POINTS,
} from '../data/wtgModels';
import { OpenGoogleEarthModal } from './OpenGoogleEarthModal';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  Table,
  Globe2,
  FileCode,
  Compass,
  SlidersHorizontal,
  RefreshCw,
  Palette,
  Loader2,
  Tag,
} from 'lucide-react';

interface Props {
  points: WTGPoint[];
  setPoints: React.Dispatch<React.SetStateAction<WTGPoint[]>>;
  loadedFileName: string;
  setLoadedFileName: (name: string) => void;
  placemarkLabelColumn?: string;
  setPlacemarkLabelColumn?: (col: string) => void;
  onOpenAttributeTable: () => void;
  onSwitchToMap: () => void;
}

export const CsvToKmzSection: React.FC<Props> = ({
  points,
  setPoints,
  loadedFileName,
  setLoadedFileName,
  placemarkLabelColumn = '',
  setPlacemarkLabelColumn,
  onOpenAttributeTable,
  onSwitchToMap,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [includeAttributes, setIncludeAttributes] = useState(true);
  const [pinColor, setPinColor] = useState('#ffea00'); // Yellow pushpin
  const [folderName, setFolderName] = useState('Imported CSV Placemarks');
  const [coordFormat, setCoordFormat] = useState<CoordinateFormat>('auto');
  const [utmZone, setUtmZone] = useState<number>(43);
  const [utmHemi, setUtmHemi] = useState<'N' | 'S'>('N');
  const [detectedCoordType, setDetectedCoordType] = useState<string | null>(null);
  const [lastCsvText, setLastCsvText] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEarthModalOpen, setIsEarthModalOpen] = useState(false);
  const [lastExportedFilename, setLastExportedFilename] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const reparseCsvText = (
    csvText: string,
    nextFormat: CoordinateFormat,
    nextZone: number,
    nextHemi: 'N' | 'S',
    fileNameLabel?: string
  ) => {
    setErrorMsg(null);
    try {
      const res = parseCsvWithCoordinates(csvText, {
        coordinateType: nextFormat,
        defaultUtmZone: nextZone,
        defaultUtmHemisphere: nextHemi,
      });
      setPoints(res.points);
      setDetectedCoordType(res.coordinateTypeDetected);
      setSuccessMsg(
        `Loaded ${res.points.length} points (${res.coordinateTypeDetected.toUpperCase()}${
          res.utmZoneUsed ? ` ${res.utmZoneUsed}` : ''
        })${fileNameLabel ? ` from ${fileNameLabel}` : ''}`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const handleUploadFile = async (file: File) => {
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
          setDetectedCoordType(res.coordinateTypeDetected);
          setLoadedFileName(file.name);
          setFolderName(file.name.replace(/\.[^/.]+$/, ''));
          setSuccessMsg(
            `Loaded ${res.points.length} points (${res.coordinateTypeDetected.toUpperCase()}${
              res.utmZoneUsed ? ` ${res.utmZoneUsed}` : ''
            }) from ${file.name}`
          );
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
      setDetectedCoordType(res.coordinateTypeDetected || null);
      setLoadedFileName(file.name);
      setFolderName(file.name.replace(/\.[^/.]+$/, ''));
      setSuccessMsg(`Loaded ${res.points.length} points from ${file.name}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const handleExportKmz = async () => {
    if (points.length === 0) {
      alert('Please load or import a CSV file first.');
      return;
    }

    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const blob = await generatePureCsvKmzBlob(points, {
        includeAttributes,
        folderName: folderName || 'Placemarks',
        documentName: folderName || 'CSV to KMZ Export',
        pinColorHex: pinColor,
        labelField: placemarkLabelColumn,
      });

      const modeStr = includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const cleanBase = (loadedFileName || 'Placemarks').replace(/\.[^/.]+$/, '');
      const filename = `${cleanBase}_${points.length}pts_${modeStr}.kmz`;

      downloadBlob(blob, filename);
      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully converted CSV to KMZ: ${filename}`);
      setIsEarthModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      alert('Error converting CSV to KMZ: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportKml = async () => {
    if (points.length === 0) {
      alert('Please load or import a CSV file first.');
      return;
    }

    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const kmlString = buildPureCsvKmlString(points, {
        includeAttributes,
        folderName: folderName || 'Placemarks',
        documentName: folderName || 'CSV to KML Export',
        pinColorHex: pinColor,
        labelField: placemarkLabelColumn,
      });

      const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
      const modeStr = includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const cleanBase = (loadedFileName || 'Placemarks').replace(/\.[^/.]+$/, '');
      const filename = `${cleanBase}_${points.length}pts_${modeStr}.kml`;

      downloadBlob(blob, filename);
      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully converted CSV to KML: ${filename}`);
      setIsEarthModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      alert('Error converting CSV to KML: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const loadSampleGisTable = () => {
    setPoints(SAMPLE_GIS_ATTRIBUTE_POINTS);
    setLoadedFileName('Culvert_Survey_Attributes_Table.csv');
    setFolderName('Culvert Survey Placemarks');
    setIncludeAttributes(true);
    setErrorMsg(null);
    setSuccessMsg('Loaded sample GIS Culvert attribute table matching reference image');
  };

  const downloadTemplate = (type: 'utm' | 'dms' | 'gisWithAttributes') => {
    const content = SAMPLE_CSV_TEMPLATES[type];
    const filename =
      type === 'utm'
        ? 'Template_UTM_Easting_Northing.csv'
        : type === 'dms'
        ? 'Template_DMS_Degrees_Min_Sec.csv'
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

  const totalAttributesCount = points.reduce(
    (max, p) => Math.max(max, p.attributes ? Object.keys(p.attributes).length : 0),
    0
  );

  return (
    <div className="bg-[#10273d] border border-[#1b4366] rounded-sm overflow-hidden shadow-md">
      {/* Header Banner */}
      <div className="bg-[#143d5c] px-4 py-3 border-b border-[#1f517a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#0c2539] text-cyan-300 border border-cyan-500/30">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-white text-sm sm:text-base font-bold tracking-wide flex items-center gap-2">
              CSV to KMZ / KML Converter
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-mono">
                UTM • DMS • Decimal Degrees
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Directly convert any CSV (with or without attributes) into Google Earth KMZ / KML
            </p>
          </div>
        </div>

        {points.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-300 bg-[#0c2539] px-3 py-1 rounded border border-[#215682] font-semibold">
              {points.length} placemarks ready
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Upload & Drag Zone */}
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
              handleUploadFile(e.dataTransfer.files[0]);
            }
          }}
          className={`p-4 rounded-lg border-2 border-dashed transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDragging
              ? 'border-cyan-400 bg-[#0d2a42]'
              : 'border-[#1b4366] bg-[#0b1c2b] hover:border-[#28608f]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-lg bg-[#112d45] text-cyan-400 shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {loadedFileName || 'Select or Drag & Drop any CSV / TSV file'}
                {points.length > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically detects <b className="text-cyan-300">UTM (Easting/Northing)</b>, <b className="text-cyan-300">Degrees Minutes Seconds (DMS)</b>, and <b className="text-cyan-300">Decimal Degrees (DD)</b>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
              accept=".csv,.tsv,.txt,.kml,.kmz"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#0288d1] hover:bg-[#039be5] text-white text-xs font-bold rounded transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              Browse CSV File...
            </button>
            <button
              onClick={loadSampleGisTable}
              className="px-3 py-2 bg-[#133450] hover:bg-[#1a4469] text-cyan-200 border border-[#215682] text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              title="Loads exact GIS culvert attribute table from reference image"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load Sample GIS Table
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-950/70 border border-red-800 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Conversion & Styling Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded bg-[#0d2235] border border-[#184266] text-xs">
          {/* 1. Attribute Mode */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              KMZ Attribute Mode:
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIncludeAttributes(true)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  includeAttributes
                    ? 'bg-[#0288d1] border-cyan-400 text-white shadow-sm'
                    : 'bg-[#091724] border-[#1b4366] text-slate-400 hover:text-white'
                }`}
              >
                With Attributes
              </button>
              <button
                type="button"
                onClick={() => setIncludeAttributes(false)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition-colors cursor-pointer ${
                  !includeAttributes
                    ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                    : 'bg-[#091724] border-[#1b4366] text-slate-400 hover:text-white'
                }`}
              >
                Without Attribute
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {includeAttributes
                ? 'Adds Google Earth HTML balloon table with all CSV columns'
                : 'Pure placemark names and coordinates only'}
            </p>
          </div>

          {/* 2. Coordinate System Detection */}
          <div className="space-y-1.5">
            <label htmlFor="csv-coord-format" className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Coordinate Format (X=Easting/Lon, Y=Northing/Lat):
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="csv-coord-format"
                value={coordFormat}
                onChange={(e) => {
                  const next = e.target.value as CoordinateFormat;
                  setCoordFormat(next);
                  if (lastCsvText) {
                    reparseCsvText(lastCsvText, next, utmZone, utmHemi, loadedFileName);
                  }
                }}
                className="bg-[#091724] border border-[#1b4366] text-white text-xs rounded px-2 py-1.5 focus:border-cyan-400 outline-none flex-1"
              >
                <option value="auto">Auto-Detect (UTM / DMS / DD — supports X/Y)</option>
                <option value="decimal_degrees">Decimal Degrees (DD: Lat/Y, Lon/X)</option>
                <option value="dms">Degree Min Sec (DMS)</option>
                <option value="utm">UTM (Easting/X, Northing/Y)</option>
              </select>

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
                        reparseCsvText(lastCsvText, coordFormat, nextZ, utmHemi, loadedFileName);
                      }
                    }}
                    className="w-12 bg-[#091724] border border-[#1b4366] text-white text-xs rounded px-1 py-1.5 text-center font-mono"
                    title="UTM Zone"
                  />
                  <button
                    type="button"
                    aria-label="Toggle UTM Hemisphere"
                    onClick={() => {
                      const nextH = utmHemi === 'N' ? 'S' : 'N';
                      setUtmHemi(nextH);
                      if (lastCsvText) {
                        reparseCsvText(lastCsvText, coordFormat, utmZone, nextH, loadedFileName);
                      }
                    }}
                    className="px-2 py-1.5 bg-[#14344e] text-cyan-300 text-xs font-bold rounded border border-[#235882] cursor-pointer"
                  >
                    {utmHemi}
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Zone: <span className="text-cyan-300 font-mono">{utmZone}{utmHemi}</span> (WGS84) • Easting=X, Northing=Y
            </p>
          </div>

          {/* 3. Folder Name & Pin Color */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              Folder Label &amp; Pin Color:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Google Earth Folder Name"
                className="bg-[#091724] border border-[#1b4366] text-white text-xs rounded px-2.5 py-1.5 focus:border-cyan-400 outline-none flex-1 font-sans"
              />
              <div className="flex items-center gap-1">
                {['#ffff00', '#00e5ff', '#ff3366', '#00e676', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPinColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border cursor-pointer transition-transform ${
                      pinColor === c ? 'scale-125 border-white ring-2 ring-cyan-400' : 'border-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Selected placemark pin color
            </p>
          </div>
        </div>

        {/* Placemark Label Selection Option */}
        <div className="p-3.5 rounded bg-[#091b2c] border border-[#1e4d75] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-xs">
                Placemark Label Selection:
              </span>
              <span className="text-[11px] text-slate-300">
                Choose which CSV column displays as the placemark name in Google Earth (<code className="text-cyan-300">&lt;name&gt;</code>)
              </span>
            </div>
            {placemarkLabelColumn ? (
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                Active Column: {placemarkLabelColumn}
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
                <span className="text-slate-400">Sample Label:</span>
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
            Folder sidebar table preview hidden with <code className="text-cyan-300">&lt;Snippet maxLines="0"/&gt;</code> for clean pushpin list (matching ref-2), full attributes balloon opens on click (12px font).
          </p>
        </div>

        {/* PRIMARY EXPORT BUTTONS: CSV to KMZ and CSV to KML */}
        <div className="p-4 rounded-lg bg-[#0b1e30] border border-[#1d4d77] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* PRIMARY KMZ EXPORT BUTTON */}
              <button
                onClick={handleExportKmz}
                disabled={isExporting || points.length === 0}
                className="px-6 py-3 bg-[#0288d1] hover:bg-[#039be5] disabled:bg-slate-700 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-md transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer flex items-center gap-2.5"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Kmz/kml</span>
              </button>

              {/* SECONDARY KML EXPORT BUTTON */}
              <button
                onClick={handleExportKml}
                disabled={isExporting || points.length === 0}
                className="px-5 py-3 bg-[#13324d] hover:bg-[#1b4468] text-cyan-200 border border-[#235882] text-xs sm:text-sm font-bold rounded-md transition-colors cursor-pointer flex items-center gap-2"
                title="Download uncompressed KML XML"
              >
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span>Export CSV to KML (.kml)</span>
              </button>

              {/* INSPECT ATTRIBUTE TABLE */}
              <button
                onClick={onOpenAttributeTable}
                className="px-4 py-3 bg-[#0c2438] hover:bg-[#14344e] text-slate-200 border border-[#1b4366] text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-2"
              >
                <Table className="w-4 h-4 text-cyan-400" />
                <span>View Attribute Table ({totalAttributesCount > 0 ? `${totalAttributesCount} cols` : 'Standard'})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEarthModalOpen(true)}
                className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer underline"
              >
                <Globe2 className="w-4 h-4 text-cyan-400" />
                Google Earth Pro Link
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-2 border-t border-[#163854]">
            <p>
              Output format: <b className="text-cyan-300">{includeAttributes ? 'With Attributes' : 'Without Attribute'}</b> • Google Earth client: <span className="font-mono text-cyan-200">C:\Program Files\Google\Google Earth Pro\client\googleearth.exe</span>
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>Templates:</span>
              <button
                onClick={() => downloadTemplate('utm')}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                UTM (.csv)
              </button>
              <span>•</span>
              <button
                onClick={() => downloadTemplate('dms')}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                DMS (.csv)
              </button>
              <span>•</span>
              <button
                onClick={() => downloadTemplate('gisWithAttributes')}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                GIS Ref Table (.csv)
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button
              onClick={() => setIsEarthModalOpen(true)}
              className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer transition-colors flex items-center gap-1.5 text-xs"
            >
              <Globe2 className="w-3.5 h-3.5" />
              Open in Google Earth
            </button>
          </div>
        )}
      </div>

      {/* Google Earth Pro Launcher Modal */}
      <OpenGoogleEarthModal
        isOpen={isEarthModalOpen}
        onClose={() => setIsEarthModalOpen(false)}
        fileName={lastExportedFilename || `${folderName}.kmz`}
        onSwitchToMap={onSwitchToMap}
      />
    </div>
  );
};
