import React, { useState, useEffect } from 'react';
import {
  Globe2,
  ExternalLink,
  Map,
  X,
  CheckCircle2,
  Monitor,
  Copy,
  Check,
  Terminal,
  FolderOpen,
  Download,
  Settings,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onSwitchToMap: () => void;
}

const DEFAULT_GE_PATH = 'C:\\Program Files\\Google\\Google Earth Pro\\client\\googleearth.exe';

export const OpenGoogleEarthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fileName,
  onSwitchToMap,
}) => {
  const [gePath, setGePath] = useState<string>(() => {
    return localStorage.getItem('ge_pro_client_path') || DEFAULT_GE_PATH;
  });
  const [showPathSettings, setShowPathSettings] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    localStorage.setItem('ge_pro_client_path', gePath);
  }, [gePath]);

  if (!isOpen) return null;

  const openGoogleEarthWeb = () => {
    window.open('https://earth.google.com/web/', '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleSwitchToMap = () => {
    onSwitchToMap();
    onClose();
  };

  // Generate the Windows Run command:
  // "C:\Program Files\Google\Google Earth Pro\client\googleearth.exe" "%USERPROFILE%\Downloads\<fileName>"
  const winRunCommand = `"${gePath}" "%USERPROFILE%\\Downloads\\${fileName}"`;

  const copyRunCommand = () => {
    navigator.clipboard.writeText(winRunCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const copyPathOnly = () => {
    navigator.clipboard.writeText(gePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
  };

  /**
   * Downloads a 1-click Windows Batch file that launches the downloaded KMZ directly
   * using the user's specific Google Earth Pro installation path.
   */
  const downloadBatchLauncher = () => {
    const batContent = `@echo off
title Launching in Google Earth Pro...
echo ===================================================================
echo   Opening ${fileName} in Google Earth Pro
echo ===================================================================
echo.

set "GE_EXE=${gePath}"
set "TARGET_KMZ=%~dp0${fileName}"

:: If not next to the bat, try standard user Downloads directory
if not exist "%TARGET_KMZ%" (
    set "TARGET_KMZ=%USERPROFILE%\\Downloads\\${fileName}"
)

if not exist "%GE_EXE%" (
    echo [ERROR] Google Earth Pro executable was not found at:
    echo "%GE_EXE%"
    echo.
    echo Please verify your installed folder or update the path.
    pause
    exit /b 1
)

echo Starting Google Earth Pro...
start "" "%GE_EXE%" "%TARGET_KMZ%"
echo Done!
timeout /t 2 >nul
exit
`;

    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Open_in_Google_Earth_Pro.bat`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Generates a Windows Registry file (.reg) to permanently associate .kmz and .kml files
   * with the user's specific Google Earth Pro installation path: C:\Program Files\Google\Google Earth Pro\client\googleearth.exe
   */
  const downloadRegistryAssociation = () => {
    // Escaped path for .reg syntax (double backslashes)
    const escapedGePath = gePath.replace(/\\/g, '\\\\');
    const regContent = `Windows Registry Editor Version 5.00

; Permanent file association for .kmz and .kml with Google Earth Pro
[HKEY_CLASSES_ROOT\\.kmz]
@="GoogleEarth.KMZ"
"Content Type"="application/vnd.google-earth.kmz"

[HKEY_CLASSES_ROOT\\.kml]
@="GoogleEarth.KML"
"Content Type"="application/vnd.google-earth.kml+xml"

[HKEY_CLASSES_ROOT\\GoogleEarth.KMZ\\shell\\open\\command]
@="\\"${escapedGePath}\\" \\"%1\\""

[HKEY_CLASSES_ROOT\\GoogleEarth.KML\\shell\\open\\command]
@="\\"${escapedGePath}\\" \\"%1\\""
`;

    const blob = new Blob([regContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Associate_KMZ_With_GoogleEarthPro.reg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#0b1e30] border border-[#1b4b73] rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#123652] px-5 py-3.5 border-b border-[#1b4b73] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0b2133] text-cyan-400 border border-cyan-500/30">
              <Globe2 className="w-5 h-5 animate-pulse text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Export Completed!
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-300">
                Downloaded <span className="text-cyan-300 font-mono font-semibold">{fileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1a4b73] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Linked Installation Path Banner */}
          <div className="p-3.5 rounded-lg bg-[#081827] border border-[#18466e] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked to Google Earth Pro Installation
              </span>
              <button
                type="button"
                onClick={() => setShowPathSettings(!showPathSettings)}
                className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer underline"
              >
                <Settings className="w-3 h-3" />
                {showPathSettings ? 'Hide Path' : 'Change Path'}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#040e18] p-2 rounded border border-[#14395b] font-mono text-[11px] text-slate-200 overflow-x-auto">
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate flex-1">{gePath}</span>
              <button
                type="button"
                onClick={copyPathOnly}
                className="px-2 py-0.5 rounded bg-[#102c46] hover:bg-[#184268] text-cyan-200 text-[10px] cursor-pointer whitespace-nowrap flex items-center gap-1"
                title="Copy client path"
              >
                {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPath ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {showPathSettings && (
              <div className="pt-2 border-t border-[#14395b] space-y-1.5 animate-in fade-in">
                <label className="text-[11px] text-slate-300 font-medium">
                  Custom Google Earth Pro Executable Path:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={gePath}
                    onChange={(e) => setGePath(e.target.value)}
                    className="flex-1 bg-[#091929] border border-[#1d4870] rounded px-2.5 py-1 text-xs text-white font-mono focus:border-cyan-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setGePath(DEFAULT_GE_PATH)}
                    className="px-2 py-1 bg-[#153856] text-slate-200 text-[11px] rounded hover:bg-[#1d4c74] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Launch Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Launch Options
            </h4>

            {/* Option 1: 1-Click Launch Script (.bat) */}
            <div className="p-3.5 rounded-lg bg-[#0e273e] border border-[#1d5280] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      1-Click Google Earth Pro Launcher (.bat)
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Instantly opens <span className="font-mono text-cyan-300">{fileName}</span> in your installed Google Earth Pro.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadBatchLauncher}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .bat
                </button>
              </div>
            </div>

            {/* Option 2: Windows Run Shortcut (Win + R) */}
            <div className="p-3.5 rounded-lg bg-[#091b2c] border border-[#184269] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  Run from Windows (Win + R or Terminal)
                </div>
                <button
                  type="button"
                  onClick={copyRunCommand}
                  className="px-2.5 py-1 bg-[#13324f] hover:bg-[#1b446c] text-cyan-200 border border-[#235882] rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Command Copied!' : 'Copy Command'}</span>
                </button>
              </div>

              <div className="bg-[#050f18] p-2 rounded border border-[#12304d] font-mono text-[10px] text-cyan-200 break-all select-all">
                {winRunCommand}
              </div>
            </div>

            {/* Option 3: Associate .KMZ with Google Earth Pro (.reg) */}
            <div className="p-3.5 rounded-lg bg-[#091b2c] border border-[#184269] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  Always Open KMZ with Google Earth Pro
                </div>
                <div className="text-[11px] text-slate-400">
                  Associates double-clicking any <span className="font-mono text-cyan-300">.kmz</span> or <span className="font-mono text-cyan-300">.kml</span> directly with your installed client.
                </div>
              </div>
              <button
                type="button"
                onClick={downloadRegistryAssociation}
                className="px-3 py-1.5 bg-[#143857] hover:bg-[#1d4c74] text-cyan-200 border border-[#235b86] rounded text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 cursor-pointer"
                title="Download Windows Registry file to associate .kmz with Google Earth Pro"
              >
                <Download className="w-3 h-3" />
                Associate (.reg)
              </button>
            </div>

            {/* Option 4: Google Earth Web */}
            <button
              onClick={openGoogleEarthWeb}
              className="w-full p-3 rounded-lg bg-[#0288d1] hover:bg-[#039be5] text-white flex items-center justify-between text-left transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Globe2 className="w-4 h-4 text-white shrink-0" />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    Open in Google Earth Web
                    <ExternalLink className="w-3 h-3 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div className="text-[10px] text-cyan-100">
                    Runs directly in your browser • Click Projects &gt; Open &gt; Import KML/KMZ
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-white/20">
                Launch Web
              </span>
            </button>

            {/* Option 5: Built-in 3D Satellite Map */}
            <button
              onClick={handleSwitchToMap}
              className="w-full p-2.5 rounded-lg bg-[#112d45] hover:bg-[#193f60] border border-[#1e4e75] text-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Map className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  Inspect Spacing Diagrams on Built-in 3D Satellite Map
                </span>
              </div>
              <span className="text-[11px] text-amber-300 font-medium">View Now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#091b2b] px-5 py-3 border-t border-[#173e61] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            Installed location: <span className="font-mono text-cyan-300">...\client\googleearth.exe</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#173e61] hover:bg-[#20527e] text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
