import { jsPDF } from 'jspdf';

export interface ProjectFileEntry {
  path: string; // e.g. "src/utils/csvParser.ts" or "package.json"
  folder: string; // e.g. "src/utils/" or "Root /"
  fileName: string; // e.g. "csvParser.ts"
  code: string;
}

export interface FolderGroup {
  folder: string;
  files: ProjectFileEntry[];
}

/**
 * Converts Unicode punctuation/symbols inside source code or comments to safe ASCII
 * so standard PDF WinAnsi fonts (Courier/Helvetica) render cleanly without garbled glyphs.
 */
export function toPdfAscii(text: string): string {
  return text
    .replace(/\t/g, '  ')
    .replace(/\r/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/°/g, ' deg')
    .replace(/[′']/g, "'")
    .replace(/[″""]/g, '"')
    .replace(/[•·]/g, '*')
    .replace(/[—–]/g, '-')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/×/g, 'x')
    .replace(/[✔✓]/g, '[OK]')
    .replace(/⚠/g, '[WARN]')
    .replace(/✕/g, 'x')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

/**
 * Normalizes a raw Vite glob or filesystem path into { path, folder, fileName }
 */
export function normalizeProjectFile(rawPath: string, code: string): ProjectFileEntry {
  const cleanPath = rawPath.replace(/^\/+/, '');
  const lastSlash = cleanPath.lastIndexOf('/');
  const folder = lastSlash === -1 ? 'Root /' : `${cleanPath.slice(0, lastSlash)}/`;
  const fileName = lastSlash === -1 ? cleanPath : cleanPath.slice(lastSlash + 1);
  return {
    path: cleanPath,
    folder,
    fileName,
    code,
  };
}

/**
 * Sorts and groups project files by folder cleanly (`Root /` first, then `src/...` alphabetically).
 */
export function groupFilesByFolder(entries: ProjectFileEntry[]): FolderGroup[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.folder === 'Root /' && b.folder !== 'Root /') return -1;
    if (b.folder === 'Root /' && a.folder !== 'Root /') return 1;
    const fCmp = a.folder.localeCompare(b.folder);
    if (fCmp !== 0) return fCmp;
    return a.fileName.localeCompare(b.fileName);
  });

  const groups: FolderGroup[] = [];
  for (const entry of sorted) {
    const existing = groups.find((g) => g.folder === entry.folder);
    if (existing) {
      existing.files.push(entry);
    } else {
      groups.push({ folder: entry.folder, files: [entry] });
    }
  }
  return groups;
}

/**
 * Builds a complete, multi-page A4 PDF document containing:
 * 1. Cover summary + complete folder & file directory index with page numbers
 * 2. Every folder and file name along with its full line-numbered source code
 */
