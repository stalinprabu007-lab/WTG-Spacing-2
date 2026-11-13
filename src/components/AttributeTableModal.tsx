import React, { useState } from 'react';
import { WTGPoint } from '../types/wtg';
import { X, Search, Table, FileSpreadsheet, Eye, ChevronRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  points: WTGPoint[];
  includeAttributes: boolean;
  onToggleIncludeAttributes: (val: boolean) => void;
}

export const AttributeTableModal: React.FC<Props> = ({
  isOpen,
  onClose,
  points,
  includeAttributes,
  onToggleIncludeAttributes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPointId, setSelectedPointId] = useState<string>(points[0]?.id || '');

  if (!isOpen) return null;

  // Collect all unique attribute keys across all points
  const allKeys = Array.from(
    new Set(
      points.flatMap((p) => [
        'NAME',
        'LATITUDE',
        'LONGITUDE',
        ...(p.easting ? ['EASTING', 'NORTHING', 'UTM_ZONE'] : []),
        ...Object.keys(p.attributes || {}),
      ])
    )
  );

  const filteredPoints = points.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (p.name.toLowerCase().includes(term)) return true;
    if (p.attributes) {
      return Object.values(p.attributes).some((v) =>
        String(v).toLowerCase().includes(term)
      );
    }
    return false;
  });

  const selectedPoint = points.find((p) => p.id === selectedPointId) || points[0];

  // Build key-value pairs for the reference style attribute card (matching image_23f10d02.png)
  const detailAttributes: Record<string, string | number> = {};
  if (selectedPoint) {
    if (selectedPoint.attributes && Object.keys(selectedPoint.attributes).length > 0) {
      Object.assign(detailAttributes, selectedPoint.attributes);
    } else {
      detailAttributes['NAME'] = selectedPoint.name;
      detailAttributes['GDA_LAT'] = selectedPoint.lat.toFixed(6);
      detailAttributes['GDA_LONG'] = selectedPoint.lon.toFixed(6);
      if (selectedPoint.easting && selectedPoint.northing) {
        detailAttributes['EASTING'] = selectedPoint.easting;
        detailAttributes['NORTHING'] = selectedPoint.northing;
        detailAttributes['UTM_ZONE'] = selectedPoint.utmZone || '';
      }
    }
  }

  const exportCurrentAttributesCsv = () => {
    if (points.length === 0) return;
    const headers = allKeys;
    const rows = points.map((p) => {
      return headers
        .map((k) => {
          let val = '';
          if (k === 'NAME') val = p.name;
          else if (k === 'LATITUDE' || k === 'GDA_LAT') val = String(p.lat);
          else if (k === 'LONGITUDE' || k === 'GDA_LONG') val = String(p.lon);
          else if (k === 'EASTING') val = String(p.easting || '');
          else if (k === 'NORTHING') val = String(p.northing || '');
          else if (k === 'UTM_ZONE') val = String(p.utmZone || '');
          else if (p.attributes && p.attributes[k] !== undefined) val = String(p.attributes[k]);

          // Escape commas
          if (val.includes(',') || val.includes('"')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Placemark_Attributes_${points.length}items.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0b1c2b] border border-[#1d4d77] rounded-lg shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-[#123652] px-5 py-3 border-b border-[#1b4b73] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#0b2235] text-cyan-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Placemark Attribute Inspector &amp; Table
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  {points.length} features
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Inspect GIS columns (FID, STR_TYPE, SEC_NUM, CUL_DIA, etc.) and toggle attribute export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#1a4b73] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Attribute Export Toggle */}
        <div className="p-4 bg-[#0e2437] border-b border-[#173e61] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-[#081521] border border-[#1b4366] rounded px-3 py-1.5 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search attributes, name, FID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white placeholder-slate-500 outline-none w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle: With Attributes / Without Attribute */}
            <div className="flex items-center gap-2 bg-[#091825] px-3 py-1.5 rounded border border-[#1b4366]">
              <span className="text-slate-300 font-medium">Export in KMZ:</span>
              <button
                type="button"
                onClick={() => onToggleIncludeAttributes(true)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  includeAttributes
                    ? 'bg-[#0288d1] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                With Attributes
              </button>
              <button
                type="button"
                onClick={() => onToggleIncludeAttributes(false)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  !includeAttributes
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Without Attribute
              </button>
            </div>

            <button
              onClick={exportCurrentAttributesCsv}
              className="px-3 py-1.5 bg-[#143d5c] hover:bg-[#1b4e75] text-cyan-200 border border-[#215a86] rounded flex items-center gap-1.5 font-medium cursor-pointer transition-colors"
              title="Download full attribute table as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Split View: Left Reference Card (matching user's image) + Right Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#173e61]">
          {/* Left Column: Attribute Card in Google Earth style from image_23f10d02.png */}
          <div className="md:col-span-5 p-4 flex flex-col overflow-y-auto bg-[#091927]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Google Earth Balloon Preview
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedPoint ? selectedPoint.name : ''}
              </span>
            </div>

            {/* Styled exactly like image_23f10d02.png (all attributes font size 12px per specification) */}
            <div className="bg-white text-slate-900 rounded border border-slate-300 shadow-md overflow-hidden text-[12px] font-sans">
              <div className="bg-[#0288d1] text-white px-3 py-1.5 font-bold text-xs flex items-center justify-between">
                <span>{selectedPoint?.name || 'Feature Attributes'}</span>
                <span className="text-[10px] opacity-80 font-normal">WGS84 / GIS</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-[12px]">
                  <tbody>
                    {Object.entries(detailAttributes).map(([key, val], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-[#f2f7fc]' : 'bg-white'}
                      >
                        <td className="px-2.5 py-1.5 font-bold text-[#1a385c] border-b border-[#dde7f0] text-[12px] tracking-wide w-2/5">
                          {key}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-800 border-b border-[#dde7f0] font-mono text-[12px] w-3/5 break-all">
                          {val !== undefined && val !== null ? String(val) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded bg-[#0e263d] border border-[#194569] text-[11px] text-slate-300">
              <p className="font-semibold text-cyan-200 mb-0.5">Note on KMZ Export:</p>
              {includeAttributes ? (
                <p className="text-emerald-300">
                  ✔ <b>With Attributes</b> active: When opened in Google Earth, clicking each placemark will display this exact attribute table.
                </p>
              ) : (
                <p className="text-amber-300">
                  ⚠ <b>Without Attribute</b> active: Placemarks in Folder 1 will strictly contain coordinates and label only.
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Full Table of all placemarks */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-[#071421]">
            <div className="p-2.5 bg-[#0b1f32] border-b border-[#173e61] text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>All Loaded Records ({filteredPoints.length})</span>
              <span className="text-[11px] text-slate-400">Click row to preview balloon</span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f2a42] text-slate-200 border-b border-[#1b4970] sticky top-0 z-10 font-semibold">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Name / ID</th>
                    <th className="py-2 px-3">Lat / GDA_LAT</th>
                    <th className="py-2 px-3">Lon / GDA_LONG</th>
                    {allKeys
                      .filter((k) => !['NAME', 'LATITUDE', 'LONGITUDE', 'GDA_LAT', 'GDA_LONG'].includes(k))
                      .slice(0, 4)
                      .map((k) => (
                        <th key={k} className="py-2 px-3 uppercase text-[10px] text-cyan-300">
                          {k}
                        </th>
                      ))}
                    <th className="py-2 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#13304a] text-slate-300 font-mono text-[11px]">
                  {filteredPoints.map((p, idx) => {
                    const isSelected = p.id === selectedPointId;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPointId(p.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#143a5c] text-white font-medium'
                            : 'hover:bg-[#0c2236]'
                        }`}
                      >
                        <td className="py-1.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-sans font-bold text-cyan-200">{p.name}</td>
                        <td className="py-1.5 px-3">{p.lat.toFixed(6)}°</td>
                        <td className="py-1.5 px-3">{p.lon.toFixed(6)}°</td>
                        {allKeys
                          .filter((k) => !['NAME', 'LATITUDE', 'LONGITUDE', 'GDA_LAT', 'GDA_LONG'].includes(k))
                          .slice(0, 4)
                          .map((k) => (
                            <td key={k} className="py-1.5 px-3 text-slate-400">
                              {p.attributes && p.attributes[k] !== undefined
                                ? String(p.attributes[k])
                                : '—'}
                            </td>
                          ))}
                        <td className="py-1.5 px-3 text-right font-sans">
                          <span className="inline-flex items-center text-cyan-400">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0e263d] px-5 py-3 border-t border-[#173e61] flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Selected turbine / placemark:{' '}
            <b className="text-cyan-300">{selectedPoint?.name || 'None'}</b>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0288d1] hover:bg-[#039be5] text-white font-bold rounded cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
