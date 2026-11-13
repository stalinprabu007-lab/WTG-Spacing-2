import React, { useState } from 'react';
import { downloadDesktopPackage } from '../utils/desktopPackage';
import { downloadAllProjectCodePdf } from '../utils/codePdfExport';
import { AppIcon } from './AppIcon';
import { Download, Terminal, CheckCircle2, FileCode, ShieldCheck, Cpu, FileText } from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const DesktopExeModal: React.FC<Props> = ({ isOpen = true, onClose, isEmbedded = false }) => {
  const [downloading, setDownloading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadDesktopPackage();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCodePdf = () => {
    const res = downloadAllProjectCodePdf();
    setPdfStatus(`Downloaded ${res.filename} (${res.folderCount} folders, ${res.fileCount} files)`);
  };

  const content = (
    <div className="space-y-5 text-slate-200 text-xs">
      {/* Hero Header with App Icon */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded bg-[#0b1c2b] border border-[#1d4669]">
        <div className="w-16 h-16 shrink-0 rounded-2xl shadow-lg border border-[#00e5ff]/30 overflow-hidden bg-[#0a1826]">
          <AppIcon className="w-full h-full" />
        </div>
        <div>
          <h3 className="text-white text-base font-bold flex items-center gap-2">
            WTG Spacing Tool v1.6 — Windows Desktop Edition (.exe)
          </h3>
          <p className="text-slate-400 mt-1 text-xs">
            Complete standalone desktop package matching the WTG Spacing Tool specification.
            Runs natively on Windows without requiring a browser or web server.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-cyan-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Offline Capable
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Windows 10 & 11 Compatible
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Direct KMZ & Google Earth Export
            </span>
          </div>
        </div>
      </div>

      {/* 1-Click Download EXE Package Button */}
      <div className="p-4 rounded bg-[#132f4c] border border-[#235882] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            Download Windows EXE Package (.zip)
          </div>
          <p className="text-slate-300 text-[11px] mt-0.5">
            Includes: <span className="font-mono text-cyan-300">build_windows_exe.bat</span>, <span className="font-mono text-cyan-300">wtg_desktop_app.py</span>, <span className="font-mono text-cyan-300">run_wtg_tool.bat</span>, and icon assets.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Preparing ZIP...' : 'Download Package (.zip)'}</span>
        </button>
      </div>

      {/* 1-Click Export All Folders, File Names & Source Code as PDF */}
      <div className="p-4 rounded bg-[#0d2438] border border-[#1f517a] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Complete Project Source Code Archive (.pdf)
          </div>
          <p className="text-slate-300 text-[11px] mt-0.5">
            Exports every folder, file name, directory index, and complete line-numbered source code into a single downloadable PDF.
          </p>
          {pdfStatus && (
            <p className="text-emerald-300 text-[11px] mt-1 font-medium">
              {pdfStatus}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownloadCodePdf}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#0288d1] hover:bg-[#039be5] text-white font-bold text-xs rounded transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <FileText className="w-4 h-4" />
          <span>Download All Folders &amp; Code (.pdf)</span>
        </button>
      </div>

      {/* Three Installation Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Method 1: Automatic 1-Click EXE Build */}
        <div className="p-3.5 rounded bg-[#091b2c] border border-[#1b3d5c] space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
            <Terminal className="w-4 h-4 text-emerald-400" />
            1. Standalone Windows .EXE
          </div>
          <p className="text-slate-400 text-[11px]">
            No server or node required. Runs everywhere.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] pl-1">
            <li>Click <strong className="text-emerald-300">Download Package (.zip)</strong> above.</li>
            <li>Extract the ZIP on your PC.</li>
            <li>Double-click <span className="text-amber-300 font-mono">build_windows_exe.bat</span>.</li>
            <li>PyInstaller compiles:
              <div className="mt-1 font-mono text-emerald-400 bg-[#06121c] p-1 rounded border border-[#15344e] text-[10px]">
                WTG_Spacing_Tool_v1.6.exe
              </div>
            </li>
            <li>Double-click the <span className="font-mono text-emerald-300">.exe</span> to launch!</li>
          </ol>
        </div>

        {/* Method 2: Browser Desktop App / Shortcut */}
        <div className="p-3.5 rounded bg-[#091b2c] border border-[#1b3d5c] space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
            <Cpu className="w-4 h-4 text-cyan-400" />
            2. Desktop App (PWA Shortcut)
          </div>
          <p className="text-slate-400 text-[11px]">
            Install directly from Chrome or Edge:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] pl-1">
            <li>Open this app in Chrome or Edge.</li>
            <li>In the browser address bar, click the <strong className="text-cyan-300">Install</strong> icon (or menu ⋮ → <em>Save and share</em> → <em>Install page as app</em>).</li>
            <li>Check <strong>"Open as window"</strong>.</li>
            <li>A native app window opens with its own icon on your Windows Desktop and Taskbar!</li>
          </ol>
        </div>

        {/* Method 3: Local Node.js / React Environment */}
        <div className="p-3.5 rounded bg-[#091b2c] border border-[#1b3d5c] space-y-2">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
            <FileCode className="w-4 h-4 text-amber-400" />
            3. Run Local Node / React Code
          </div>
          <p className="text-slate-400 text-[11px]">
            To run this React + Vite source code locally:
          </p>
          <div className="space-y-1.5 text-slate-300 text-[11px]">
            <div>1. Install <span className="text-cyan-300 font-mono">Node.js LTS</span> from nodejs.org</div>
            <div>2. In the project folder, open terminal and run:</div>
            <pre className="bg-[#050e17] p-1.5 rounded border border-[#14314c] font-mono text-[10px] text-cyan-200">
              npm install{'\n'}npm run dev
            </pre>
            <div>3. Open <span className="text-cyan-300 font-mono">http://localhost:3000</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="bg-[#10273d] border border-[#1b4366] rounded-sm p-4 shadow-md">
        {content}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="bg-[#10273d] border border-[#1f517a] w-full max-w-2xl rounded shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#143d5c] px-4 py-3 flex items-center justify-between border-b border-[#1f517a]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Terminal className="w-4 h-4 text-cyan-400" />
            WTG Spacing Tool v1.6 — Windows Desktop .EXE Builder
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto">{content}</div>
      </div>
    </div>
  );
};
