/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramSettings, WTGModel, WTGPoint } from './types/wtg';
import { PRESET_WTG_MODELS, SAMPLE_WTG_POINTS } from './data/wtgModels';
import { DesktopTitleBar } from './components/DesktopTitleBar';
import { WTGFileSection } from './components/WTGFileSection';
import { DiagramSettingsSection } from './components/DiagramSettingsSection';
import { CreateOutputSection } from './components/CreateOutputSection';
import { MapPreview } from './components/MapPreview';
import { AddWTGModal } from './components/AddWTGModal';
import { DesktopExeModal } from './components/DesktopExeModal';
import { AttributeTableModal } from './components/AttributeTableModal';
import { CsvToKmzSection } from './components/CsvToKmzSection';
import { downloadDesktopPackage } from './utils/desktopPackage';
import { AppIcon } from './components/AppIcon';
import {
  Download,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Map,
  Layers,
} from 'lucide-react';

export type AppTab = 'tab1' | 'tab2' | 'tab3' | 'csv' | 'map' | 'exe' | 'all';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('tab1');
  const [points, setPoints] = useState<WTGPoint[]>(SAMPLE_WTG_POINTS);
  const [loadedFileName, setLoadedFileName] = useState<string>('Sample_Wind_Farm_5_WTG.kml');
  const [wtgModels, setWtgModels] = useState<WTGModel[]>(PRESET_WTG_MODELS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExeModalOpen, setIsExeModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);

  const [settings, setSettings] = useState<DiagramSettings>({
    exportMode: 'all',
    includeAttributes: true,
    placemarkLabelColumn: '',
    selectedWtgId: 'wtg-1',
    wtgModelId: 'envision_en182',
    rotorDiameter: 181,
    hubHeight: 140,
    windDirection: 270,
    sectorShadeAngle: 60,
    diagramType: '5Dx7D',

    // Common style settings
    commonLineWidth: 2.3,
    commonOpacity: 60,

    // Circle
    circleRadius: 905,
    circleColor: '#ff0000',
    circleWidth: 2.3,

    // Ellipse
    ellipseShortRadius: 905,
    ellipseLongRadius: 1267,
    ellipseLongAxis: 270,
    ellipseColor: '#ffff00',
    ellipseWidth: 2.3,

    // 5Dx7D
    rose5DColor: '#e53935',
    rose5DWidth: 2.3,
    rose5DOpacity: 60,
    rose7DColor: '#1976d2',
    rose7DWidth: 2.3,
    rose7DOpacity: 60,
    measurementLabels: true,
    measurementLines: true,
    labelColor: '#ffffff',

    // Rectangle
    rectColor: '#ffeb3b',
    rectWidth: 2.3,
    rectOpacity: 0,
    rect5DDistance: 905,
    rect7DDistance: 1267,
  });

  const handleAddCustomWTG = (newModel: WTGModel) => {
    setWtgModels((prev) => [newModel, ...prev]);
    setSettings((prev) => ({
      ...prev,
      wtgModelId: newModel.id,
      rotorDiameter: newModel.rd,
      hubHeight: newModel.hh,
      circleRadius: Math.round(5 * newModel.rd),
      ellipseShortRadius: Math.round(5 * newModel.rd),
      ellipseLongRadius: Math.round(7 * newModel.rd),
      rect5DDistance: Math.round(5 * newModel.rd),
      rect7DDistance: Math.round(7 * newModel.rd),
    }));
  };

  return (
    <div className="min-h-screen bg-[#07131e] text-slate-100 flex flex-col font-sans">
      {/* Native Desktop Window Framing */}
      <DesktopTitleBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadExe={() => setIsExeModalOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Header App Banner matching the PDF */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0c2135] border border-[#173a5a] p-4 rounded-sm shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-[#091b2c] border border-[#00e5ff]/40 shadow-inner flex items-center justify-center overflow-hidden">
              <AppIcon className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  WTG Spacing Diagram v1.6
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#0288d1] text-white rounded">
                  DESKTOP SUITE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Create the reference style diagram for one WTG or every WTG in one KMZ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              onClick={() => setActiveTab('csv')}
              className="px-3.5 py-2 bg-[#00897b] hover:bg-[#009688] text-white rounded text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV to KMZ / KML
            </button>
            <button
              onClick={() => setIsExeModalOpen(true)}
              className="px-3.5 py-2 bg-[#102e48] hover:bg-[#184266] text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Windows EXE
            </button>
            <button
              onClick={() => downloadDesktopPackage()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Download Windows Executable ZIP"
            >
              <Download className="w-3.5 h-3.5" />
              Download .EXE
            </button>
          </div>
        </div>

        {/* Primary Step-by-Step Tab Navigation: 1 is Tab 1, 2 is Tab 2, 3 is Tab 3 */}
        <div className="bg-[#0b1d2e] p-2.5 rounded border border-[#173e61] shadow-sm flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tab 1 Button */}
            <button
              onClick={() => setActiveTab('tab1')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tab1'
                  ? 'bg-[#0288d1] text-white shadow-md ring-1 ring-cyan-300'
                  : 'bg-[#0f273d] text-slate-300 hover:text-white hover:bg-[#153856] border border-[#1a4469]'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-black">
                1
              </span>
              <span>1 | WTG Coordinate File</span>
              {points.length > 0 && (
                <span className="text-[10px] bg-[#071927] px-1.5 py-0.5 rounded text-cyan-300 font-mono">
                  {points.length} WTG
                </span>
              )}
            </button>

            {/* Tab 2 Button */}
            <button
              onClick={() => setActiveTab('tab2')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tab2'
                  ? 'bg-[#0288d1] text-white shadow-md ring-1 ring-cyan-300'
                  : 'bg-[#0f273d] text-slate-300 hover:text-white hover:bg-[#153856] border border-[#1a4469]'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-black">
                2
              </span>
              <span>2 | Diagram Settings</span>
              <span className="text-[10px] bg-[#071927] px-1.5 py-0.5 rounded text-amber-300 font-mono">
                {settings.diagramType}
              </span>
            </button>

            {/* Tab 3 Button */}
            <button
              onClick={() => setActiveTab('tab3')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tab3'
                  ? 'bg-[#0288d1] text-white shadow-md ring-1 ring-cyan-300'
                  : 'bg-[#0f273d] text-slate-300 hover:text-white hover:bg-[#153856] border border-[#1a4469]'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-black">
                3
              </span>
              <span>3 | Create Output (Export KMZ)</span>
            </button>

            {/* Direct CSV Tab */}
            <button
              onClick={() => setActiveTab('csv')}
              className={`px-3.5 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'csv'
                  ? 'bg-[#00897b] text-white shadow-md ring-1 ring-emerald-300'
                  : 'bg-[#0f273d] text-emerald-300 hover:text-white hover:bg-[#153856] border border-[#1a4469]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV to KMZ</span>
            </button>

            {/* Map Preview Tab */}
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3.5 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-[#0288d1] text-white shadow-md ring-1 ring-cyan-300'
                  : 'bg-[#0f273d] text-slate-300 hover:text-white hover:bg-[#153856] border border-[#1a4469]'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>GIS Map</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'all' ? 'tab1' : 'all')}
              className="text-[11px] text-cyan-300 hover:text-white underline px-2 py-1 cursor-pointer flex items-center gap-1"
              title="Toggle continuous all-in-one view"
            >
              <Layers className="w-3 h-3" />
              <span>{activeTab === 'all' ? 'Switch to Step Tabs (1 / 2 / 3)' : 'View All on 1 Page'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1 Content: 1 | WTG Coordinate File */}
        {activeTab === 'tab1' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <WTGFileSection
              points={points}
              setPoints={setPoints}
              loadedFileName={loadedFileName}
              setLoadedFileName={setLoadedFileName}
              includeAttributes={settings.includeAttributes}
              setIncludeAttributes={(val) =>
                setSettings((prev) => ({ ...prev, includeAttributes: val }))
              }
              placemarkLabelColumn={settings.placemarkLabelColumn || ''}
              setPlacemarkLabelColumn={(col) =>
                setSettings((prev) => ({ ...prev, placemarkLabelColumn: col }))
              }
              onOpenAttributeTable={() => setIsAttributeModalOpen(true)}
              onSwitchToMap={() => setActiveTab('map')}
            />

            {/* Tab 1 Bottom Navigation Bar */}
            <div className="flex items-center justify-between p-3.5 rounded bg-[#0b1c2b] border border-[#1b3d5c] text-xs">
              <span className="text-slate-300">
                Step 1 completed: <b className="text-cyan-300">{points.length} WTG turbine placemarks</b> loaded and ready.
              </span>
              <button
                onClick={() => setActiveTab('tab2')}
                className="px-5 py-2 bg-[#0288d1] hover:bg-[#039be5] text-white font-bold text-xs rounded transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to 2 | Diagram Settings</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2 Content: 2 | Diagram Settings */}
        {activeTab === 'tab2' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <DiagramSettingsSection
              settings={settings}
              setSettings={setSettings}
              wtgModels={wtgModels}
              points={points}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />

            {/* Tab 2 Bottom Navigation Bar */}
            <div className="flex items-center justify-between p-3.5 rounded bg-[#0b1c2b] border border-[#1b3d5c] text-xs">
              <button
                onClick={() => setActiveTab('tab1')}
                className="px-4 py-2 bg-[#13304a] hover:bg-[#1b4366] text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to 1 | WTG Coordinate File</span>
              </button>

              <button
                onClick={() => setActiveTab('tab3')}
                className="px-5 py-2 bg-[#0288d1] hover:bg-[#039be5] text-white font-bold text-xs rounded transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to 3 | Create Output &amp; Export KMZ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3 Content: 3 | Create Output (Google Earth KMZ / KML Export) */}
        {activeTab === 'tab3' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <CreateOutputSection
              points={points}
              settings={settings}
              onSwitchToMap={() => setActiveTab('map')}
              onOpenAttributeTable={() => setIsAttributeModalOpen(true)}
            />

            {/* Tab 3 Bottom Navigation Bar */}
            <div className="flex items-center justify-between p-3.5 rounded bg-[#0b1c2b] border border-[#1b3d5c] text-xs">
              <button
                onClick={() => setActiveTab('tab2')}
                className="px-4 py-2 bg-[#13304a] hover:bg-[#1b4366] text-slate-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to 2 | Diagram Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className="px-4 py-2 bg-[#102c44] hover:bg-[#183e60] text-cyan-200 border border-[#1e4b72] text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Inspect on GIS Map Preview</span>
                <Map className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>
        )}

        {/* View All on 1 Page (Combined View) */}
        {activeTab === 'all' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Section 1: WTG coordinate file */}
            <WTGFileSection
              points={points}
              setPoints={setPoints}
              loadedFileName={loadedFileName}
              setLoadedFileName={setLoadedFileName}
              includeAttributes={settings.includeAttributes}
              setIncludeAttributes={(val) =>
                setSettings((prev) => ({ ...prev, includeAttributes: val }))
              }
              placemarkLabelColumn={settings.placemarkLabelColumn || ''}
              setPlacemarkLabelColumn={(col) =>
                setSettings((prev) => ({ ...prev, placemarkLabelColumn: col }))
              }
              onOpenAttributeTable={() => setIsAttributeModalOpen(true)}
              onSwitchToMap={() => setActiveTab('map')}
            />

            {/* Section 2: Diagram settings */}
            <DiagramSettingsSection
              settings={settings}
              setSettings={setSettings}
              wtgModels={wtgModels}
              points={points}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />

            {/* Section 3: Create output */}
            <CreateOutputSection
              points={points}
              settings={settings}
              onSwitchToMap={() => setActiveTab('map')}
              onOpenAttributeTable={() => setIsAttributeModalOpen(true)}
            />
          </div>
        )}

        {/* Dedicated CSV to KMZ / KML Tab */}
        {activeTab === 'csv' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <CsvToKmzSection
              points={points}
              setPoints={setPoints}
              loadedFileName={loadedFileName}
              setLoadedFileName={setLoadedFileName}
              placemarkLabelColumn={settings.placemarkLabelColumn || ''}
              setPlacemarkLabelColumn={(col) =>
                setSettings((prev) => ({ ...prev, placemarkLabelColumn: col }))
              }
              onOpenAttributeTable={() => setIsAttributeModalOpen(true)}
              onSwitchToMap={() => setActiveTab('map')}
            />
          </div>
        )}

        {/* GIS / Satellite Map Preview */}
        {activeTab === 'map' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <MapPreview points={points} settings={settings} />

            {/* Mini Quick Bar to trigger Export while on Map View */}
            <div className="p-3 bg-[#0c2135] border border-[#173a5a] rounded flex items-center justify-between text-xs">
              <span className="text-slate-300">
                Viewing <span className="text-cyan-300 font-bold">{settings.diagramType}</span> spacing model for {points.length} turbines
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('tab2')}
                  className="px-3 py-1.5 bg-[#14344e] hover:bg-[#1d4669] text-white rounded cursor-pointer"
                >
                  Adjust Diagram Settings (Tab 2)
                </button>
                <button
                  onClick={() => setActiveTab('tab3')}
                  className="px-4 py-1.5 bg-[#0288d1] hover:bg-[#039be5] text-white font-bold rounded cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export KMZ (Tab 3)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exe' && (
          <DesktopExeModal isEmbedded={true} />
        )}
      </main>

      {/* Add Custom WTG Modal */}
      <AddWTGModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddCustomWTG}
      />

      {/* Desktop EXE Package Modal */}
      {isExeModalOpen && (
        <DesktopExeModal
          isOpen={isExeModalOpen}
          onClose={() => setIsExeModalOpen(false)}
        />
      )}

      {/* Placemark Attribute Inspector Modal */}
      <AttributeTableModal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        points={points}
        includeAttributes={settings.includeAttributes}
        onToggleIncludeAttributes={(val) =>
          setSettings((prev) => ({ ...prev, includeAttributes: val }))
        }
      />
    </div>
  );
}
