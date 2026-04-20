#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: node scripts/codex/audit.mjs <file-or-directory>');
  process.exit(1);
}

const projectRoot = process.cwd();
const targetPath = path.resolve(projectRoot, targetArg);

if (!fs.existsSync(targetPath)) {
  console.error(`Target not found: ${targetArg}`);
  process.exit(1);
}

const allowedExtensions = new Set(['.ts', '.tsx']);
const fileList = [];

function walk(entry) {
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(entry)) {
      if (child === 'node_modules' || child === '.next' || child === '.git') {
        continue;
      }
      walk(path.join(entry, child));
    }
    return;
  }

  if (!stat.isFile()) return;

  const ext = path.extname(entry);
  if (!allowedExtensions.has(ext)) return;
  if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) return;
  fileList.push(entry);
}

const stats = fs.statSync(targetPath);
if (stats.isDirectory()) {
  walk(targetPath);
} else if (stats.isFile()) {
  walk(targetPath);
} else {
  console.error('Target must be a file or directory.');
  process.exit(1);
}

if (fileList.length === 0) {
  console.error('No TypeScript files found for analysis.');
  process.exit(1);
}

const fileReports = [];
const longFunctions = [];
const magicNumbers = [];
const tokenViolations = [];

const ALLOWED_NUMBERS = new Set(['0', '1', '-1', '100']);

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function positionToLine(text, pos) {
  return text.slice(0, pos).split(/\r?\n/).length;
}

function analyzeFunctions(content, relativePath) {
  const regexes = [
    /function\s+([a-zA-Z0-9_]+)\s*\(/g,
    /const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  ];

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || 'anonymous';
      const bodyStart = content.indexOf('{', match.index);
      if (bodyStart === -1) continue;
      let depth = 0;
      let i = bodyStart;
      for (; i < content.length; i += 1) {
        const char = content[i];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      if (depth !== 0) continue;
      const body = content.slice(bodyStart, i);
      const lines = countLines(body);
      if (lines > 50) {
        const startLine = positionToLine(content, match.index);
        longFunctions.push({ name, lines, file: relativePath, line: startLine });
      }
    }
  }
}

function analyzeMagicNumbers(content, relativePath) {
  const lines = content.split(/\r?\n/);
  lines.forEach((lineText, idx) => {
    const lineNumber = idx + 1;
    const regex = /(?<![\w.])(-?\d+(?:\.\d+)?)(?![\w.])/g;
    let match;
    while ((match = regex.exec(lineText)) !== null) {
      const value = match[1];
      if (ALLOWED_NUMBERS.has(value)) continue;
      if (lineText.includes('//#')) continue;
      if (/#[0-9a-fA-F]{3,6}/.test(lineText)) continue;
      if (/\d+px/.test(lineText)) continue;
      magicNumbers.push({ file: relativePath, line: lineNumber, value });
    }
  });
}

function analyzeTokenViolations(content, relativePath) {
  const hexRegex = /#[0-9a-fA-F]{3,6}/g;
  const pxRegex = /\b\d+px\b/g;
  const lines = content.split(/\r?\n/);
  lines.forEach((lineText, idx) => {
    let match;
    while ((match = hexRegex.exec(lineText)) !== null) {
      tokenViolations.push({ file: relativePath, line: idx + 1, token: match[0], suggestion: 'Use Tailwind design tokens' });
    }
    while ((match = pxRegex.exec(lineText)) !== null) {
      tokenViolations.push({ file: relativePath, line: idx + 1, token: match[0], suggestion: 'Use Tailwind spacing scale' });
    }
  });
}

function classifyLineCount(lines) {
  if (lines > 600) return '🔴 Must refactor';
  if (lines > 440) return '🟡 Warning';
  if (lines > 300) return '📝 Over ideal';
  return '✅ Good';
}

for (const absPath of fileList) {
  const relativePath = path.relative(projectRoot, absPath);
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = countLines(content);
  analyzeFunctions(content, relativePath);
  analyzeMagicNumbers(content, relativePath);
  analyzeTokenViolations(content, relativePath);
  fileReports.push({ file: relativePath, lines, status: classifyLineCount(lines) });
}

fileReports.sort((a, b) => b.lines - a.lines);
longFunctions.sort((a, b) => b.lines - a.lines);

function pad(str, length) {
  return `${str}`.padEnd(length, ' ');
}

function printTable(rows, headers) {
  const widths = headers.map((header, idx) => {
    const headerLen = header.length;
    const maxRowLen = Math.max(...rows.map(row => `${row[idx]}`.length), 0);
    return Math.max(headerLen, maxRowLen);
  });
  const divider = `| ${headers.map((h, i) => pad(h, widths[i])).join(' | ')} |`;
  console.log(divider);
  console.log(`|-${widths.map(w => '-'.repeat(w)).join('-|-')}-|`);
  rows.forEach(row => {
    console.log(`| ${row.map((cell, i) => pad(cell, widths[i])).join(' | ')} |`);
  });
}

console.log(`# Audit Report: ${targetArg}`);
console.log();
console.log('## File Sizes');
const fileRows = fileReports.map(r => [r.file, r.lines, r.status]);
printTable(fileRows, ['File', 'Lines', 'Status']);

console.log();
console.log('## Long Functions (>50 lines)');
if (longFunctions.length === 0) {
  console.log('None found.');
} else {
  const longRows = longFunctions.map(fn => [fn.name, fn.lines, `${fn.file}:${fn.line}`]);
  printTable(longRows, ['Function', 'Lines', 'Location']);
}

console.log();
console.log('## Magic Numbers');
if (magicNumbers.length === 0) {
  console.log('None found.');
} else {
    magicNumbers.forEach(entry => {
      console.log(`- ${entry.file}:${entry.line} — ${entry.value}`);
    });
}

console.log();
console.log('## Token Violations');
if (tokenViolations.length === 0) {
  console.log('None found.');
} else {
  tokenViolations.forEach(entry => {
    console.log(`- ${entry.file}:${entry.line} — ${entry.token} → ${entry.suggestion}`);
  });
}

console.log();
console.log('## Summary');
console.log(`- Files analyzed: ${fileReports.length}`);
const overThreshold = fileReports.filter(r => r.lines > 440).length;
console.log(`- Files over 440 lines: ${overThreshold}`);
console.log(`- Long functions: ${longFunctions.length}`);
console.log(`- Magic numbers: ${magicNumbers.length}`);
console.log(`- Token violations: ${tokenViolations.length}`);
