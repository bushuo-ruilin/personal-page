const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname;
const port = Number(process.env.PORT || 3000);
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'project-storage.js', 'calculator.js', 'content.js', 'calendar.js', 'income-clock.js', 'loan-tools.js', 'mortgage.js', 'mortgage-view.js', 'car-loan.js', 'car-loan-view.js']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const configPath = path.join(root, 'personal-config.json');
const maxConfigBytes = 1024 * 1024;
const allowedHosts = new Set([new URL(`http://127.0.0.1:${port}`).host, new URL(`http://localhost:${port}`).host]);
let writeQueue = Promise.resolve();
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
function configError(message, status = 400) { const error = new Error(message); error.status = status; return error; }
function validateProjectConfig(value) {
  if (!value || value.version !== 3 || !value.settings || !Array.isArray(value.cities) || !value.cities.length || value.cities.length > 100 || !Array.isArray(value.expenses) || value.expenses.length > 200 || !value.overtime || !value.uiSettings || typeof value.uiSettings.dashboardCollapsed !== 'boolean') throw configError('个人配置格式无效');
  const numeric = (n, max = 1e8) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
  for (const key of ['salary', 'bonus', 'deduction', 'socialBase', 'fundBase']) if (!numeric(value.settings[key])) throw configError('薪资金额无效');
  if (!['merged', 'separate'].includes(value.settings.bonusMode) || !['amount', 'months'].includes(value.settings.bonusType) || !numeric(value.settings.bonusMonths, 120)) throw configError('奖金设置无效');
  for (const key of ['customSocialBase', 'customFundBase', 'bonusEnabled', 'deductionEnabled', 'spreadBonus', 'includePersonalFund']) if (typeof value.settings[key] !== 'boolean') throw configError('薪资开关无效');
  if (!value.cities.some(city => city && city.id === value.settings.cityId)) throw configError('城市设置无效');
  for (const city of value.cities) {
    if (!city || typeof city.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(city.id) || typeof city.name !== 'string' || !city.name.trim() || city.name.length > 20 || !Array.isArray(city.rates) || city.rates.length !== 6) throw configError('城市参数无效');
    for (const key of ['socialMin', 'socialMax', 'fundMin', 'fundMax', 'medicalExtra']) if (!numeric(city[key])) throw configError('城市基数无效');
    if (city.socialMin > city.socialMax || city.fundMin > city.fundMax || city.rates.some(rate => !rate || !numeric(rate.personal, 100) || !numeric(rate.company, 100))) throw configError('城市比例或基数范围无效');
  }
  require('./content').validateContent(value.content);
  require('./calendar').validatePayday(value.payday);
  require('./income-clock').validateIncomeClock(value.incomeClock);
  require('./mortgage').validateMortgage(value.mortgage);
  require('./car-loan').validateCarLoan(value.carLoan);
  return Object.fromEntries(['version', 'app', 'settings', 'cities', 'expenses', 'overtime', 'content', 'payday', 'mortgage', 'carLoan', 'uiSettings', 'incomeClock'].map(key => [key, value[key]]));
}
async function readProjectConfig() {
  let raw;
  try { raw = await fs.promises.readFile(configPath, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return { enabled: false, revision: null, configuration: null }; throw configError('无法读取根目录 personal-config.json', 500); }
  try {
    if (Buffer.byteLength(raw, 'utf8') > maxConfigBytes) throw new Error();
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
    const configuration = validateProjectConfig(parsed);
    const enabled = parsed.projectStorage ? parsed.projectStorage.enabled : true;
    if (typeof enabled !== 'boolean') throw new Error();
    return { enabled, configuration: enabled ? configuration : null, revision: crypto.createHash('sha256').update(raw).digest('hex') };
  } catch (_) { throw configError('根目录 personal-config.json 格式无效，已保留原文件，请修正或通过配置备份恢复', 422); }
}
async function readBody(req) {
  const chunks = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > maxConfigBytes) throw configError('配置不能超过 1 MB', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (_) { throw configError('请求内容不是有效的 JSON'); }
}
async function saveProjectConfig(body) {
  if (!body || typeof body.enabled !== 'boolean' || !(body.revision === null || typeof body.revision === 'string')) throw configError('保存设置无效');
  let configuration;
  try { configuration = validateProjectConfig(body.configuration); }
  catch (error) { throw configError(error.message || '个人配置无效'); }
  const current = await readProjectConfig();
  if (body.revision !== current.revision) throw configError('配置已被其他窗口更新，请先加载项目配置', 409);
  const raw = JSON.stringify({ ...configuration, projectStorage: { enabled: body.enabled, updatedAt: new Date().toISOString() } }, null, 2) + '\n';
  if (Buffer.byteLength(raw, 'utf8') > maxConfigBytes) throw configError('配置不能超过 1 MB', 413);
  const temporary = path.join(root, `.personal-config-${crypto.randomBytes(12).toString('hex')}.tmp`);
  try {
    await fs.promises.writeFile(temporary, raw, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await fs.promises.rename(temporary, configPath);
  } catch (_) { throw configError('无法写入项目配置，请检查项目目录的写入权限', 500); }
  finally { await fs.promises.unlink(temporary).catch(() => {}); }
  return { enabled: body.enabled, revision: crypto.createHash('sha256').update(raw).digest('hex') };
}
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/project-config') {
    // Only the local app may read or update this fixed configuration file.
    const host = String(req.headers.host || '').toLowerCase();
    if (!allowedHosts.has(host) || (req.headers.origin && req.headers.origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') { json(res, 403, { error: '仅允许当前本地页面访问项目配置' }); return; }
    try {
      if (req.method === 'GET') { json(res, 200, await readProjectConfig()); return; }
      if (req.method !== 'PUT') { json(res, 405, { error: '不支持的请求方式' }); return; }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw configError('请求必须使用 JSON');
      const body = await readBody(req);
      const operation = writeQueue.catch(() => {}).then(() => saveProjectConfig(body));
      writeQueue = operation;
      json(res, 200, await operation);
    } catch (error) { json(res, error.status || 500, { error: error.status ? error.message : '项目配置读写失败' }); }
    return;
  }
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!publicFiles.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`知薪 preview: http://127.0.0.1:${port}`));
