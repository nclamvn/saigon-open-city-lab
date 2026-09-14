/* All normalization, spatial indexing and clipping run off the render thread. */
'use strict';
importScripts('vendor/turf-7.4.0.min.js', 'source-core.js', 'gis.js');
var engine = null;
var initializationGeneration = 0;
async function decodeInput(input, config) {
  if (!input || input.type !== 'rtr-raw-json/1.0') return { data: input, integrity: { verified: false, sha256: null, bytes: null, method: 'Legacy parsed JSON input; original file bytes were not independently verified.' } };
  var bytes = input.bytes;
  if (Object.prototype.toString.call(bytes) !== '[object ArrayBuffer]' || !bytes.byteLength) throw self.RTRTwin.Gis.error('INVALID_RAW_INPUT', 'A non-empty JSON ArrayBuffer is required.');
  if (bytes.byteLength > 268435456) throw self.RTRTwin.Gis.error('RAW_INPUT_TOO_LARGE', 'Local verified JSON ingestion is limited to 256 MiB.');
  var expected = config && config.input && config.input.sha256;
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw self.RTRTwin.Gis.error('SOURCE_HASH_REQUIRED', 'The project must declare the expected input SHA-256 before byte ingestion.');
  if (!self.crypto || !self.crypto.subtle || typeof self.crypto.subtle.digest !== 'function') throw self.RTRTwin.Gis.error('INTEGRITY_UNAVAILABLE', 'SHA-256 Web Crypto is unavailable; verified-byte ingestion is disabled.');
  var digest;
  try { digest = await self.crypto.subtle.digest('SHA-256', bytes); }
  catch (_) { throw self.RTRTwin.Gis.error('INTEGRITY_UNAVAILABLE', 'SHA-256 verification failed to execute; source admission is disabled.'); }
  var actual = Array.from(new Uint8Array(digest), function (value) { return value.toString(16).padStart(2, '0'); }).join('');
  if (actual !== expected) throw self.RTRTwin.Gis.error('SOURCE_HASH_MISMATCH', 'Fetched JSON SHA-256 does not match the project source fingerprint.');
  var data;
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (_) { throw self.RTRTwin.Gis.error('JSON_INVALID', 'Verified source bytes are not valid UTF-8 JSON.'); }
  return { data: data, integrity: { verified: true, sha256: actual, bytes: bytes.byteLength, method: 'SHA256 of fetched JSON bytes; identity not accuracy' } };
}
self.onmessage = async function (event) {
  var message = event.data || {}, token = message.token, generation;
  try {
    if (message.type === 'init') {
      generation = ++initializationGeneration; engine = null;
      var decoded = await decodeInput(message.sceneData, message.config);
      if (generation !== initializationGeneration) return;
      var normalized = self.RTRTwin.SourceCore.normalizeScene(decoded.data, message.config);
      normalized.inputIntegrity = decoded.integrity;
      engine = self.RTRTwin.Gis.createEngine(normalized, message.config && message.config.analysis);
      self.postMessage({ type: 'ready', token: token, info: engine.info(), normalization: normalized.normalization, inputIntegrity: decoded.integrity });
    } else if (message.type === 'query') {
      if (!engine) throw self.RTRTwin.Gis.error('NOT_READY', 'Spatial engine is not initialized.');
      self.postMessage({ type: 'result', token: token, result: engine.query(message.request) });
    }
  } catch (error) {
    if (generation != null && generation !== initializationGeneration) return;
    self.postMessage({ type: 'error', token: token, error: { code: error.code || 'ANALYSIS_FAILED', message: error.message || String(error) } });
  }
};
