#!/usr/bin/env node
/**
 * scripts/postinstall.js
 *
 * Crea (se manca) un link `node_modules` al livello del workspace
 * (../node_modules) puntante a quello di GTSW.
 *
 * Serve perché i progetti operativi vivono in C:\GTSuite\Ionic\projects\<NAME>
 * (fuori da GTSW) e devono risolvere ionicons/rxjs/primeng/... dal node_modules
 * di GTSW. La risoluzione di Node walking-up trova il link al livello Ionic.
 *
 * - Windows: NTFS junction (no admin necessario)
 * - macOS/Linux: symlink di directory
 *
 * Idempotente: se il link/dir esiste già, non fa nulla.
 */

const fs   = require('fs');
const path = require('path');

const GTSW_ROOT     = path.resolve(__dirname, '..');
const NODE_MODULES  = path.join(GTSW_ROOT, 'node_modules');
const PARENT_NM     = path.resolve(GTSW_ROOT, '..', 'node_modules');

function log(msg)  { console.log(`[postinstall] ${msg}`); }
function warn(msg) { console.warn(`[postinstall] WARNING: ${msg}`); }

function main() {
  if (!fs.existsSync(NODE_MODULES)) {
    warn(`GTSW node_modules not found at ${NODE_MODULES}; skipping link.`);
    return;
  }

  if (fs.existsSync(PARENT_NM)) {
    // Could be a real dir, a junction, or a symlink — leave it alone.
    let stat;
    try { stat = fs.lstatSync(PARENT_NM); } catch { stat = null; }
    if (stat && (stat.isSymbolicLink() || stat.isDirectory())) {
      log(`workspace link already present at ${PARENT_NM} — skipping.`);
      return;
    }
  }

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  try {
    fs.symlinkSync(NODE_MODULES, PARENT_NM, linkType);
    log(`created ${linkType} ${PARENT_NM} -> ${NODE_MODULES}`);
  } catch (err) {
    warn(`could not create link at ${PARENT_NM}: ${err.message}`);
    if (process.platform !== 'win32') {
      warn('On Unix, ensure you have write access to the workspace parent directory.');
    } else {
      warn('On Windows, junctions usually do not require admin; check antivirus / permissions.');
    }
  }
}

main();
