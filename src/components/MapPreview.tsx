import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DiagramSettings, WTGPoint } from '../types/wtg';
import {
  getCircleCoordinates,
  getEllipseCoordinates,
  getRectangleCoordinates,
  getRose5Dx7D,
  LatLon,
} from '../utils/geo';
import { Layers, ZoomIn, ZoomOut, Maximize2, Wind, Eye } from 'lucide-react';

interface Props {
  points: WTGPoint[];
  settings: DiagramSettings;
}

export const MapPreview: React.FC<Props> = ({ points, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapType, setMapType] = useState<'satellite' | 'dark'>('satellite');
  const [zoom, setZoom] = useState(14);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);

  // Determine active turbine points
  const activePoints = useMemo(() => {
    if (settings.exportMode === 'single') {
      const match = points.find((p) => p.id === settings.selectedWtgId);
      return match ? [match] : points.slice(0, 1);
    }
    return points;
  }, [points, settings.exportMode, settings.selectedWtgId]);

  // Center coordinate of points
  const mapCenter = useMemo(() => {
    if (activePoints.length === 0) return { lat: 15.1842, lon: 75.8924 };
    const avgLat = activePoints.reduce((acc, p) => acc + p.lat, 0) / activePoints.length;
    const avgLon = activePoints.reduce((acc, p) => acc + p.lon, 0) / activePoints.length;
    return { lat: avgLat, lon: avgLon };
  }, [activePoints]);

  const resetView = () => {
    setCenterOffset({ x: 0, y: 0 });
    setZoom(14);
  };

  // Convert lat/lon to canvas XY in pixels
  const project = (lat: number, lon: number, width: number, height: number) => {
    // Web Mercator style projection
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLon = 111320 * Math.cos((mapCenter.lat * Math.PI) / 180);

    // Pixels per meter at this zoom level
    const pxPerMeter = (Math.pow(2, zoom) * 256) / (40075016 * Math.cos((mapCenter.lat * Math.PI) / 180));

    const dxMeters = (lon - mapCenter.lon) * metersPerDegreeLon;
    const dyMeters = (lat - mapCenter.lat) * metersPerDegreeLat;

    const x = width / 2 + dxMeters * pxPerMeter + centerOffset.x;
    const y = height / 2 - dyMeters * pxPerMeter + centerOffset.y;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - centerOffset.x, y: e.clientY - centerOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setCenterOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.3 : -0.3;
    setZoom((z) => Math.max(11, Math.min(18, z + zoomDelta)));
  };

  const [dims, setDims] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (containerRef.current) {
      setDims({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 550,
      });
    }
  }, []);

  return (
    <div className="bg-[#0b1c2b] border border-[#1b4366] rounded-sm overflow-hidden flex flex-col h-[650px] relative select-none">
      {/* Top Map Bar */}
      <div className="bg-[#143d5c] px-4 py-2 border-b border-[#1f517a] flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-white text-sm font-bold tracking-wide">
            Interactive GIS & Google Earth Style Preview
          </h3>
          <span className="text-slate-400 text-xs hidden sm:inline">
            · {settings.diagramType} Mode · {activePoints.length} Turbine{activePoints.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Map style toggle */}
          <div className="flex items-center bg-[#0d2a40] rounded p-0.5 border border-[#1d4b70] text-xs">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-0.5 rounded ${
                mapType === 'satellite' ? 'bg-[#0288d1] text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('dark')}
              className={`px-2 py-0.5 rounded ${
                mapType === 'dark' ? 'bg-[#0288d1] text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark GIS
            </button>
          </div>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
              showLabels
                ? 'bg-[#18486e] text-cyan-200 border-[#286a9e]'
                : 'bg-[#0e273d] text-slate-400 border-[#1b3d5c]'
            }`}
            title="Toggle Labels"
          >
            <Eye className="w-3 h-3" />
            Labels
          </button>
        </div>
      </div>

      {/* Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 w-full relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{
            backgroundColor: mapType === 'satellite' ? '#18241e' : '#081420',
            backgroundImage:
              mapType === 'satellite'
                ? 'radial-gradient(circle at 50% 50%, #2a3a30 0%, #152219 70%, #0d1610 100%)'
                : 'linear-gradient(to right, #0d2235 1px, transparent 1px), linear-gradient(to bottom, #0d2235 1px, transparent 1px)',
            backgroundSize: mapType === 'satellite' ? 'cover' : '40px 40px',
          }}
        >
          {/* Subtle satellite farm terrain representation */}
          {mapType === 'satellite' && (
            <g opacity="0.25">
              <rect x="5%" y="10%" width="30%" height="25%" fill="#3a4a2f" />
              <rect x="40%" y="15%" width="25%" height="35%" fill="#48593a" />
              <rect x="10%" y="45%" width="45%" height="40%" fill="#2d3b25" />
              <rect x="68%" y="30%" width="28%" height="55%" fill="#3b4d32" />
              <path d="M 0,200 Q 400,280 900,180" stroke="#706248" strokeWidth="4" fill="none" opacity="0.4" />
            </g>
          )}

          {/* Marker definitions for dimension arrows */}
          <defs>
            <marker id="dimArrowHeadStart" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <polygon points="10,1 1,5 10,9" fill={settings.labelColor} />
            </marker>
            <marker id="dimArrowHeadEnd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <polygon points="0,1 9,5 0,9" fill={settings.labelColor} />
            </marker>
          </defs>

          {/* Render Diagrams for each active turbine */}
          {activePoints.map((p) => {
            const lineWidth = settings.commonLineWidth || 2.3;
            const opacity = (settings.commonOpacity ?? 60) / 100;

            if (settings.diagramType === 'Circle') {
              const radius = settings.circleRadius || 5 * settings.rotorDiameter;
              const coords = getCircleCoordinates(p.lat, p.lon, radius, 72);
              const pathD = coords
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              // Outline only per user request: "Except 5Dx7D, all make line area not required"
              return (
                <path
                  key={`circle-${p.id}`}
                  d={pathD}
                  fill="none"
                  stroke={settings.circleColor}
                  strokeWidth={lineWidth}
                  opacity="0.95"
                />
              );
            }

            if (settings.diagramType === 'Ellipse') {
              const longRad = settings.ellipseLongRadius || 7 * settings.rotorDiameter;
              const shortRad = settings.ellipseShortRadius || 5 * settings.rotorDiameter;
              const coords = getEllipseCoordinates(
                p.lat,
                p.lon,
                longRad,
                shortRad,
                settings.ellipseLongAxis,
                72
              );
              const pathD = coords
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              // Outline only per user request: "Except 5Dx7D, all make line area not required"
              return (
                <path
                  key={`ellipse-${p.id}`}
                  d={pathD}
                  fill="none"
                  stroke={settings.ellipseColor}
                  strokeWidth={lineWidth}
                  opacity="0.95"
                />
              );
            }

            if (settings.diagramType === '5Dx7D') {
              const rose = getRose5Dx7D(
                p.lat,
                p.lon,
                settings.rotorDiameter,
                settings.windDirection,
                settings.sectorShadeAngle
              );

              const innerD = rose.inner5DCircle
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              const s1D = rose.wakeSector1
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              const s2D = rose.wakeSector2
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              const ns1 = project(rose.dimLineNS[0].lat, rose.dimLineNS[0].lon, dims.width, dims.height);
              const ns2 = project(rose.dimLineNS[1].lat, rose.dimLineNS[1].lon, dims.width, dims.height);
              const ew1 = project(rose.dimLineEW[0].lat, rose.dimLineEW[0].lon, dims.width, dims.height);
              const ew2 = project(rose.dimLineEW[1].lat, rose.dimLineEW[1].lon, dims.width, dims.height);

              const lbl5DN = project(rose.labelPos5DNorth.lat, rose.labelPos5DNorth.lon, dims.width, dims.height);
              const lbl5DS = project(rose.labelPos5DSouth.lat, rose.labelPos5DSouth.lon, dims.width, dims.height);
              const lbl7DE = project(rose.labelPos7DEast.lat, rose.labelPos7DEast.lon, dims.width, dims.height);
              const lbl7DW = project(rose.labelPos7DWest.lat, rose.labelPos7DWest.lon, dims.width, dims.height);

              // Arrowhead polygon helper
              const renderArrowPoly = (coords: LatLon[]) => {
                const pts = coords.map((c) => project(c.lat, c.lon, dims.width, dims.height));
                return pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + ' Z';
              };

              return (
                <g key={`rose-${p.id}`}>
                  {/* Inner 5D Circle (Red filled with common opacity) */}
                  <path
                    d={innerD}
                    fill={settings.rose5DColor}
                    fillOpacity={opacity}
                    stroke={settings.rose5DColor}
                    strokeWidth={lineWidth}
                  />

                  {/* 7D Wake Sector 1 (Blue filled with common opacity) */}
                  <path
                    d={s1D}
                    fill={settings.rose7DColor}
                    fillOpacity={opacity}
                    stroke={settings.rose7DColor}
                    strokeWidth={lineWidth}
                  />

                  {/* 7D Wake Sector 2 (Blue filled with common opacity) */}
                  <path
                    d={s2D}
                    fill={settings.rose7DColor}
                    fillOpacity={opacity}
                    stroke={settings.rose7DColor}
                    strokeWidth={lineWidth}
                  />

                  {/* Dimension lines with ARROWS & labels if toggled */}
                  {settings.measurementLabels && (
                    <g>
                      <line
                        x1={ns1.x}
                        y1={ns1.y}
                        x2={ns2.x}
                        y2={ns2.y}
                        stroke={settings.labelColor}
                        strokeWidth="1.8"
                        opacity="0.9"
                        markerStart="url(#dimArrowHeadStart)"
                        markerEnd="url(#dimArrowHeadEnd)"
                      />
                      <line
                        x1={ew1.x}
                        y1={ew1.y}
                        x2={ew2.x}
                        y2={ew2.y}
                        stroke={settings.labelColor}
                        strokeWidth="1.8"
                        opacity="0.9"
                        markerStart="url(#dimArrowHeadStart)"
                        markerEnd="url(#dimArrowHeadEnd)"
                      />

                      {/* Explicit filled arrowhead polygons at the ends */}
                      <path d={renderArrowPoly(rose.arrowNS1)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rose.arrowNS2)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rose.arrowEW1)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rose.arrowEW2)} fill={settings.labelColor} />

                      {/* Small badge labels (Page 5 Output 2c requirement) */}
                      <g transform={`translate(${lbl5DN.x}, ${lbl5DN.y})`}>
                        <rect x="-24" y="-11" width="48" height="22" rx="4" fill="#800000" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rose.dist5D}m</text>
                      </g>
                      <g transform={`translate(${lbl5DS.x}, ${lbl5DS.y})`}>
                        <rect x="-24" y="-11" width="48" height="22" rx="4" fill="#800000" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rose.dist5D}m</text>
                      </g>
                      <g transform={`translate(${lbl7DE.x}, ${lbl7DE.y})`}>
                        <rect x="-26" y="-11" width="52" height="22" rx="4" fill="#002b80" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rose.dist7D}m</text>
                      </g>
                      <g transform={`translate(${lbl7DW.x}, ${lbl7DW.y})`}>
                        <rect x="-26" y="-11" width="52" height="22" rx="4" fill="#002b80" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rose.dist7D}m</text>
                      </g>
                    </g>
                  )}
                </g>
              );
            }

            if (settings.diagramType === 'Rectangle') {
              const dist5D = settings.rect5DDistance || 5 * settings.rotorDiameter;
              const dist7D = settings.rect7DDistance || 7 * settings.rotorDiameter;
              const rect = getRectangleCoordinates(p.lat, p.lon, dist5D, dist7D);

              const pathD = rect.corners
                .map((c, i) => {
                  const pt = project(c.lat, c.lon, dims.width, dims.height);
                  return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              const ns1 = project(rect.dimLineNS[0].lat, rect.dimLineNS[0].lon, dims.width, dims.height);
              const ns2 = project(rect.dimLineNS[1].lat, rect.dimLineNS[1].lon, dims.width, dims.height);
              const ew1 = project(rect.dimLineEW[0].lat, rect.dimLineEW[0].lon, dims.width, dims.height);
              const ew2 = project(rect.dimLineEW[1].lat, rect.dimLineEW[1].lon, dims.width, dims.height);

              const lbl5DN = project(rect.labelPos5DNorth.lat, rect.labelPos5DNorth.lon, dims.width, dims.height);
              const lbl5DS = project(rect.labelPos5DSouth.lat, rect.labelPos5DSouth.lon, dims.width, dims.height);
              const lbl7DE = project(rect.labelPos7DEast.lat, rect.labelPos7DEast.lon, dims.width, dims.height);
              const lbl7DW = project(rect.labelPos7DWest.lat, rect.labelPos7DWest.lon, dims.width, dims.height);

              const renderArrowPoly = (coords: LatLon[]) => {
                const pts = coords.map((c) => project(c.lat, c.lon, dims.width, dims.height));
                return pts.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ') + ' Z';
              };

              // Outline only per user request: "Except 5Dx7D, all make line area not required"
              return (
                <g key={`rect-${p.id}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={settings.rectColor}
                    strokeWidth={lineWidth}
                    opacity="0.95"
                  />

                  {settings.measurementLines && (
                    <g>
                      <line
                        x1={ns1.x}
                        y1={ns1.y}
                        x2={ns2.x}
                        y2={ns2.y}
                        stroke={settings.labelColor}
                        strokeWidth="1.8"
                        opacity="0.9"
                        markerStart="url(#dimArrowHeadStart)"
                        markerEnd="url(#dimArrowHeadEnd)"
                      />
                      <line
                        x1={ew1.x}
                        y1={ew1.y}
                        x2={ew2.x}
                        y2={ew2.y}
                        stroke={settings.labelColor}
                        strokeWidth="1.8"
                        opacity="0.9"
                        markerStart="url(#dimArrowHeadStart)"
                        markerEnd="url(#dimArrowHeadEnd)"
                      />

                      {/* Filled Arrowhead polygons at tips */}
                      <path d={renderArrowPoly(rect.arrowNS1)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rect.arrowNS2)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rect.arrowEW1)} fill={settings.labelColor} />
                      <path d={renderArrowPoly(rect.arrowEW2)} fill={settings.labelColor} />
                    </g>
                  )}

                  {settings.measurementLabels && (
                    <g>
                      <g transform={`translate(${lbl5DN.x}, ${lbl5DN.y})`}>
                        <rect x="-24" y="-11" width="48" height="22" rx="4" fill="#1e293b" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rect.dist5D}m</text>
                      </g>
                      <g transform={`translate(${lbl5DS.x}, ${lbl5DS.y})`}>
                        <rect x="-24" y="-11" width="48" height="22" rx="4" fill="#1e293b" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rect.dist5D}m</text>
                      </g>
                      <g transform={`translate(${lbl7DE.x}, ${lbl7DE.y})`}>
                        <rect x="-26" y="-11" width="52" height="22" rx="4" fill="#1e293b" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rect.dist7D}m</text>
                      </g>
                      <g transform={`translate(${lbl7DW.x}, ${lbl7DW.y})`}>
                        <rect x="-26" y="-11" width="52" height="22" rx="4" fill="#1e293b" stroke={settings.labelColor} strokeWidth="1" />
                        <text x="0" y="4" fill={settings.labelColor} fontSize="11" fontWeight="bold" textAnchor="middle">{rect.dist7D}m</text>
                      </g>
                    </g>
                  )}
                </g>
              );
            }

            return null;
          })}

          {/* Render Turbines & Placemark Pins */}
          {activePoints.map((p) => {
            const pt = project(p.lat, p.lon, dims.width, dims.height);
            return (
              <g key={`pin-${p.id}`} transform={`translate(${pt.x}, ${pt.y})`}>
                {/* Yellow Google Earth placemark pin */}
                <path
                  d="M 0,0 L -8,-24 A 8,8 0 1,1 8,-24 Z"
                  fill="#facc15"
                  stroke="#854d0e"
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="-24" r="3.5" fill="#ffffff" />
                <circle cx="0" cy="0" r="2.5" fill="#facc15" />

                {/* Placemark label text */}
                {showLabels && (() => {
                  const labelText = (settings.placemarkLabelColumn && p.attributes?.[settings.placemarkLabelColumn] !== undefined)
                    ? String(p.attributes[settings.placemarkLabelColumn])
                    : p.name;
                  const labelWidth = Math.max(labelText.length * 7.5 + 12, 36);
                  return (
                    <g transform="translate(12, -20)">
                      <rect
                        x="-4"
                        y="-12"
                        width={labelWidth}
                        height="18"
                        rx="3"
                        fill="#0f172a"
                        fillOpacity="0.85"
                        stroke="#38bdf8"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="1"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </svg>

        {/* Floating Zoom & Controls */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 bg-[#091b2c]/90 border border-[#1b4366] p-1.5 rounded shadow-lg backdrop-blur-sm">
          <button
            onClick={() => setZoom((z) => Math.min(18, z + 0.5))}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-[#143d5c] rounded cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(11, z - 0.5))}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-[#143d5c] rounded cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 text-slate-200 hover:text-white hover:bg-[#143d5c] rounded cursor-pointer border-t border-[#1b4366]"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Compass Rose */}
        <div className="absolute left-4 bottom-4 bg-[#091b2c]/85 border border-[#1b4366] px-3 py-2 rounded text-xs text-slate-300 flex items-center gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Wind: {settings.windDirection}°</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-cyan-300 font-mono">Zoom: {zoom.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};
