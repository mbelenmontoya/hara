#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

function runStep(name, cmd, args) {
  console.log(`\n## ${name}`);
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: projectRoot });
  if (result.status !== 0) {
    console.error(`\n❌ ${name} failed.`);
    process.exit(result.status ?? 1);
  }
  console.log(`✅ ${name} passed.`);
}

const steps = [
  { name: 'Build', cmd: 'npm', args: ['run', 'build'] },
  { name: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'Integration Tests', cmd: 'npm', args: ['run', 'test:integration'] },
];

if (process.env.SKIP_PR_PREP_STEPS !== 'true') {
  steps.forEach(step => runStep(step.name, step.cmd, step.args));
} else {
  console.log('SKIP_PR_PREP_STEPS=true — skipping build/lint/test execution.');
}

function getTrackedFiles() {
  const res = spawnSync('git', ['ls-files'], { encoding: 'utf8', cwd: projectRoot });
  if (res.status !== 0) {
    console.error('Failed to list git files.');
    process.exit(1);
  }
  return res.stdout.split('\n').filter(Boolean);
}

const trackedFiles = getTrackedFiles();

const codeFiles = trackedFiles.filter(file => {
  if (file.startsWith('__tests__/')) return false;
  if (file.includes('/__tests__/')) return false;
  const ext = path.extname(file);
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext);
});

const textFiles = trackedFiles.filter(file => ['.md', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'].includes(path.extname(file)));

const issues = {
  console: [],
  any: [],
  tokens: [],
  todo: [],
  longFiles: [],
};

function countLines(content) {
  return content.split(/\r?\n/).length;
}

codeFiles.forEach(file => {
  const abs = path.join(projectRoot, file);
  const content = fs.readFileSync(abs, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (/console\.(log|warn|info)\(/.test(line)) {
      issues.console.push({ file, line: lineNum, text: line.trim() });
    }
    if (/\bany\b/.test(line)) {
      issues.any.push({ file, line: lineNum, text: line.trim() });
    }
    if (/TODO|FIXME/.test(line)) {
      issues.todo.push({ file, line: lineNum, text: line.trim() });
    }
    const hexMatch = line.match(/#[0-9a-fA-F]{3,6}/g) || [];
    const pxMatch = line.match(/\b\d+px\b/g) || [];
    if (hexMatch.length || pxMatch.length) {
      const tokens = [...hexMatch, ...pxMatch];
      tokens.forEach(token => {
        issues.tokens.push({ file, line: lineNum, token });
      });
    }
  });

  const lineCount = countLines(content);
  if (lineCount > 440 && (file.startsWith('app/') || file.startsWith('lib/'))) {
    issues.longFiles.push({ file, lines: lineCount });
  }
});

console.log('\n## Code Quality Scan');

function printIssueList(title, list, formatFn) {
  console.log(`\n### ${title}`);
  if (list.length === 0) {
    console.log('None found.');
    return;
  }
  list.forEach(item => console.log(formatFn(item)));
}

printIssueList('console.log/warn/info', issues.console, item => `- ${item.file}:${item.line} — ${item.text}`);
printIssueList('any usage', issues.any, item => `- ${item.file}:${item.line} — ${item.text}`);
printIssueList('Token violations (hex/px)', issues.tokens, item => `- ${item.file}:${item.line} — ${item.token}`);
printIssueList('TODO/FIXME', issues.todo, item => `- ${item.file}:${item.line} — ${item.text}`);
printIssueList('Files over 440 lines', issues.longFiles, item => `- ${item.file} — ${item.lines} lines`);

const totalIssues = Object.values(issues).reduce((sum, list) => sum + list.length, 0);
if (totalIssues > 0) {
  console.log('\n❗ Resolve the issues above before opening a PR.');
  process.exit(2);
}

console.log('\n✅ No code quality issues detected. Ready for PR.');
