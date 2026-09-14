'use strict';
// Contractor QA with the official Khronos validator; no remote uploads.
const fs = require('fs'), path = require('path');
const validator = require(process.env.RTR18_VALIDATOR || '/private/tmp/rtr18-gltf-validator/node_modules/gltf-validator');
const root = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'outputs/hcmc-poc/data/tiles-18/catalog.json')));
(async () => {
  const results = [];
  for (const tile of catalog.tiles) for (const level of ['fine', 'coarse']) {
    const file = path.join(root, 'outputs', tile[level].url.replace(/^\//, ''));
    const report = await validator.validateBytes(new Uint8Array(fs.readFileSync(file)), { uri: path.basename(file), format: 'glb', maxIssues: 100 });
    results.push({ tile: tile.id, level, errors: report.issues.numErrors, warnings: report.issues.numWarnings,
      infos: report.issues.numInfos, messages: report.issues.messages });
  }
  const errors = results.reduce((sum, x) => sum + x.errors, 0), warnings = results.reduce((sum, x) => sum + x.warnings, 0);
  const result = { status: errors ? 'FAIL' : 'PASS', validatorVersion: validator.version(), files: results.length, errors, warnings,
    source: 'https://github.com/KhronosGroup/glTF-Validator', limits: 'glTF validation only; not OGC 3D Tiles conformance or source survey accuracy.', results };
  fs.writeFileSync(path.join(__dirname, 'khronos-glb-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, results: undefined }));
  if (errors) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
