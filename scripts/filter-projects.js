/**
 * Pre-build script: generates a filtered component-registry based on the selected profile.
 *
 * Usage:
 *   node scripts/filter-projects.js <profile>
 *
 * Reads profiles from projects.config.json.
 * Generates src/app/core/config/component-registry.dist.ts with only the projects in the profile.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'projects.config.json');
const REGISTRY_SRC = path.join(ROOT, 'src/app/core/config/component-registry.ts');
const REGISTRY_DIST = path.join(ROOT, 'src/app/core/config/component-registry.dist.ts');

// Read profile name from CLI args
const profileName = process.argv[2];
if (!profileName) {
  console.error('Usage: node scripts/filter-projects.js <profile>');
  process.exit(1);
}

// Load config
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`Config file not found: ${CONFIG_PATH}`);
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const profiles = config.profiles || config;

if (!profiles[profileName]) {
  console.error(`Profile "${profileName}" not found. Available: ${Object.keys(profiles).join(', ')}`);
  process.exit(1);
}

const projectList = profiles[profileName];

// Wildcard = include everything
if (projectList.includes('*')) {
  console.log(`Profile "${profileName}" includes all projects — copying registry as-is.`);
  fs.copyFileSync(REGISTRY_SRC, REGISTRY_DIST);
  console.log(`Generated: ${REGISTRY_DIST}`);
  process.exit(0);
}

// Read original registry
const source = fs.readFileSync(REGISTRY_SRC, 'utf-8');

// Parse registry entries: lines like  'GTR/fatture': () => import(...).then(...),
const entryRegex = /^\s*'([^']+)':\s*\(\)\s*=>\s*import\(.+$/gm;
const lines = source.split('\n');

const filteredLines = [];
let insideRegistry = false;
let skippedCount = 0;
let keptCount = 0;

for (const line of lines) {
  // Detect start of COMPONENT_REGISTRY object
  if (line.includes('COMPONENT_REGISTRY')) {
    insideRegistry = true;
  }

  // Detect closing of COMPONENT_REGISTRY object
  if (insideRegistry && /^};/.test(line.trim())) {
    insideRegistry = false;
    filteredLines.push(line);
    continue;
  }

  if (insideRegistry) {
    // Check if this line is a registry entry
    const entryMatch = line.match(/^\s*'([^/]+)\//);
    if (entryMatch) {
      const prjId = entryMatch[1];
      if (projectList.includes(prjId)) {
        filteredLines.push(line);
        keptCount++;
      } else {
        skippedCount++;
      }
      continue;
    }
  }

  // Keep all other lines (comments, interface, helpers, etc.)
  filteredLines.push(line);
}

// Write filtered registry
fs.writeFileSync(REGISTRY_DIST, filteredLines.join('\n'), 'utf-8');

console.log(`Profile "${profileName}": kept ${keptCount} entries, skipped ${skippedCount}`);
console.log(`Projects included: ${projectList.join(', ')}`);
console.log(`Generated: ${REGISTRY_DIST}`);
