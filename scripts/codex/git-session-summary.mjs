#!/usr/bin/env node
import { spawnSync } from 'child_process';

const sinceArg = process.argv[2] || 'today 00:00';

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout.trimEnd();
}

function printSection(label, command, output, emptyMessage = '(none)') {
  console.log(`\n## ${label}`);
  console.log(`$ ${command}`);
  console.log(output ? output : emptyMessage);
}

function getCommittedDiffStats(since) {
  const numstatOutput = runGit(['log', `--since=${since}`, '--numstat', '--format=tformat:']);
  if (!numstatOutput) {
    return '';
  }

  const fileTotals = new Map();

  for (const line of numstatOutput.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const [addedRaw, deletedRaw, file] = line.split('\t');
    if (!file) {
      continue;
    }

    const entry = fileTotals.get(file) ?? { added: 0, deleted: 0, binary: false };
    if (addedRaw === '-' || deletedRaw === '-') {
      entry.binary = true;
    } else {
      entry.added += Number(addedRaw);
      entry.deleted += Number(deletedRaw);
    }
    fileTotals.set(file, entry);
  }

  if (fileTotals.size === 0) {
    return '';
  }

  const rows = [...fileTotals.entries()]
    .sort((a, b) => (b[1].added + b[1].deleted) - (a[1].added + a[1].deleted) || a[0].localeCompare(b[0]))
    .map(([file, stats]) => {
      const binarySuffix = stats.binary ? ' (binary)' : '';
      return `${String(stats.added).padStart(6)} ${String(stats.deleted).padStart(8)}  ${file}${binarySuffix}`;
    });

  const totals = [...fileTotals.values()].reduce(
    (acc, stats) => {
      acc.added += stats.added;
      acc.deleted += stats.deleted;
      acc.binary += stats.binary ? 1 : 0;
      return acc;
    },
    { added: 0, deleted: 0, binary: 0 }
  );

  const summary = [
    ' Added  Deleted  File',
    ...rows,
    '',
    `Total: +${totals.added} / -${totals.deleted} across ${fileTotals.size} file(s)` +
      (totals.binary ? `, ${totals.binary} binary` : ''),
  ];

  return summary.join('\n');
}

printSection('Working Tree', 'git status -sb', runGit(['status', '-sb']), '(clean)');
printSection(
  `Commits since "${sinceArg}"`,
  `git log --since="${sinceArg}" --oneline`,
  runGit(['log', `--since=${sinceArg}`, '--oneline']),
  '(no commits in range)'
);
printSection(
  `Committed Diff Stat since "${sinceArg}"`,
  `git log --since="${sinceArg}" --numstat --format=tformat:`,
  getCommittedDiffStats(sinceArg),
  '(no committed changes in range)'
);
printSection('Staged Diff Stat', 'git diff --cached --stat', runGit(['diff', '--cached', '--stat']), '(no staged changes)');
printSection('Unstaged Diff Stat', 'git diff --stat', runGit(['diff', '--stat']), '(no unstaged changes)');
