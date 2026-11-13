import React from 'react';
import { DiagramSettings, DiagramType, WTGModel, WTGPoint } from '../types/wtg';
import { Plus, Compass, Info, Palette, Sliders } from 'lucide-react';

interface Props {
  settings: DiagramSettings;
  setSettings: React.Dispatch<React.SetStateAction<DiagramSettings>>;
  wtgModels: WTGModel[];
  points: WTGPoint[];
  onOpenAddModal: () => void;
}

export const DiagramSettingsSection: React.FC<Props> = ({
  settings,
  setSettings,
  wtgModels,
  points,
  onOpenAddModal,
}) => {
  const selectedPoint = points.find((p) => p.id === settings.selectedWtgId) || points[0];

  const handleModelChange = (modelId: string) => {
    const model = wtgModels.find((m) => m.id === modelId);
    if (!model) return;

    const rd = model.rd;
    setSettings((prev) => ({
      ...prev,
      wtgModelId: model.id,
      rotorDiameter: rd,
      hubHeight: model.hh,
      circleRadius: Math.round(5 * rd),
      ellipseShortRadius: Math.round(5 * rd),
      ellipseLongRadius: Math.round(7 * rd),
      rect5DDistance: Math.round(5 * rd),
      rect7DDistance: Math.round(7 * rd),
    }));
  };

  const updateSetting = <K extends keyof DiagramSettings>(key: K, val: DiagramSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleCommonLineWidthChange = (val: number) => {
    setSettings((prev) => ({
      ...prev,
      commonLineWidth: val,
      circleWidth: val,
      ellipseWidth: val,
      rose5DWidth: val,
      rose7DWidth: val,
      rectWidth: val,
    }));
  };

  const handleCommonOpacityChange = (val: number) => {
    setSettings((prev) => ({
      ...prev,
      commonOpacity: val,
      rose5DOpacity: val,
      rose7DOpacity: val,
    }));
  };

  return (
    <div className="bg-[#10273d] border border-[#1b4366] rounded-sm overflow-hidden shadow-md">
      {/* Section Header */}
      <div className="bg-[#143d5c] px-4 py-2 border-b border-[#1f517a] flex items-center justify-between">
        <h2 className="text-white text-sm font-bold tracking-wide">
          2 | Diagram settings
        </h2>
        {/* User request: "WTG Model enough RD and HH not required in WTG make and WTG Model tab" */}
        <span className="text-[11px] text-cyan-300 font-medium">
          Model: {wtgModels.find((m) => m.id === settings.wtgModelId)?.name || 'Custom'}
        </span>
      </div>

      <div className="p-4 space-y-4 text-xs text-slate-200">
        {/* Row 1: Export Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-[#173a5a]">
          <span className="font-semibold text-slate-200 min-w-36">Export diagrams for:</span>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="exportMode"
                checked={settings.exportMode === 'all'}
                onChange={() => updateSetting('exportMode', 'all')}
                className="w-4 h-4 text-[#0288d1] focus:ring-0 bg-[#0a1826] border-[#1b3d5c] cursor-pointer"
              />
              <span className={settings.exportMode === 'all' ? 'text-white font-medium' : 'text-slate-400'}>
                All WTG points (one KMZ)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="exportMode"
                checked={settings.exportMode === 'single'}
                onChange={() => updateSetting('exportMode', 'single')}
                className="w-4 h-4 text-[#0288d1] focus:ring-0 bg-[#0a1826] border-[#1b3d5c] cursor-pointer"
              />
              <span className={settings.exportMode === 'single' ? 'text-white font-medium' : 'text-slate-400'}>
                Selected centre only
              </span>
            </label>
          </div>
        </div>

        {/* Row 2: Centre WTG (single mode) */}
        <div className={`flex flex-col sm:flex-row sm:items-center gap-3 ${settings.exportMode !== 'single' ? 'opacity-50' : ''}`}>
          <label className="w-36 shrink-0 text-slate-300 font-medium">
            Centre WTG (single mode):
          </label>
          <div className="flex-1 max-w-sm">
            <select
              value={settings.selectedWtgId}
              onChange={(e) => updateSetting('selectedWtgId', e.target.value)}
              disabled={settings.exportMode !== 'single'}
              className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-3 py-1.5 text-white disabled:bg-[#07131e] disabled:text-slate-500 cursor-pointer"
            >
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-cyan-300 font-mono text-[11px]">
            Centre coordinate: {selectedPoint ? `${selectedPoint.lat.toFixed(5)}°, ${selectedPoint.lon.toFixed(5)}°` : '—'}
          </div>
        </div>

        {/* Row 3: WTG Make / Model (SOLVED OVERLAP: dedicated clean row, model name only without RD & HH) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <label className="w-36 shrink-0 text-slate-300 font-medium">
            WTG make / model:
          </label>
          <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={settings.wtgModelId}
              onChange={(e) => handleModelChange(e.target.value)}
              className="flex-1 min-w-[220px] bg-[#0a1826] border border-[#1b3d5c] rounded px-3 py-1.5 text-white cursor-pointer font-sans"
            >
              {wtgModels.map((m) => (
                /* User request: "WTG Model enough RD and HH not required in WTG make and WTG Model tab" */
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 bg-[#163854] hover:bg-[#1f4a70] text-cyan-200 border border-[#235882] rounded font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0"
              title="Add custom turbine model"
            >
              <Plus className="w-3.5 h-3.5" />
              Add WTG...
            </button>
          </div>
        </div>

        {/* Row 4: Dimensions & Orientation (Separated so Rotor Diameter never collides with Add WTG) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Rotor diameter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 whitespace-nowrap">Rotor diameter (m):</span>
            <input
              type="number"
              step="0.1"
              value={settings.rotorDiameter}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setSettings((prev) => ({
                  ...prev,
                  rotorDiameter: val,
                  circleRadius: Math.round(5 * val),
                  ellipseShortRadius: Math.round(5 * val),
                  ellipseLongRadius: Math.round(7 * val),
                  rect5DDistance: Math.round(5 * val),
                  rect7DDistance: Math.round(7 * val),
                }));
              }}
              className="w-20 bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
            />
          </div>

          {/* Hub height */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 whitespace-nowrap">Hub height (m):</span>
            <input
              type="number"
              step="0.5"
              value={settings.hubHeight}
              onChange={(e) => updateSetting('hubHeight', parseFloat(e.target.value) || 0)}
              className="w-20 bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
            />
          </div>

          {/* Wind direction */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 whitespace-nowrap">Wind direction (°):</span>
            <input
              type="number"
              value={settings.windDirection}
              onChange={(e) => {
                const wd = parseFloat(e.target.value) || 0;
                setSettings((prev) => ({
                  ...prev,
                  windDirection: wd,
                  ellipseLongAxis: wd,
                }));
              }}
              className="w-20 bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
            />
            <span className="text-slate-400 text-[11px] flex items-center gap-1" title="0° = north, clockwise">
              <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              0°=N
            </span>
          </div>
        </div>

        {/* Row 5: Common Style Settings (User request: "Opacity make and Width make it common") */}
        <div className="p-3 rounded bg-[#0b1c2b] border border-[#193f63] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Common Style Settings:</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {/* Common Line Width */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Line width (px):</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={settings.commonLineWidth}
                onChange={(e) => handleCommonLineWidthChange(parseFloat(e.target.value) || 2.3)}
                className="w-16 bg-[#0a1826] border border-[#1b3d5c] rounded px-2 py-1 text-white font-mono"
              />
            </div>

            {/* Common Opacity for 5Dx7D area fill */}
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Opacity (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.commonOpacity}
                onChange={(e) => handleCommonOpacityChange(parseInt(e.target.value) || 60)}
                className="w-16 bg-[#0a1826] border border-[#1b3d5c] rounded px-2 py-1 text-white font-mono"
              />
              <span className="text-[10px] text-slate-400">(for 5Dx7D sectors)</span>
            </div>
          </div>
        </div>

        {/* Row 6: Diagram Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-[#173a5a]">
          <label className="md:col-span-3 text-slate-300 font-medium">
            Diagram type:
          </label>
          <div className="md:col-span-5">
            <select
              value={settings.diagramType}
              onChange={(e) => updateSetting('diagramType', e.target.value as DiagramType)}
              className="w-full bg-[#0a1826] border border-cyan-500 rounded px-3 py-1.5 text-white font-semibold cursor-pointer"
            >
              <option value="Circle">Circle</option>
              <option value="Ellipse">Ellipse</option>
              <option value="5Dx7D">5Dx7D</option>
              <option value="Rectangle">Rectangle</option>
            </select>
          </div>
          {settings.diagramType === '5Dx7D' && (
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-300 whitespace-nowrap">7D sector total shade (°):</span>
              <input
                type="number"
                value={settings.sectorShadeAngle}
                onChange={(e) => updateSetting('sectorShadeAngle', parseFloat(e.target.value) || 60)}
                className="w-16 bg-[#0a1826] border border-[#1b3d5c] rounded px-2 py-1 text-white font-mono"
              />
            </div>
          )}
        </div>

        {/* DYNAMIC SHAPE SETTINGS CONTAINER */}
        <div className="p-3.5 rounded bg-[#091b2c] border border-[#193f63] space-y-3">
          {/* 1. CIRCLE OPTIONS (Line outline only - user request: "Except 5Dx7D, all make line area not required") */}
          {settings.diagramType === 'Circle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  Circle Diagram Settings
                </div>
                <span className="text-[11px] text-amber-300/90 font-medium">
                  Outline line only (no filled area)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    Circle radius (m)
                  </label>
                  <input
                    type="number"
                    value={settings.circleRadius}
                    onChange={(e) => updateSetting('circleRadius', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Default: 5D = {Math.round(5 * settings.rotorDiameter)}m</span>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    Circle color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.circleColor}
                      onChange={(e) => updateSetting('circleColor', e.target.value)}
                      className="w-8 h-8 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                    />
                    <button
                      onClick={() => {
                        const picker = document.getElementById('circleColorInput') as HTMLInputElement;
                        picker?.click();
                      }}
                      className="px-3 py-1 bg-[#14344e] hover:bg-[#1d4669] text-slate-200 border border-[#235882] rounded text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Palette className="w-3 h-3 text-cyan-400" />
                      Choose...
                    </button>
                    <input
                      id="circleColorInput"
                      type="color"
                      value={settings.circleColor}
                      onChange={(e) => updateSetting('circleColor', e.target.value)}
                      className="hidden"
                    />
                    <span className="font-mono text-[11px] text-slate-300">{settings.circleColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ELLIPSE OPTIONS (Line outline only - user request: "Except 5Dx7D, all make line area not required") */}
          {settings.diagramType === 'Ellipse' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  Ellipse Diagram Settings
                </div>
                <span className="text-[11px] text-amber-300/90 font-medium">
                  Outline line only (no filled area)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    Short radius (5D in m)
                  </label>
                  <input
                    type="number"
                    value={settings.ellipseShortRadius}
                    onChange={(e) => updateSetting('ellipseShortRadius', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    Long radius (7D in m)
                  </label>
                  <input
                    type="number"
                    value={settings.ellipseLongRadius}
                    onChange={(e) => updateSetting('ellipseLongRadius', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    Long-axis (°)
                  </label>
                  <input
                    type="number"
                    value={settings.ellipseLongAxis}
                    onChange={(e) => updateSetting('ellipseLongAxis', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className="text-slate-300">Ellipse color:</span>
                <input
                  type="color"
                  value={settings.ellipseColor}
                  onChange={(e) => updateSetting('ellipseColor', e.target.value)}
                  className="w-8 h-8 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                />
                <button
                  onClick={() => {
                    const picker = document.getElementById('ellipseColorInput') as HTMLInputElement;
                    picker?.click();
                  }}
                  className="px-2.5 py-1 bg-[#14344e] hover:bg-[#1d4669] text-slate-200 border border-[#235882] rounded text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Palette className="w-3 h-3 text-cyan-400" />
                  Choose...
                </button>
                <input
                  id="ellipseColorInput"
                  type="color"
                  value={settings.ellipseColor}
                  onChange={(e) => updateSetting('ellipseColor', e.target.value)}
                  className="hidden"
                />
                <span className="font-mono text-[11px] text-slate-300">{settings.ellipseColor}</span>
              </div>

              <div className="text-[11px] text-cyan-400/80">
                Automatic radii: short 5D = {settings.ellipseShortRadius}m; long 7D = {settings.ellipseLongRadius}m; long axis = {settings.ellipseLongAxis}° (wind direction)
              </div>
            </div>
          )}

          {/* 3. 5Dx7D OPTIONS (Has filled area for shaded wake sectors + dimension lines with arrows) */}
          {settings.diagramType === '5Dx7D' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  5Dx7D Rose Settings (Filled Sectors with Common Opacity & Dimension Arrows)
                </div>
                <div className="text-[11px] text-slate-400">
                  5D: {Math.round(5 * settings.rotorDiameter)}m · 7D: {Math.round(7 * settings.rotorDiameter)}m
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-2 rounded bg-[#0b1c2b] border border-[#163550]">
                {/* 5D color */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold w-16">5D color:</span>
                  <input
                    type="color"
                    value={settings.rose5DColor}
                    onChange={(e) => updateSetting('rose5DColor', e.target.value)}
                    className="w-7 h-7 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                  />
                  <button
                    onClick={() => {
                      const picker = document.getElementById('picker5D') as HTMLInputElement;
                      picker?.click();
                    }}
                    className="px-2 py-1 bg-[#14344e] hover:bg-[#1d4669] text-slate-200 border border-[#235882] rounded text-[11px] cursor-pointer"
                  >
                    Choose...
                  </button>
                  <input
                    id="picker5D"
                    type="color"
                    value={settings.rose5DColor}
                    onChange={(e) => updateSetting('rose5DColor', e.target.value)}
                    className="hidden"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{settings.rose5DColor}</span>
                </div>

                {/* 7D color */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold w-16">7D color:</span>
                  <input
                    type="color"
                    value={settings.rose7DColor}
                    onChange={(e) => updateSetting('rose7DColor', e.target.value)}
                    className="w-7 h-7 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                  />
                  <button
                    onClick={() => {
                      const picker = document.getElementById('picker7D') as HTMLInputElement;
                      picker?.click();
                    }}
                    className="px-2 py-1 bg-[#14344e] hover:bg-[#1d4669] text-slate-200 border border-[#235882] rounded text-[11px] cursor-pointer"
                  >
                    Choose...
                  </button>
                  <input
                    id="picker7D"
                    type="color"
                    value={settings.rose7DColor}
                    onChange={(e) => updateSetting('rose7DColor', e.target.value)}
                    className="hidden"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{settings.rose7DColor}</span>
                </div>
              </div>

              {/* Measurement Label & Arrows */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.measurementLabels}
                    onChange={(e) => updateSetting('measurementLabels', e.target.checked)}
                    className="w-4 h-4 text-[#0288d1] rounded bg-[#0a1826] border-[#1b3d5c] cursor-pointer"
                  />
                  <span className="text-slate-200 font-medium">Measurement Label & Arrows</span>
                </label>

                {settings.measurementLabels && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">Label / arrow color:</span>
                    <input
                      type="color"
                      value={settings.labelColor}
                      onChange={(e) => updateSetting('labelColor', e.target.value)}
                      className="w-6 h-6 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                    />
                    <button
                      onClick={() => {
                        const picker = document.getElementById('pickerLabelCol') as HTMLInputElement;
                        picker?.click();
                      }}
                      className="px-2 py-0.5 bg-[#14344e] text-slate-200 border border-[#235882] rounded text-[11px] cursor-pointer"
                    >
                      Choose...
                    </button>
                    <input
                      id="pickerLabelCol"
                      type="color"
                      value={settings.labelColor}
                      onChange={(e) => updateSetting('labelColor', e.target.value)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. RECTANGLE OPTIONS (Line outline only - user request: "Except 5Dx7D, all make line area not required") */}
          {settings.diagramType === 'Rectangle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  Rectangle Diagram Settings
                </div>
                <span className="text-[11px] text-amber-300/90 font-medium">
                  Outline line only (no filled area)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    5D north/south distance (m)
                  </label>
                  <input
                    type="number"
                    value={settings.rect5DDistance}
                    onChange={(e) => updateSetting('rect5DDistance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">
                    7D east/west distance (m)
                  </label>
                  <input
                    type="number"
                    value={settings.rect7DDistance}
                    onChange={(e) => updateSetting('rect7DDistance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a1826] border border-[#1b3d5c] rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-slate-300 font-semibold">Rectangle color:</span>
                <input
                  type="color"
                  value={settings.rectColor}
                  onChange={(e) => updateSetting('rectColor', e.target.value)}
                  className="w-7 h-7 rounded border border-[#1b3d5c] cursor-pointer bg-transparent"
                />
                <button
                  onClick={() => {
                    const picker = document.getElementById('pickerRect') as HTMLInputElement;
                    picker?.click();
                  }}
                  className="px-2 py-1 bg-[#14344e] hover:bg-[#1d4669] text-slate-200 border border-[#235882] rounded text-[11px] cursor-pointer"
                >
                  Choose...
                </button>
                <input
                  id="pickerRect"
                  type="color"
                  value={settings.rectColor}
                  onChange={(e) => updateSetting('rectColor', e.target.value)}
                  className="hidden"
                />
                <span className="font-mono text-[11px] text-slate-300">{settings.rectColor}</span>
              </div>

              {/* Measurement checkboxes with Arrows */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.measurementLines}
                    onChange={(e) => updateSetting('measurementLines', e.target.checked)}
                    className="w-4 h-4 text-[#0288d1] rounded bg-[#0a1826] border-[#1b3d5c] cursor-pointer"
                  />
                  <span className="text-slate-200 font-medium">Measurement lines with Arrows</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.measurementLabels}
                    onChange={(e) => updateSetting('measurementLabels', e.target.checked)}
                    className="w-4 h-4 text-[#0288d1] rounded bg-[#0a1826] border-[#1b3d5c] cursor-pointer"
                  />
                  <span className="text-slate-200 font-medium">Measurement Label</span>
                </label>
              </div>

              <div className="text-[11px] text-cyan-400/80">
                Rectangle: 5D north/south and 7D east/west. Labels stay editable in Google Earth.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
