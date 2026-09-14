(function (root, factory) {
  'use strict';
  var Client = factory(root);
  root.RTRTwin = root.RTRTwin || {};
  root.RTRTwin.AnalysisClient = Client;
  if (typeof module === 'object' && module.exports) module.exports = Client;
}(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  function error(code, message) { var e = new Error(message); e.code = code; if (code === 'CANCELLED' || code === 'STALE_REQUEST') e.name = 'AbortError'; return e; }
  function AnalysisClient(options) {
    options = options || {};
    this.options = options; this.config = options.config || {}; this.worker = null; this.engine = null;
    this.pending = new Map(); this.counter = 0; this.queryToken = null; this.ready = false; this.destroyed = false; this.initGeneration = 0;
    this.executionMode = 'uninitialized'; this.fallbackReason = null;
  }
  AnalysisClient.prototype._settle = function (token, failure, result) {
    var pending = this.pending.get(token);
    if (!pending) return; // Cancelled and superseded requests can never update consumers.
    this.pending.delete(token); clearTimeout(pending.timer);
    if (this.queryToken === token) this.queryToken = null;
    if (failure) pending.reject(failure); else pending.resolve(result);
  };
  AnalysisClient.prototype._workerFailed = function (reason, expectedWorker, generation) {
    if (expectedWorker && (this.worker !== expectedWorker || this.initGeneration !== generation)) return;
    if (this.worker) this.worker.terminate(); this.worker = null; this.ready = false;
    var client = this;
    this.pending.forEach(function (_, token) { client._settle(token, error('WORKER_FAILED', reason)); });
  };
  AnalysisClient.prototype._send = function (type, payload, timeout, transfers) {
    var client = this, token = ++this.counter, worker = this.worker, generation = this.initGeneration;
    return { token: token, promise: new Promise(function (resolve, reject) {
      client.pending.set(token, { resolve: resolve, reject: reject, timer: setTimeout(function () {
        if (client.worker !== worker || client.initGeneration !== generation) return;
        client._settle(token, error('WORKER_TIMEOUT', 'Spatial Worker timed out after ' + timeout + ' ms.'));
        client._workerFailed('Worker stopped after timeout; reinitialize the analysis engine.', worker, generation);
      }, timeout) });
      try { worker.postMessage(Object.assign({ type: type, token: token }, payload), transfers || []); }
      catch (e) { client._settle(token, error('WORKER_POST_FAILED', e.message)); }
    }) };
  };
  AnalysisClient.prototype._fallback = function (sceneData, reason, generation) {
    var client = this; generation = generation == null ? this.initGeneration : generation;
    var size = sceneData && sceneData.buildings ? sceneData.buildings.length : sceneData && sceneData.features ? sceneData.features.length : Infinity;
    var limit = this.options.fallbackMaxFeatures == null ? 3000 : this.options.fallbackMaxFeatures;
    if (size > limit) return Promise.reject(error('WORKER_REQUIRED', 'Worker unavailable. Main-thread fallback is limited to ' + limit + ' features to protect map interaction; this dataset has ' + size + '. Reason: ' + reason));
    if (!root.RTRTwin || !root.RTRTwin.SourceCore || !root.RTRTwin.Gis) return Promise.reject(error('FALLBACK_DEPENDENCY_MISSING', 'Local source-core.js, gis.js and Turf must be loaded for fallback.'));
    return new Promise(function (resolve, reject) { setTimeout(function () {
      if (client.destroyed) return reject(error('DESTROYED', 'Client was destroyed.'));
      if (client.initGeneration !== generation) return reject(error('STALE_INITIALIZATION', 'Initialization was superseded.'));
      try {
        var normalized = root.RTRTwin.SourceCore.normalizeScene(sceneData, client.config);
        client.engine = root.RTRTwin.Gis.createEngine(normalized, client.config.analysis);
        client.ready = true; client.executionMode = 'main-thread-fallback'; client.fallbackReason = reason;
        resolve(Object.assign(client.engine.info(), { executionMode: client.executionMode, fallbackReason: reason, normalization: normalized.normalization, inputIntegrity: { verified: false, sha256: null, bytes: null, method: 'Parsed input; original file bytes were not independently verified.' } }));
      } catch (e) { reject(e); }
    }, 0); });
  };
  AnalysisClient.prototype.init = async function (sceneData) {
    if (this.destroyed) throw error('DESTROYED', 'Client was destroyed.');
    var rawJson = sceneData && sceneData.type === 'rtr-raw-json/1.0';
    if (rawJson && (Object.prototype.toString.call(sceneData.bytes) !== '[object ArrayBuffer]' || !sceneData.bytes.byteLength)) throw error('INVALID_RAW_INPUT', 'Verified JSON ingestion requires a non-empty ArrayBuffer.');
    var generation = ++this.initGeneration, client = this;
    this.pending.forEach(function (_, token) { client._settle(token, error('STALE_INITIALIZATION', 'Initialization was superseded.')); });
    this.ready = false;
    if (this.worker) this.worker.terminate(); this.worker = null;
    var WorkerClass = Object.prototype.hasOwnProperty.call(this.options, 'WorkerClass') ? this.options.WorkerClass : root.Worker;
    if (!WorkerClass || !this.options.workerUrl) {
      if (rawJson) throw error('WORKER_REQUIRED', 'Verified-byte ingestion requires a Worker to hash and parse JSON away from the map rendering thread.');
      return this._fallback(sceneData, 'Worker is unsupported or workerUrl is missing.', generation);
    }
    try {
      var worker = this.worker = new WorkerClass(this.options.workerUrl);
      worker.onmessage = function (event) {
        if (client.worker !== worker || client.initGeneration !== generation) return;
        var message = event.data || {};
        if (message.type === 'error') client._settle(message.token, error(message.error && message.error.code || 'ANALYSIS_FAILED', message.error && message.error.message || 'Spatial analysis failed.'));
        else if (message.type === 'ready') client._settle(message.token, null, Object.assign(message.info, { normalization: message.normalization, inputIntegrity: message.inputIntegrity || { verified: false, sha256: null, bytes: null, method: 'Legacy parsed input; original bytes not checked.' }, executionMode: 'worker' }));
        else if (message.type === 'result') {
          message.result.executionMode = 'worker'; message.result.fallbackReason = null;
          client._settle(message.token, null, message.result);
        }
      };
      worker.onerror = function (event) { client._workerFailed(event.message || 'Worker failed to load or execute.', worker, generation); };
      var operation = this._send('init', { sceneData: sceneData, config: this.config }, this.options.initTimeoutMs || 30000, rawJson ? [sceneData.bytes] : []);
      var info = await operation.promise;
      if (this.destroyed) throw error('DESTROYED', 'Client was destroyed.');
      if (this.initGeneration !== generation) throw error('STALE_INITIALIZATION', 'Initialization was superseded.');
      this.ready = true; this.executionMode = 'worker'; this.fallbackReason = null;
      return info;
    } catch (e) {
      if (this.destroyed) throw error('DESTROYED', 'Client was destroyed.');
      if (this.initGeneration !== generation) throw error('STALE_INITIALIZATION', 'Initialization was superseded.');
      if (this.worker) this.worker.terminate(); this.worker = null;
      if (rawJson) throw e; // Raw-byte verification may never degrade to unverified/main-thread parsing.
      // Geometry/data errors are not hidden by retrying them on the UI thread.
      if (['WORKER_FAILED', 'WORKER_TIMEOUT', 'WORKER_POST_FAILED'].indexOf(e.code) === -1 && e.code) throw e;
      return this._fallback(sceneData, e.message, generation);
    }
  };
  AnalysisClient.prototype.query = function (request) {
    if (this.destroyed) return Promise.reject(error('DESTROYED', 'Client was destroyed.'));
    if (!this.ready) return Promise.reject(error('NOT_READY', 'Initialize spatial analysis first.'));
    this.cancel('STALE_REQUEST');
    if (this.worker) {
      var operation = this._send('query', { request: request }, this.options.queryTimeoutMs || 30000);
      this.queryToken = operation.token; return operation.promise;
    }
    var client = this, token = ++this.counter; this.queryToken = token;
    return new Promise(function (resolve, reject) {
      client.pending.set(token, { resolve: resolve, reject: reject, timer: null });
      setTimeout(function () {
        if (!client.pending.has(token)) return;
        try { var result = client.engine.query(request); result.executionMode = client.executionMode; result.fallbackReason = client.fallbackReason; client._settle(token, null, result); }
        catch (e) { client._settle(token, e); }
      }, 0);
    });
  };
  AnalysisClient.prototype.cancel = function (code) {
    if (this.queryToken != null) this._settle(this.queryToken, error(code || 'CANCELLED', 'Spatial query was cancelled or superseded.'));
  };
  AnalysisClient.prototype.destroy = function () {
    if (this.destroyed) return;
    this.destroyed = true; this.ready = false;
    if (this.worker) this.worker.terminate(); this.worker = null; this.engine = null;
    var client = this; this.pending.forEach(function (_, token) { client._settle(token, error('DESTROYED', 'Client was destroyed.')); });
  };
  return AnalysisClient;
}));
