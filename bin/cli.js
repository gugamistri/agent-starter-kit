#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────────────────────

const VERSION = '0.6.0';
const PKG_ROOT = path.resolve(__dirname, '..');
const TARGET = process.cwd();

const MODULES = {
  skills:   { src: 'skills',   label: 'Skills   (boot, dispatch, testing, error-recovery, git-recovery, memory-compaction, handoff-format, context-checkpoint, …)' },
  personas: { src: 'personas', label: 'Personas (maestro, coder, architect, reviewer, contextualizer)' },
  rules:    { src: 'rules',    label: 'Rules    (security commandments, git commandments, code-quality edicts)' },
  docs:     { src: 'docs',     label: 'Docs     (docs/README.md — tiered context convention)' },
  specs:    { src: null,       label: 'Specs    (specs/README.md — JSON spec schema)' },
  agents:   { src: null,       label: 'AGENTS.md — root entry point for the harness' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg)  { process.stdout.write(msg + '\n'); }
function ok(msg)   { log('\x1b[32m✔\x1b[0m  ' + msg); }
function info(msg) { log('\x1b[36mℹ\x1b[0m  ' + msg); }
function warn(msg) { log('\x1b[33m⚠\x1b[0m  ' + msg); }
function err(msg)  { log('\x1b[31m✖\x1b[0m  ' + msg); }

function copyFile(src, dest, force) {
  if (fs.existsSync(dest) && !force) {
    warn(`skip  ${path.relative(TARGET, dest)}  (already exists — use --force to overwrite)`);
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  ok(`copy  ${path.relative(TARGET, dest)}`);
  return true;
}

function copyDir(srcDir, destDir, force) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const srcPath  = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath, force);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (copyFile(srcPath, destPath, force)) count++;
    }
  }
  return count;
}

// ── Commands ─────────────────────────────────────────────────────────────────

function cmdInit(opts) {
  const { modules, force, dryRun } = opts;
  log('');
  log(`\x1b[1m@gugamistri/harness v${VERSION} — init\x1b[0m`);
  log(`target: ${TARGET}`);
  if (dryRun) info('dry-run mode — no files will be written');
  log('');

  const selected = modules.length > 0 ? modules : Object.keys(MODULES);
  let total = 0;

  for (const mod of selected) {
    if (!MODULES[mod]) { err(`unknown module: ${mod}`); continue; }

    if (dryRun) { info(`would install module: ${mod}`); continue; }

    // skills, personas, rules, docs → copy whole directory
    if (MODULES[mod].src) {
      const srcDir  = path.join(PKG_ROOT, MODULES[mod].src);
      const destDir = path.join(TARGET, MODULES[mod].src);
      if (!fs.existsSync(srcDir)) { warn(`source missing: ${MODULES[mod].src}`); continue; }
      total += copyDir(srcDir, destDir, force);
    }

    // specs → copy only README.md
    if (mod === 'specs') {
      const src  = path.join(PKG_ROOT, 'specs', 'README.md');
      const dest = path.join(TARGET, 'specs', 'README.md');
      if (fs.existsSync(src) && copyFile(src, dest, force)) total++;
    }

    // agents → copy AGENTS.md
    if (mod === 'agents') {
      const src  = path.join(PKG_ROOT, 'AGENTS.md');
      const dest = path.join(TARGET, 'AGENTS.md');
      if (fs.existsSync(src) && copyFile(src, dest, force)) total++;
    }
  }

  log('');
  if (!dryRun) {
    ok(`Done. ${total} file(s) installed.`);
    log('');
    log('Next steps:');
    log('  1. Open AGENTS.md — entry point for the harness');
    log('  2. Run your Claude Code or OpenCode session in this directory');
    log('  3. Say "boot" to Maestro to initialise the session');
    log('');
    log('Docs: https://github.com/gugamistri/agent-starter-kit');
  }
}

function cmdUpdate(opts) {
  info('update = init --force on all modules');
  cmdInit({ ...opts, force: true });
}

function cmdList() {
  log('');
  log(`\x1b[1m@gugamistri/harness v${VERSION} — available modules\x1b[0m`);
  log('');
  for (const [key, val] of Object.entries(MODULES)) {
    log(`  \x1b[36m${key.padEnd(10)}\x1b[0m  ${val.label}`);
  }
  log('');
  log('Install all:      npx @gugamistri/harness init');
  log('Install subset:   npx @gugamistri/harness init --modules=skills,personas');
  log('Force overwrite:  npx @gugamistri/harness init --force');
  log('Dry run:          npx @gugamistri/harness init --dry-run');
  log('');
}

function cmdHelp() {
  log('');
  log(`\x1b[1m@gugamistri/harness v${VERSION}\x1b[0m`);
  log('AI agent harness for production-grade multi-agent workflows.');
  log('');
  log('Usage:');
  log('  npx @gugamistri/harness <command> [options]');
  log('');
  log('Commands:');
  log('  init      Install harness files into the current directory (default)');
  log('  update    Re-install all files, overwriting existing ones');
  log('  list      Show available modules');
  log('  help      Show this help message');
  log('');
  log('Options (init / update):');
  log('  --modules=a,b   Install specific modules (default: all)');
  log('  --force         Overwrite existing files');
  log('  --dry-run       Preview without writing files');
  log('');
}

// ── Argument parsing ──────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-')) || 'init';
const force   = args.includes('--force');
const dryRun  = args.includes('--dry-run');
const modArg  = args.find(a => a.startsWith('--modules='));
const modules = modArg ? modArg.replace('--modules=', '').split(',').map(s => s.trim()) : [];

// ── Dispatch ──────────────────────────────────────────────────────────────────

switch (command) {
  case 'init':   cmdInit({ modules, force, dryRun }); break;
  case 'update': cmdUpdate({ modules, force, dryRun }); break;
  case 'list':   cmdList(); break;
  case 'help':
  case '--help':
  case '-h':     cmdHelp(); break;
  default:
    err(`Unknown command: ${command}`);
    cmdHelp();
    process.exit(1);
}
