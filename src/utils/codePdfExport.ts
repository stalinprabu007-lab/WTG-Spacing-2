import {
  buildSourceCodePdfBlob,
  normalizeProjectFile,
  ProjectFileEntry,
} from './codePdfBuilder';
import { downloadBlob } from './kmlKmz';

/**
 * Collects all source and configuration files from every folder in the project
 * via Vite's build-time raw glob imports.
 */
export function collectProjectSourceFiles(): ProjectFileEntry[] {
  const rawRootModules = import.meta.glob(
    [
      '/index.html',
      '/package.json',
      '/tsconfig.json',
      '/vite.config.ts',
      '/metadata.json',
      '/.env.example',
    ],
    { query: '?raw', import: 'default', eager: true }
  ) as Record<string, string>;

  const rawSrcModules = import.meta.glob('/src/**/*.{ts,tsx,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const entries: ProjectFileEntry[] = [];

  for (const [rawPath, content] of Object.entries(rawRootModules)) {
    if (typeof content === 'string') {
      entries.push(normalizeProjectFile(rawPath, content));
    }
  }

  for (const [rawPath, content] of Object.entries(rawSrcModules)) {
    if (typeof content === 'string' && !rawPath.endsWith('.test.ts')) {
      entries.push(normalizeProjectFile(rawPath, content));
    }
  }

  return entries;
}

/**
 * Generates and downloads a single PDF containing all folder names, file names, and full source code.
 */
export function downloadAllProjectCodePdf(): {
  fileCount: number;
  folderCount: number;
  filename: string;
} {
  const entries = collectProjectSourceFiles();
  const folderSet = new Set(entries.map((e) => e.folder));
  const blob = buildSourceCodePdfBlob(entries);
  const filename = 'WTG_Spacing_KMZ_All_Folders_Files_Code.pdf';
  downloadBlob(blob, filename);
  return {
    fileCount: entries.length,
    folderCount: folderSet.size,
    filename,
  };
}
