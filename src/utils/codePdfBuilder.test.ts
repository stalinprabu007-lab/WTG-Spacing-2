import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSourceCodePdfDocument,
  groupFilesByFolder,
  normalizeProjectFile,
  toPdfAscii,
} from './codePdfBuilder';

test('normalizes and groups project files by folder', () => {
  const entries = [
    normalizeProjectFile('/src/utils/geo.ts', 'export const a = 1;'),
    normalizeProjectFile('/package.json', '{"name":"app"}'),
    normalizeProjectFile('/src/App.tsx', 'export default function App() {}'),
    normalizeProjectFile('/src/utils/csvParser.ts', 'export const b = 2;'),
  ];

  const groups = groupFilesByFolder(entries);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].folder, 'Root /');
  assert.equal(groups[0].files[0].fileName, 'package.json');
  assert.equal(groups[1].folder, 'src/');
  assert.equal(groups[1].files[0].fileName, 'App.tsx');
  assert.equal(groups[2].folder, 'src/utils/');
  assert.deepEqual(
    groups[2].files.map((f) => f.fileName),
    ['csvParser.ts', 'geo.ts']
  );
});

test('sanitizes Unicode characters cleanly for PDF font encoding', () => {
  const clean = toPdfAscii('Wind direction (°) ✔ → 5D × 7D');
  assert.equal(clean, 'Wind direction ( deg) [OK] -> 5D x 7D');
});

test('generates a valid multi-page PDF document with folder index and source code pages', () => {
  const entries = [
    normalizeProjectFile('/package.json', '{\n  "name": "wtg-app"\n}'),
    normalizeProjectFile('/src/App.tsx', 'import React from "react";\nexport default function App() { return null; }'),
  ];

  const doc = buildSourceCodePdfDocument(entries);
  assert.ok(doc.getNumberOfPages() >= 3, 'Expected TOC page plus one page per file');

  const arrayBuffer = doc.output('arraybuffer');
  const header = Buffer.from(arrayBuffer.slice(0, 8)).toString('ascii');
  assert.ok(header.startsWith('%PDF-1.'), `Expected valid %PDF-1.x header, got ${header}`);
});
