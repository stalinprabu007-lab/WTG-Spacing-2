import React from 'react';
import { Wind, Map, Terminal, Download, Minus, Square, X, FileSpreadsheet, FileText } from 'lucide-react';
import { downloadAllProjectCodePdf } from '../utils/codePdfExport';

interface Props {
  activeTab: 'tab1' | 'tab2' | 'tab3' | 'csv' | 'map' | 'exe' | 'all';
  setActiveTab: (tab: 'tab1' | 'tab2' | 'tab3' | 'csv' | 'map' | 'exe' | 'all') => void;
  onDownloadExe: () => void;
}

export const DesktopTitleBar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onDownloadExe,
}) => {
  return (
    <div className="bg-[#091824] border-b border-[#183954] text-slate-200 select-none">
      {/* OS Window header */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 border-b border-[#142d44] gap-2 flex-wrap xl:flex-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-4 h-4 rounded bg-[#0288d1] flex items-center justify-center text-white">
            <Wind className="w-3 h-3" />
          </div>
          <span className="font-semibold text-slate-200 tracking-wide whitespace-nowrap">
            WTG Spacing Diagram v1.6
          </span>
          <span className="text-slate-500 text-[11px] hidden 2xl:inline whitespace-nowrap">| Desktop Application</span>
        </div>

        {/* View Switcher Tabs: 1 is Tab 1, 2 is Tab 2, 3 is Tab 3 */}
        <div className="flex items-center bg-[#0c2235] rounded p-0.5 border border-[#1d4363] overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('tab1')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'tab1'
                ? 'bg-[#0288d1] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#163852]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center text-[10px] font-black">1</span>
            <span>1 | WTG File</span>
          </button>

          <button
            onClick={() => setActiveTab('tab2')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'tab2'
                ? 'bg-[#0288d1] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#163852]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center text-[10px] font-black">2</span>
            <span>2 | Diagram Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('tab3')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'tab3'
                ? 'bg-[#0288d1] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#163852]'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-200 flex items-center justify-center text-[10px] font-black">3</span>
            <span>3 | Create Output</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'csv'
                ? 'bg-[#00897b] text-white shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-[#163852]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV to KMZ</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-[#0288d1] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#163852]'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('exe')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'exe'
                ? 'bg-[#0288d1] text-white shadow-sm'
                : 'text-amber-400 hover:text-amber-300 hover:bg-[#163852]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>EXE Hub</span>
          </button>
        </div>

        {/* Quick actions + Window controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadAllProjectCodePdf()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#143d5c] hover:bg-[#1b5077] text-cyan-200 border border-[#235f8c] rounded transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            title="Download all folders, file names, and full source code in a PDF file"
          >
            <FileText className="w-3 h-3 text-cyan-300" />
            <span>All Code PDF</span>
          </button>
          <button
            type="button"
            onClick={onDownloadExe}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            title="Download Windows Executable Package"
          >
            <Download className="w-3 h-3" />
            <span>Download .EXE Package</span>
          </button>
          <div className="hidden md:flex items-center">
            <button type="button" aria-label="Minimize window" className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[#173752] transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <button type="button" aria-label="Maximize window" className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[#173752] transition-colors">
              <Square className="w-2.5 h-2.5" />
            </button>
            <button type="button" aria-label="Close window" className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
