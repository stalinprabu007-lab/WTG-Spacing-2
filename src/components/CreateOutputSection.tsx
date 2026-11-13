import React, { useState } from 'react';
import { DiagramSettings, WTGPoint } from '../types/wtg';
import {
  generateKmzBlob,
  buildKmzPackage,
  downloadBlob,
  generatePureCsvKmzBlob,
  buildPureCsvKmlString,
} from '../utils/kmlKmz';
import { OpenGoogleEarthModal } from './OpenGoogleEarthModal';
import {
  Download,
  CheckCircle,
  FileCode,
  Layers,
  ExternalLink,
  Loader2,
  Globe2,
  Table,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  points: WTGPoint[];
  settings: DiagramSettings;
  onSwitchToMap: () => void;
  onOpenAttributeTable?: () => void;
}

export const CreateOutputSection: React.FC<Props> = ({
  points,
  settings,
  onSwitchToMap,
  onOpenAttributeTable,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOpenEarthModalOpen, setIsOpenEarthModalOpen] = useState(false);
  const [lastExportedFilename, setLastExportedFilename] = useState<string>('');

  const targetCount = settings.exportMode === 'single' ? 1 : points.length;

  const handleExportKmz = async () => {
    if (points.length === 0) {
      alert('Please load or select at least one WTG turbine point.');
      return;
    }

    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const blob = await generateKmzBlob(points, settings);
      const filename = `WTG_Spacing_${settings.diagramType}_${targetCount}WTG_${
        settings.includeAttributes ? 'With_Attributes' : 'Without_Attribute'
      }.kmz`;
      downloadBlob(blob, filename);

      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully generated and downloaded ${filename}`);
      setIsOpenEarthModalOpen(true); // Automatically ask user to open Google Earth
    } catch (err: unknown) {
      console.error(err);
      alert('Error generating KMZ file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportKml = async () => {
    if (points.length === 0) {
      alert('Please load or select at least one WTG turbine point.');
      return;
    }

    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const { kmlString } = await buildKmzPackage(points, settings);
      const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
      const filename = `WTG_Spacing_${settings.diagramType}_${targetCount}WTG.kml`;
      downloadBlob(blob, filename);

      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully downloaded ${filename}`);
      setIsOpenEarthModalOpen(true); // Automatically ask user to open Google Earth
    } catch (err: unknown) {
      console.error(err);
      alert('Error exporting KML: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsvOnlyKmz = async () => {
    if (points.length === 0) {
      alert('Please load or select at least one coordinate point.');
      return;
    }
    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const modeStr = settings.includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const filename = `CSV_Placemarks_${points.length}pts_${modeStr}.kmz`;
      const blob = await generatePureCsvKmzBlob(points, {
        includeAttributes: settings.includeAttributes,
        folderName: 'CSV Imported Placemarks',
        labelField: settings.placemarkLabelColumn,
      });
      downloadBlob(blob, filename);
      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully converted CSV to KMZ: ${filename}`);
      setIsOpenEarthModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      alert('Error converting CSV to KMZ: ' + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsvOnlyKml = async () => {
    if (points.length === 0) {
      alert('Please load or select at least one coordinate point.');
      return;
    }
    setIsExporting(true);
    setSuccessMsg(null);
    try {
      const modeStr = settings.includeAttributes ? 'With_Attributes' : 'Without_Attribute';
      const filename = `CSV_Placemarks_${points.length}pts_${modeStr}.kml`;
      const kmlString = buildPureCsvKmlString(points, {
        includeAttributes: settings.includeAttributes,
        folderName: 'CSV Imported Placemarks',
        labelField: settings.placemarkLabelColumn,
      });
      const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
      downloadBlob(blob, filename);
      setLastExportedFilename(filename);
      setSuccessMsg(`Successfully converted CSV to KML: ${filename}`);
      setIsOpenEarthModalOpen(true);
    } catch (err: unknown) {
      console.error(err);
      alert('Error converting CSV to KML: ' + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="bg-[#10273d] border border-[#1b4366] rounded-sm overflow-hidden shadow-md">
        {/* Section Header */}
        <div className="bg-[#143d5c] px-4 py-2 border-b border-[#1f517a] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-white text-sm font-bold tracking-wide">
            3 | Create output (Google Earth KMZ / KML)
          </h2>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-cyan-300 font-semibold">
              Ready to export: {targetCount} turbine{targetCount > 1 ? 's' : ''}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                settings.includeAttributes
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {settings.includeAttributes ? 'With Attributes' : 'Without Attribute'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Card 1: Direct CSV to KMZ / KML Export (Placemarks Only with Attributes) */}
          <div className="p-3.5 rounded bg-[#0b1e30] border border-[#1d4d77] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Direct CSV to KMZ / KML Export (Placemarks Only)
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                {settings.includeAttributes ? 'Includes Attribute Table' : 'Coordinates Only'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Converts your CSV coordinates (UTM, DMS, or Decimal Degrees) directly into Google Earth KMZ/KML placemarks.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleExportCsvOnlyKmz}
                disabled={isExporting || points.length === 0}
                className="px-5 py-2.5 bg-[#00897b] hover:bg-[#009688] disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-xs rounded transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Export Kmz/kml</span>
              </button>

              <button
                onClick={handleExportCsvOnlyKml}
                disabled={isExporting || points.length === 0}
                className="px-4 py-2.5 bg-[#103042] hover:bg-[#163f57] text-teal-200 border border-[#1b506d] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5"
                title="Download uncompressed KML XML"
              >
                <FileCode className="w-4 h-4 text-teal-300" />
                Export CSV to KML (.kml)
              </button>

              {onOpenAttributeTable && (
                <button
                  onClick={onOpenAttributeTable}
                  className="px-3.5 py-2.5 bg-[#0f2940] hover:bg-[#173d5e] text-slate-200 border border-[#1b486f] text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                >
                  <Table className="w-3.5 h-3.5 text-cyan-400" />
                  View Attribute Table
                </button>
              )}
            </div>
          </div>

          {/* Card 2: WTG Spacing Diagrams Export (Placemarks + 5Dx7D/Circles/Ellipses) */}
          <div className="p-3.5 rounded bg-[#091b2c] border border-[#184269] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                WTG Spacing Diagrams Export (2-Folder KMZ: Placemarks + {settings.diagramType})
              </h3>
            </div>
            <p className="text-[11px] text-slate-300">
              Generates the reference WTG spacing diagrams ({settings.diagramType}) with wind direction orientation and measurement lines.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleExportKmz}
                disabled={isExporting || points.length === 0}
                className="px-6 py-2.5 bg-[#0288d1] hover:bg-[#039be5] disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-xs rounded transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Export WTG Spacing KMZ</span>
              </button>

              <button
                onClick={handleExportKml}
                disabled={isExporting || points.length === 0}
                className="px-4 py-2.5 bg-[#14344e] hover:bg-[#1d4669] text-cyan-200 border border-[#235882] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-2"
                title="Download uncompressed KML XML"
              >
                <FileCode className="w-4 h-4 text-cyan-400" />
                Export WTG KML
              </button>

              <button
                onClick={onSwitchToMap}
                className="px-4 py-2.5 bg-[#102c44] hover:bg-[#183e60] text-slate-200 border border-[#1e4b72] text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-2 ml-auto"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                Inspect on Map Preview
              </button>
            </div>
          </div>

          {/* Linked Local Google Earth Pro Client Path */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#091b2c] border border-[#173e61] text-xs">
            <div className="flex items-center gap-2 text-slate-300 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="font-medium text-slate-200">Google Earth Pro Linked:</span>
              <span className="font-mono text-cyan-300 bg-[#06121d] px-2 py-0.5 rounded border border-[#13324d] text-[11px]">
                C:\Program Files\Google\Google Earth Pro\client\googleearth.exe
              </span>
            </div>
            <button
              onClick={() => setIsOpenEarthModalOpen(true)}
              className="text-[11px] text-cyan-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              1-Click Launcher &amp; Options
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <p>
              KMZ contains two clean folders: <b className="text-slate-200">Imported WTG placemarks</b> ({settings.includeAttributes ? 'with attribute balloon table' : 'without attribute'}) and <b className="text-slate-200">{settings.diagramType} Diagrams</b>.
            </p>
          </div>

          {successMsg && (
            <div className="p-3 rounded bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsOpenEarthModalOpen(true)}
                  className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Globe2 className="w-3 h-3" />
                  Open in Google Earth
                </button>
                <a
                  href="https://earth.google.com/web/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:text-white flex items-center gap-1 font-medium underline text-[11px]"
                >
                  Earth Web <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Earth Launch & Confirmation Modal */}
      <OpenGoogleEarthModal
        isOpen={isOpenEarthModalOpen}
        onClose={() => setIsOpenEarthModalOpen(false)}
        fileName={lastExportedFilename || `WTG_Spacing_${settings.diagramType}.kmz`}
        onSwitchToMap={onSwitchToMap}
      />
    </>
  );
};
