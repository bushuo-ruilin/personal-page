(function () {
  'use strict';
  window.SalaryProjectStorage = { create({ getConfiguration, validateConfiguration, onState }) {
    const endpoint = '/api/project-config';
    const state = { ready: false, available: false, enabled: false, busy: false, conflict: false, error: false, message: '正在读取项目保存设置…' };
    let revision = null, timer, saving, lastSaved = '', retryEnabled = false;
    const emit = () => onState({ ...state });
    async function request(method, body, keepalive = false) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(endpoint, { method, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
          ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive } : {}) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) { const error = new Error(result.error || '当前本地服务不支持项目保存，请重启 npm run dev'); error.status = response.status; throw error; }
        return result;
      } finally { clearTimeout(timeout); }
    }
    function capture() {
      const value = getConfiguration();
      validateConfiguration(value);
      return JSON.stringify(value);
    }
    async function load() {
      if (saving) await saving.catch(() => {});
      clearTimeout(timer); state.busy = true; emit();
      try {
        const result = await request('GET');
        const configuration = result.enabled ? validateConfiguration(result.configuration) : null;
        state.available = true; state.enabled = result.enabled === true; state.conflict = false; state.error = false;
        revision = result.revision; lastSaved = '';
        state.message = state.enabled ? '已加载根目录 personal-config.json，后续修改会实时保存' : '当前仅保存在此浏览器；开启后可跨浏览器共用配置';
        return configuration;
      } catch (error) {
        state.available = false;
        state.error = true;
        state.message = error.name === 'AbortError' ? '连接本地服务超时，当前配置仍保存在浏览器' : error.message;
        return null;
      } finally { state.ready = true; state.busy = false; emit(); }
    }
    async function write(enabled, snapshot, keepalive = false) {
      const result = await request('PUT', { enabled, revision, configuration: JSON.parse(snapshot) }, keepalive);
      revision = result.revision; lastSaved = snapshot;
      return result;
    }
    function failure(error, enabled = true) {
      retryEnabled = enabled;
      state.error = true;
      state.conflict = error.status === 409;
      state.message = state.conflict ? '项目配置已被其他浏览器更新，自动保存已暂停；请点击“加载项目配置”' : '项目保存失败，浏览器中的配置仍保留；可点击重试';
    }
    async function flush(keepalive = false) {
      clearTimeout(timer);
      if (!state.ready || !state.available || !state.enabled || state.conflict || saving) return;
      let snapshot;
      try { snapshot = capture(); } catch (error) { state.message = error.message; emit(); return; }
      if (snapshot === lastSaved) return;
      state.busy = true; state.message = '正在保存到项目根目录…'; emit();
      saving = write(true, snapshot, keepalive);
      let success = false;
      try { await saving; success = true; state.error = false; state.message = '已实时保存到根目录 personal-config.json'; }
      catch (error) { failure(error); }
      finally { saving = null; state.busy = false; emit(); }
      if (success && state.enabled && capture() !== snapshot) schedule();
    }
    function schedule() {
      if (!state.ready || !state.available || !state.enabled || state.conflict) return;
      try { if (capture() === lastSaved) return; } catch (_) { return; }
      clearTimeout(timer); state.message = '配置已更新，等待保存到项目…'; emit();
      timer = setTimeout(() => flush(), 300);
    }
    async function setEnabled(enabled) {
      clearTimeout(timer);
      if (saving) await saving.catch(() => {});
      if (!state.available) return;
      state.busy = true; emit();
      let snapshot;
      try {
        snapshot = capture(); saving = write(enabled, snapshot);
        await saving; state.enabled = enabled; state.conflict = false; state.error = false;
        state.message = enabled ? '已开启，当前配置已保存到根目录 personal-config.json' : '已关闭项目同步；根目录文件保留，后续修改仅保存在此浏览器';
      } catch (error) { failure(error, enabled); }
      finally { saving = null; state.busy = false; emit(); }
      if (state.enabled && !state.conflict && snapshot && capture() !== snapshot) schedule();
    }
    return {
      async initialize() {
        if (!['http:', 'https:'].includes(location.protocol)) { state.ready = true; state.message = '项目保存需通过 npm run dev 启动本地服务后使用'; emit(); return null; }
        return load();
      }, load, schedule, setEnabled, flush,
      adopt() { clearTimeout(timer); lastSaved = capture(); },
      retry() { return state.conflict ? Promise.resolve() : setEnabled(retryEnabled); }
    };
  } };
})();
