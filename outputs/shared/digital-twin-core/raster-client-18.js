(function (root) {
  'use strict';
  function failure(code, message) { var e = new Error(message); e.code = code; if (code === 'CANCELLED' || code === 'STALE_REQUEST') e.name = 'AbortError'; return e; }
  function RasterClient18(options) { this.options = options || {}; this.worker = null; this.pending = new Map(); this.counter = 0; this.generation = 0; this.latest = null; this.ready = false; this.destroyed = false; }
  RasterClient18.prototype.settle = function (token, error, result) { var p = this.pending.get(token); if (!p) return; clearTimeout(p.timer); this.pending.delete(token); if (this.latest === token) this.latest = null; error ? p.reject(error) : p.resolve(result); };
  RasterClient18.prototype.stop = function (code, message) { var client = this; this.pending.forEach(function (_, token) { client.settle(token, failure(code, message)); }); if (this.worker) this.worker.terminate(); this.worker = null; this.ready = false; };
  RasterClient18.prototype.send = function (type, payload) {
    var client = this, worker = this.worker, generation = this.generation, token = ++this.counter;
    return { token: token, promise: new Promise(function (resolve, reject) {
      client.pending.set(token, { resolve: resolve, reject: reject, timer: setTimeout(function () { if (client.worker === worker && client.generation === generation) client.stop('WORKER_TIMEOUT', 'Raster Worker timed out; reinitialize before reading.'); }, client.options.timeoutMs || 30000) });
      try { worker.postMessage(Object.assign({ type: type, token: token }, payload)); } catch (e) { client.settle(token, failure('WORKER_POST_FAILED', e.message)); }
    }) };
  };
  RasterClient18.prototype.init = async function (manifest) {
    if (this.destroyed) throw failure('DESTROYED', 'Raster client was destroyed.');
    this.generation++; var generation = this.generation; this.stop('STALE_INITIALIZATION', 'Raster initialization was superseded.');
    var WorkerClass = Object.prototype.hasOwnProperty.call(this.options, 'WorkerClass') ? this.options.WorkerClass : root.Worker;
    if (!WorkerClass) throw failure('WORKER_REQUIRED', 'COG reading requires an isolated Worker; main-thread decoding is disabled.');
    var client = this, worker = this.worker = new WorkerClass(this.options.workerUrl || '/shared/digital-twin-core/raster-worker-18.js');
    worker.onmessage = function (event) { if (client.worker !== worker || client.generation !== generation) return; var m = event.data || {}; if (m.type === 'error') client.settle(m.token, failure(m.error.code, m.error.message)); else client.settle(m.token, null, m.type === 'ready' ? m.info : m.result); };
    worker.onerror = function (event) { if (client.worker === worker && client.generation === generation) client.stop('WORKER_FAILED', event.message || 'Raster Worker failed.'); };
    var info = await this.send('init', { manifest: manifest }).promise;
    if (this.generation !== generation || this.destroyed) throw failure('STALE_INITIALIZATION', 'Raster initialization was superseded.');
    this.ready = true; return info;
  };
  RasterClient18.prototype.read = function (request) { if (!this.ready || this.destroyed) return Promise.reject(failure(this.destroyed ? 'DESTROYED' : 'NOT_READY', 'Initialize raster sources first.')); this.cancel('STALE_REQUEST'); var op = this.send('read', { request: request }); this.latest = op.token; return op.promise; };
  RasterClient18.prototype.loadPatch = RasterClient18.prototype.read;
  RasterClient18.prototype.cancel = function (code) { if (this.latest != null) { var token = this.latest; if (this.worker) this.worker.postMessage({ type: 'cancel', cancelToken: token }); this.settle(token, failure(code || 'CANCELLED', 'Raster read was cancelled or superseded.')); } };
  RasterClient18.prototype.destroy = function () { if (this.destroyed) return; this.destroyed = true; this.generation++; this.stop('DESTROYED', 'Raster client was destroyed.'); };
  root.RTRTwin = root.RTRTwin || {}; root.RTRTwin.RasterClient18 = RasterClient18;
  if (typeof module === 'object' && module.exports) module.exports = RasterClient18;
}(typeof self !== 'undefined' ? self : globalThis));