export function buildSourceCodePdfDocument(rawEntries: ProjectFileEntry[]): jsPDF {
  const groups = groupFilesByFolder(rawEntries);
  const orderedFiles = groups.flatMap((g) => g.files);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm
  const topCodeY = 26;
  const bottomLimitY = pageHeight - 14;
  const codeLineHeight = 3.5;

  // Track exact page number where each file starts (Index occupies page 1, code starts at page 2+)
  const indexLinesEstimate = groups.length * 7 + orderedFiles.length * 5.2 + 52;
  const tocPageCount = Math.max(1, Math.ceil(indexLinesEstimate / (pageHeight - 36)));

  // Reserve TOC pages up front so all recorded startPage numbers are exact
  for (let p = 1; p < tocPageCount; p++) {
    doc.addPage();
  }

  const fileStartPages: Record<string, number> = {};

  // Render every source file on clean pages
  for (const file of orderedFiles) {
    doc.addPage();
    const startPage = doc.getNumberOfPages();
    fileStartPages[file.path] = startPage;

    const lines = toPdfAscii(file.code).split('\n');

    const drawFileBanner = (isContinuation: boolean) => {
      doc.setFillColor(12, 33, 53); // #0c2135
      doc.rect(marginX, 10, contentWidth, 12, 'F');
      doc.setDrawColor(2, 136, 209); // #0288d1
      doc.setLineWidth(0.4);
      doc.rect(marginX, 10, contentWidth, 12, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(103, 232, 249); // cyan-300
      doc.text(`FOLDER: ${toPdfAscii(file.folder)}`, marginX + 3, 14.8);

      doc.setTextColor(255, 255, 255);
      doc.text(
        `FILE: ${toPdfAscii(file.fileName)}${isContinuation ? ' (continued)' : ''}`,
        marginX + 3,
        19.6
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`${lines.length} lines`, pageWidth - marginX - 3, 17.5, { align: 'right' });
    };

    drawFileBanner(false);

    let y = topCodeY;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.2);

    for (let i = 0; i < lines.length; i++) {
      const lineNumStr = String(i + 1).padStart(4, ' ') + ' | ';
      const codeBody = lines[i];
      const wrappedSegments: string[] = doc.splitTextToSize(
        codeBody.length > 0 ? codeBody : ' ',
        contentWidth - 14
      );

      for (let segIdx = 0; segIdx < wrappedSegments.length; segIdx++) {
        if (y > bottomLimitY) {
          doc.addPage();
          drawFileBanner(true);
          y = topCodeY;
          doc.setFont('courier', 'normal');
          doc.setFontSize(7.2);
        }

        const prefix = segIdx === 0 ? lineNumStr : '     | ';
        doc.setTextColor(120, 130, 145);
        doc.text(prefix, marginX, y);
        doc.setTextColor(20, 28, 38);
        doc.text(wrappedSegments[segIdx], marginX + 12, y);
        y += codeLineHeight;
      }
    }
  }

  // Now render the Cover & Folder/File Directory Index across reserved TOC pages (1..tocPageCount)
  const totalLines = orderedFiles.reduce(
    (sum, f) => sum + f.code.replace(/\r/g, '').split('\n').length,
    0
  );

  let tocPage = 1;
  doc.setPage(tocPage);

  // Header Banner on Page 1
  doc.setFillColor(10, 29, 46);
  doc.rect(marginX, 10, contentWidth, 24, 'F');
  doc.setDrawColor(2, 136, 209);
  doc.setLineWidth(0.5);
  doc.rect(marginX, 10, contentWidth, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('WTG Spacing Diagram & CSV-to-KMZ Generator', marginX + 4, 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(103, 232, 249);
  doc.text('Complete Project Folders, File Names & Source Code Archive', marginX + 4, 24.5);

  doc.setFontSize(8.2);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Folders: ${groups.length}   |   Files: ${orderedFiles.length}   |   Total Lines: ${totalLines.toLocaleString()}`,
    marginX + 4,
    30.2
  );

  let tocY = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Project Folder & File Directory', marginX, tocY);
  tocY += 5.5;

  for (const group of groups) {
    if (tocY > pageHeight - 20 && tocPage < tocPageCount) {
      tocPage++;
      doc.setPage(tocPage);
      tocY = 16;
    }

    // Folder row
    doc.setFillColor(232, 244, 252);
    doc.rect(marginX, tocY - 3.6, contentWidth, 5.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(2, 92, 148);
    doc.text(`[FOLDER] ${toPdfAscii(group.folder)}  (${group.files.length} files)`, marginX + 2, tocY);
    tocY += 5.6;

    for (const file of group.files) {
      if (tocY > pageHeight - 16 && tocPage < tocPageCount) {
        tocPage++;
        doc.setPage(tocPage);
        tocY = 16;
      }
      const lineCount = file.code.replace(/\r/g, '').split('\n').length;
      const startPg = fileStartPages[file.path] || '-';

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`  |-- ${toPdfAscii(file.fileName)}`, marginX + 3, tocY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${lineCount} lines`, pageWidth - marginX - 24, tocY, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(2, 136, 209);
      doc.text(`Page ${startPg}`, pageWidth - marginX - 2, tocY, { align: 'right' });

      tocY += 4.6;
    }
    tocY += 1.5;
  }

  // Stamp page footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('WTG Spacing Diagram Tool v1.6 - Complete Source Code PDF', marginX, pageHeight - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 6, { align: 'right' });
  }

  return doc;
}

/**
 * Generates a Blob for browser download.
 */
export function buildSourceCodePdfBlob(rawEntries: ProjectFileEntry[]): Blob {
  const doc = buildSourceCodePdfDocument(rawEntries);
  return doc.output('blob');
}
