(async () => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const { calculate, brackets, bracket, round, normalizeSettings, effectiveBonus, calculateBudget, calculateOvertime } = SalaryCalc;
  const { defaultQuotes, defaultLinks, validateContent } = SalaryContent;
  const { defaultPayday, validatePayday, clockSnapshot, nextPayday } = SalaryCalendar;
  const { defaultIncomeClock, validateIncomeClock, incomeSnapshot, formatDuration } = SalaryIncomeClock;
  const { defaultMortgage, validateMortgage } = SalaryMortgage;
  const { defaultCarLoan, validateCarLoan } = SalaryCarLoan;
  const storageKey = 'zhixin.salary.v1';
  const icons = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    shield: '<path d="m12 3 8 3v6c0 4-5 8-8 9-3-1-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15M6 8h3m6 0h3M6 12h3m6 0h3"/>',
    building: '<path d="M5 21V3h14v18M2 21h20M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-4 6v-3h2v3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    upload: '<path d="M4 15v5h16v-5M12 16V3m-5 5 5-5 5 5"/>',
    download: '<path d="M4 15v5h16v-5M12 3v13m-5-5 5 5 5-5"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    sliders: '<path d="M4 7h3m4 0h9M4 17h9m4 0h3"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v4H8zm0 8h1m6 0h1m-8 4h1m6 0h1"/>',
    refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
    wallet: '<path d="M20 8V5H5a2 2 0 0 1 0-4h13v4M5 5H3v14a2 2 0 0 0 2 2h15v-5"/><path d="M14 8h8v8h-8zM17 12h1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 4h1m6 0h1m-8 3h1"/>',
    coins: '<ellipse cx="10" cy="6" rx="7" ry="3"/><path d="M3 6v5c0 4 14 4 14 0V6M3 11v5c0 3 7 4 11 2m3-8c6 0 6 4 0 5m4-3v5c0 3-7 4-10 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4"/>',
    'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',
    medical: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c6 3 12 3 18 0m-9 0v4"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
    car: '<path d="m5 8 2-5h10l2 5M3 9h18v9H3zM5 18v3m14-3v3M6 13h2m8 0h2M3 8H1m20 0h2"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.shield}</svg>`;
  function renderIcons() { $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = (value, digits = 2) => Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const money = value => `¥ ${number(value)}`;
  const metricMoney = value => { const [whole, decimal] = number(value).split('.'); return `<span class="currency">¥</span>${whole}<span class="decimal">.${decimal}</span>`; };
  const rate = value => `${Number(value).toFixed(2).replace(/\.?0+$/, '')}%`;
  const defaults = { cityId: 'shanghai', salary: 20000, bonus: 50000, deduction: 1500, customSocialBase: false, customFundBase: false, socialBase: 20000, fundBase: 20000, bonusMode: 'separate', bonusEnabled: true, bonusType: 'amount', bonusMonths: 2.5, deductionEnabled: true, spreadBonus: false, includePersonalFund: false };
  const defaultOvertime = { base: 20000, weekdayDays: 20, weekdayHours: 2, weekendDays: 4, weekendHours: 8, holidayDays: 0, holidayHours: 8, months: 12, compensatoryLeave: false, includeInSalary: false, includeDecember: true, startMonth: 1 };
  const rateNames = [ ['pension', '养老保险', 'heart'], ['medical', '医疗保险', 'medical'], ['unemployment', '失业保险', 'briefcase'], ['injury', '工伤保险', 'shield'], ['maternity', '生育保险', 'heart'], ['fund', '住房公积金', 'home'] ];
  function cityTemplate(id, name, socialMin, socialMax, fundMin, fundMax, fundRate = 7, medical = 9, extra = 0) {
    const personal = [8, 2, .5, 0, 0, fundRate], company = [16, medical, .5, .2, 0, fundRate];
    return { id, name, socialMin, socialMax, fundMin, fundMax, medicalExtra: extra, updated: '2026-10-22', source: 'demo', rates: rateNames.map(([key, name], i) => ({ key, name, personal: personal[i], company: company[i] })) };
  }
  const defaultCities = [cityTemplate('shanghai', '上海', 7500, 37500, 2690, 37500), cityTemplate('beijing', '北京', 7000, 35000, 2500, 35000, 12, 9.8, 3), cityTemplate('shenzhen', '深圳', 4500, 30000, 2500, 40000, 5, 6), cityTemplate('hangzhou', '杭州', 4800, 25000, 2500, 40000, 12, 9.5)];
  let cities = JSON.parse(JSON.stringify(defaultCities));
  let settings = { ...defaults };
  let expenses = [];
  let overtime = { ...defaultOvertime };
  let content = validateContent({ quotes: defaultQuotes, links: defaultLinks });
  let payday = { ...defaultPayday };
  let mortgage = { ...defaultMortgage };
  let mortgageUI;
  let carLoan = { ...defaultCarLoan };
  let carLoanUI;
  let uiSettings = { dashboardCollapsed: false };
  let incomeClock = { ...defaultIncomeClock, workdays: [...defaultIncomeClock.workdays] };
  let editingQuoteId = null;
  let editingLinkId = null;
  let currentQuoteId = null;
  let budget;
  let currentPage = 'overview';
  let result;
  let editingCityId;
  let toastTimer;
  let storageAvailable = true;
  let projectStorage;
  const numeric = (value, max = 1e8) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
  function validateConfiguration(data) {
    if (!data || ![1, 2, 3].includes(data.version) || !Array.isArray(data.cities) || !data.cities.length || data.cities.length > 100) throw new Error('不是有效的知薪配置文件');
    const ids = new Set();
    const names = new Set();
    const cleanCities = data.cities.map(city => {
      if (!city || typeof city.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(city.id) || ids.has(city.id)) throw new Error('城市标识无效或重复');
      if (typeof city.name !== 'string' || !city.name.trim() || city.name.length > 20 || names.has(city.name.trim())) throw new Error('城市名称无效或重复');
      for (const key of ['socialMin', 'socialMax', 'fundMin', 'fundMax']) if (!numeric(city[key])) throw new Error('城市基数必须是有效的非负金额');
      if (city.socialMax < city.socialMin || city.fundMax < city.fundMin) throw new Error('基数上限不能小于下限');
      if (!numeric(city.medicalExtra, 100000)) throw new Error('医疗附加费无效');
      if (typeof city.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(city.updated) || !Number.isFinite(Date.parse(city.updated)) || new Date(city.updated).toISOString().slice(0, 10) !== city.updated) throw new Error('参数更新日期无效');
      if (!['demo', 'custom'].includes(city.source)) throw new Error('参数标识无效');
      if (!Array.isArray(city.rates) || city.rates.length !== 6) throw new Error('必须包含六项缴纳比例');
      const rates = rateNames.map(([key, name]) => {
        const item = city.rates.find(item => item && item.key === key);
        if (!item || !numeric(item.personal, 100) || !numeric(item.company, 100)) throw new Error('缴纳比例应在 0% 到 100% 之间');
        return { key, name, personal: item.personal, company: item.company };
      });
      ids.add(city.id); names.add(city.name.trim());
      return { id: city.id, name: city.name.trim(), socialMin: city.socialMin, socialMax: city.socialMax, fundMin: city.fundMin, fundMax: city.fundMax, medicalExtra: city.medicalExtra, updated: city.updated, source: city.source, rates };
    });
    if (!data.settings) throw new Error('薪资设置无效');
    const s = data.version < 3 ? normalizeSettings(data.settings) : { includePersonalFund: false, ...data.settings };
    if (!ids.has(s.cityId) || !['merged', 'separate'].includes(s.bonusMode) || !['amount', 'months'].includes(s.bonusType)) throw new Error('薪资设置无效');
    for (const key of ['customSocialBase', 'customFundBase', 'bonusEnabled', 'deductionEnabled', 'spreadBonus', 'includePersonalFund']) if (typeof s[key] !== 'boolean') throw new Error('开关设置无效');
    for (const key of ['salary', 'bonus', 'deduction', 'socialBase', 'fundBase']) if (!numeric(s[key])) throw new Error('薪资设置包含无效金额');
    if (!numeric(s.bonusMonths, 120)) throw new Error('奖励月数应在 0 到 120 之间');
    const expenseIds = new Set();
    const importedExpenses = data.version === 1 ? [] : data.expenses;
    if (!Array.isArray(importedExpenses) || importedExpenses.length > 200) throw new Error('花销列表无效或超过 200 条');
    const cleanExpenses = importedExpenses.map(item => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || expenseIds.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 30 || !numeric(item.amount) || !Number.isInteger(item.month) || item.month < 0 || item.month > 12) throw new Error('花销名称、金额或月份无效');
      expenseIds.add(item.id);
      return { id: item.id, name: item.name.trim(), amount: round(item.amount), month: item.month };
    });
    const importedOvertime = data.version === 1 ? { ...defaultOvertime, base: s.salary } : { ...defaultOvertime, ...data.overtime };
    validateOvertime(importedOvertime);
    const importedContent = validateContent(data.version < 3 ? { quotes: defaultQuotes, links: defaultLinks } : data.content);
    const importedPayday = validatePayday(data.payday === undefined ? defaultPayday : data.payday);
    const importedMortgage = validateMortgage(data.mortgage === undefined ? defaultMortgage : data.mortgage);
    const importedCar = validateCarLoan(data.carLoan === undefined ? defaultCarLoan : data.carLoan);
    const importedUI = data.uiSettings === undefined ? { dashboardCollapsed: false } : data.uiSettings;
    if (!importedUI || typeof importedUI.dashboardCollapsed !== 'boolean') throw new Error('顶部信息显示设置无效');
    const importedIncomeClock = validateIncomeClock(data.incomeClock === undefined ? defaultIncomeClock : data.incomeClock);
    return { cities: cleanCities, settings: Object.fromEntries(Object.keys(defaults).map(key => [key, s[key]])), expenses: cleanExpenses, overtime: Object.fromEntries(Object.keys(defaultOvertime).map(key => [key, importedOvertime[key]])), content: importedContent, payday: importedPayday, mortgage: importedMortgage, carLoan: importedCar, uiSettings: { dashboardCollapsed: importedUI.dashboardCollapsed }, incomeClock: importedIncomeClock };
  }
  function validateOvertime(value) {
    if (typeof value?.includeDecember !== 'boolean') throw new Error('奖金月加班费开关设置无效');
    if (!value || !numeric(value.base) || typeof value.compensatoryLeave !== 'boolean' || typeof value.includeInSalary !== 'boolean') throw new Error('加班工资基数或开关设置无效');
    for (const key of ['weekdayDays', 'weekendDays', 'holidayDays']) if (!Number.isInteger(value[key]) || !numeric(value[key], 31)) throw new Error('加班天数应为 0 到 31 之间的整数');
    for (const key of ['weekdayHours', 'weekendHours', 'holidayHours']) if (!numeric(value[key], 24) || !Number.isInteger(value[key] * 4)) throw new Error('每天加班时长应在 0 到 24 小时之间，以 0.25 小时递增');
    if (value.weekdayDays + value.weekendDays + value.holidayDays > 31) throw new Error('三类加班天数合计不能超过 31 天，请避免重复填写');
    if (!Number.isInteger(value.months) || value.months < 1 || value.months > 12) throw new Error('持续月数应为 1 到 12 之间的整数');
    if (!Number.isInteger(value.startMonth) || value.startMonth < 1 || value.startMonth > 12 || value.startMonth + value.months > 13) throw new Error('起算月份与持续月数必须在本年度 1 至 12 月内');
  }
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
  }
  function configuration() { return { version: 3, app: '知薪 Salary Studio', settings, cities, expenses, overtime, content, payday, mortgage, carLoan, uiSettings, incomeClock }; }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(configuration())); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    $('#save-state').innerHTML = `${icon(storageAvailable ? 'check-circle' : 'info')} ${storageAvailable ? '已自动保存到本地' : '本地存储不可用，请导出配置'}`;
    projectStorage?.schedule();
  }
  function useConfiguration(data) {
    settings = data.settings; cities = data.cities; expenses = data.expenses; overtime = data.overtime; content = data.content;
    payday = data.payday; mortgage = data.mortgage; carLoan = data.carLoan; uiSettings = data.uiSettings; incomeClock = data.incomeClock;
  }
  let loadWarning;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) useConfiguration(validateConfiguration(JSON.parse(saved)));
  } catch (_) { loadWarning = '已使用默认设置：本地配置损坏或存储不可用'; }
  function updateProjectStorageUI(state) {
    $('#project-storage-toggle').checked = state.enabled;
    $('#project-storage-toggle').disabled = !state.ready || !state.available || state.busy;
    $('#project-storage-status').textContent = state.message;
    $('#project-storage-status').classList.toggle('form-error', state.error);
    $('#project-storage-reload').disabled = !state.ready || state.busy;
    $('#project-storage-reload').hidden = !['http:', 'https:'].includes(location.protocol);
    $('#project-storage-reload').textContent = state.available ? '加载项目配置' : '重新连接本地服务';
    $('#project-storage-retry').hidden = !state.error || !state.available || state.conflict;
    $('#project-storage-retry').disabled = state.busy;
  }
  projectStorage = SalaryProjectStorage.create({ getConfiguration: configuration, validateConfiguration, onState: updateProjectStorageUI });
  $('main').inert = true;
  try {
    const projectConfiguration = await projectStorage.initialize();
    if (projectConfiguration) { useConfiguration(projectConfiguration); projectStorage.adopt(); loadWarning = null; }
  } finally { $('main').inert = false; }
  function syncForm() {
    $('#city').innerHTML = cities.map(city => `<option value="${escape(city.id)}">${escape(city.name)}</option>`).join('');
    $('#city').value = settings.cityId;
    ['salary', 'bonus', 'bonusMonths', 'deduction', 'socialBase', 'fundBase'].forEach(key => { $(`#${key}`).value = settings[key]; });
    ['customSocialBase', 'customFundBase', 'bonusEnabled', 'deductionEnabled', 'spreadBonus', 'includePersonalFund'].forEach(key => { $(`#${key}`).checked = settings[key]; });
    $(`input[name="bonusType"][value="${settings.bonusType}"]`).checked = true;
    $(`input[name="bonusMode"][value="${settings.bonusMode}"]`).checked = true;
    updateOptionalFields();
  }
  function updateOptionalFields() {
    const bonusOn = $('#bonusEnabled').checked;
    const byMonths = $('input[name="bonusType"]:checked').value === 'months';
    $('#bonus-options').hidden = !bonusOn;
    $('#bonus-amount-field').hidden = byMonths;
    $('#bonus-months-field').hidden = !byMonths;
    $('#bonus').disabled = !bonusOn || byMonths;
    $('#bonusMonths').disabled = !bonusOn || !byMonths;
    $$('input[name="bonusType"], input[name="bonusMode"]').forEach(input => { input.disabled = !bonusOn; });
    $('#deduction-options').hidden = !$('#deductionEnabled').checked;
    $('#deduction').disabled = !$('#deductionEnabled').checked;
    $('#socialBase').disabled = !$('#customSocialBase').checked;
    $('#fundBase').disabled = !$('#customFundBase').checked;
  }
  function readForm() {
    updateOptionalFields();
    const form = $('#salary-form');
    if (!form.checkValidity()) { form.reportValidity(); return false; }
    const next = { ...settings, cityId: $('#city').value, bonusMode: $('input[name="bonusMode"]:checked').value, bonusType: $('input[name="bonusType"]:checked').value };
    ['salary', 'bonus', 'bonusMonths', 'deduction', 'socialBase', 'fundBase'].forEach(key => { if (!$(`#${key}`).disabled) next[key] = +$(`#${key}`).value; });
    ['customSocialBase', 'customFundBase', 'bonusEnabled', 'deductionEnabled', 'spreadBonus', 'includePersonalFund'].forEach(key => { next[key] = $(`#${key}`).checked; });
    settings = next;
    return true;
  }
  function activeCity() { return cities.find(city => city.id === settings.cityId); }
  function contributionLabel(item) { const match = rateNames.find(([key]) => key === item.key); return `<span class="contribution-name"><span class="contribution-icon">${icon(match[2])}</span>${escape(item.name)}</span>`; }
  function renderTrend() {
    const rows = result.displayRows;
    const values = rows.map(row => row.net);
    const maximum = Math.max(...values, 1);
    const minimum = Math.min(...values, 0);
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(maximum - minimum, 1)));
    const step = Math.max(.01, Math.ceil((maximum - minimum) / 4 / magnitude * 10) / 10 * magnitude);
    const maxY = Math.ceil(maximum / step) * step;
    const minY = Math.floor(minimum / step) * step;
    const range = maxY - minY || 1;
    const left = 47, top = 24, height = 141, width = 345;
    const y = value => top + (maxY - value) / range * height;
    const tick = value => Math.abs(value) >= 1000 ? `${number(value / 1000, Number.isInteger(value / 1000) ? 0 : 1)}k` : number(value, Math.abs(value) < 1 && value !== 0 ? 2 : 0);
    let grid = '';
    for (let i = 0; i <= 4; i++) { const val = minY + range / 4 * i; grid += `<line x1="${left}" y1="${y(val)}" x2="400" y2="${y(val)}" stroke="#e9eee3" stroke-dasharray="3 4"/><text x="${left - 9}" y="${y(val) + 3}" fill="#7f8e72" font-size="11" text-anchor="end">${tick(val)}</text>`; }
    const bars = rows.map((row, i) => { const x = left + i * width / 12 + 5, cy = y(Math.max(row.net, 0)), bh = Math.max(Math.abs(y(row.net) - y(0)), .7); return `<g class="chart-bar" tabindex="0" aria-label="${row.month}月到手 ${money(row.net)}"><title>${row.month}月到手 ${money(row.net)}；个税 ${money(row.tax)}</title><rect x="${x}" y="${cy}" width="17" height="${bh}" rx="3" fill="${i === 11 ? '#779a67' : '#b7caaa'}"/><text x="${x + 8.5}" y="185" text-anchor="middle" fill="#7f8e72" font-size="11">${String(i + 1).padStart(2, '0')}</text></g>`; }).join('');
    $('#trend-chart').innerHTML = `<svg class="trend-svg" viewBox="0 0 410 200" role="img" aria-label="每月到手收入柱状图，详细数值见月度明细"><text x="47" y="10" fill="#7f8e72" font-size="10">CNY</text>${grid}${bars}</svg>`;
  }
  function renderDonut() {
    const pieces = [{ label: '实际到手', value: result.net, color: '#76966b' }, { label: '个人五险一金', value: result.yearlyPersonal, color: '#bdd0a5' }, { label: '个人所得税', value: result.tax, color: '#e2d7b7' }];
    const positiveTotal = pieces.reduce((sum, part) => sum + Math.max(0, part.value), 0);
    const circumference = 2 * Math.PI * 60;
    let offset = 0;
    const rings = pieces.map(piece => { const share = positiveTotal ? Math.max(0, piece.value) / positiveTotal : 0; const length = share * circumference; const circle = `<circle cx="90" cy="90" r="60" fill="none" stroke="${piece.color}" stroke-width="16" stroke-dasharray="${Math.max(0, length - (share > .01 ? 3 : 0))} ${circumference}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"/>`; offset += length; return circle; }).join('');
    const percent = result.gross > 0 ? result.net / result.gross * 100 : 0;
    $('#donut-chart').innerHTML = `<svg class="donut-svg" viewBox="0 0 180 180" role="img" aria-label="到手占税前收入 ${number(percent, 1)}%"><circle cx="90" cy="90" r="60" fill="none" stroke="#f0f3e9" stroke-width="16"/>${rings}<text x="90" y="82" text-anchor="middle" fill="#94a185" font-size="10">到手占比</text><text x="90" y="107" text-anchor="middle" fill="#47673b" font-size="26">${number(percent, 1)}<tspan font-size="13">%</tspan></text></svg>`;
    $('#composition-legend').innerHTML = pieces.map(piece => `<div class="legend-row"><b style="background:${piece.color}"></b><span>${piece.label}</span><span class="legend-amount">${money(piece.value)}</span><span class="legend-percent">${number(result.gross ? piece.value / result.gross * 100 : 0, 1)}%</span></div>`).join('');
  }
  function renderTables() {
    $('#summary-contributions').innerHTML = result.contributions.map(item => `<tr><td>${contributionLabel(item)}</td><td>${rate(item.personal)}${item.key === 'medical' && activeCity().medicalExtra ? ' + 附加费' : ''}</td><td>${money(item.personalAmount)}</td><td>${rate(item.company)}</td><td>${money(item.companyAmount)}</td></tr>`).join('');
    $('#summary-total').innerHTML = `<tr><td>每月合计</td><td>${rate(result.personalRate)}</td><td>${money(result.personal)}</td><td>${rate(result.companyRate)}</td><td>${money(result.company)}</td></tr>`;
    const totals = `<span>个人总比例 <b>${rate(result.personalRate)}</b></span><span>公司总比例 <b>${rate(result.companyRate)}</b></span><span>双边合计 <b>${rate(result.combinedRate)}</b></span>`;
    $('#summary-rate-totals').innerHTML = totals; $('#contribution-rate-totals').innerHTML = totals;
    $('#monthly-body').innerHTML = result.displayRows.map(row => {
      const incomeTags = [];
      if (row.bonus) incomeTags.push(settings.spreadBonus ? '奖金分摊' : '含奖金');
      if (row.overtimePay) incomeTags.push(row.bonus ? '加班费' : '含加班费');
      return `<tr><td>${String(row.month).padStart(2, '0')} 月${incomeTags.length ? `<span class="pill">${incomeTags.join(' + ')}</span>` : ''}</td><td>${money(row.gross)}</td><td>${money(row.personal)}</td><td>${money(row.tax)}</td><td>${money(row.net)}</td></tr>`;
    }).join('');
    $('#monthly-panel .card-title p').textContent = settings.spreadBonus && result.yearlyBonus ? '奖金及相关税额按月分摊展示；年度税额不变，实际仍假设 12 月发奖。' : '全年 12 个月 · 累计预扣法 · 奖金默认在 12 月发放';
    $('#monthly-total').innerHTML = `<tr><td>全年合计</td><td>${money(result.gross)}</td><td>${money(result.yearlyPersonal)}</td><td>${money(result.tax)}</td><td>${money(result.net)}</td></tr>`;
    $('#contribution-bases').textContent = `${activeCity().name} · 社保基数 ${money(result.socialBase)} · 公积金基数 ${money(result.fundBase)}`;
    $('#contributions-body').innerHTML = result.contributions.map(item => `<tr><td>${contributionLabel(item)}</td><td>${number(item.base)}</td><td>${rate(item.personal)}</td><td>${number(item.personalAmount)}</td><td>${rate(item.company)}</td><td>${number(item.companyAmount)}</td></tr>`).join('');
    $('#contributions-total').innerHTML = `<tr><td>每月合计</td><td>—</td><td>${rate(result.personalRate)}</td><td>${number(result.personal)}</td><td>${rate(result.companyRate)}</td><td>${number(result.company)}</td></tr>`;
    $('#contribution-note').textContent = `个人缴纳从税前薪资中扣除，公司缴纳不扣减个人到手收入，双方比例可在城市参数管理中分别修改。${activeCity().medicalExtra ? `个人医疗缴纳另含每月 ${money(activeCity().medicalExtra)} 附加费。` : ''} 生育保险可按当地政策并入医疗。社保基数：${settings.customSocialBase ? '自定义' : '城市默认'}；公积金基数：${settings.customFundBase ? '自定义' : '城市默认'}。默认基数使用基础月薪及城市上下限，自定义按填写值计算。比例合计为名义比例之和，两个基数不同时，不能直接用工资乘合计比例算金额；固定附加费不计入比例。`;
    $('#contribution-stats').innerHTML = `<article class="metric-card"><div class="metric-label">全年个人缴纳</div><div class="metric-value">${metricMoney(result.yearlyPersonal)}</div><div class="metric-footer">从工资中扣除，包含社保及公积金</div></article><article class="metric-card featured"><div class="metric-label">全年公司缴纳</div><div class="metric-value">${metricMoney(result.yearlyCompany)}</div><div class="metric-footer">公司承担，额外计入用工成本</div></article>`;
    const active = bracket(result.taxable);
    $('#tax-body').innerHTML = brackets.map((item, i) => `<tr class="${item === active && result.taxable > 0 ? 'current-bracket' : ''}"><td>${i + 1}${item === active && result.taxable > 0 ? ' · 当前' : ''}</td><td>${i === 0 ? `不超过 ${number(item.limit, 0)}` : i === 6 ? `超过 ${number(brackets[i - 1].limit, 0)}` : `${number(brackets[i - 1].limit, 0)} – ${number(item.limit, 0)}`}</td><td>${rate(item.rate * 100)}</td><td>${number(item.deduction, 0)}</td></tr>`).join('');
    $('#tax-explanation').innerHTML = `本次全年综合所得应纳税所得额为 <strong>${money(result.taxable)}</strong>，适用税率 ${result.taxable > 0 ? rate(active.rate * 100) : '0%（无应纳税所得额）'}。每月预扣税额 = 累计应纳税所得额 × 税率 − 速算扣除数 − 已预扣税额。<br>${!settings.bonusEnabled ? '本次已关闭全年一次性奖金。' : settings.bonusMode === 'separate' ? `年终奖采用单独计税：奖金 ÷ 12 确定月度税率档，再以奖金全额 × 税率 − 月度速算扣除数，奖金个税为 ${money(result.bonusTax)}。月度档位上限及速算扣除数均为上表的 1/12。` : '年终奖在 12 月并入综合所得，与工资合并累计计税。'}<br>专项附加扣除：${settings.deductionEnabled ? `${money(result.monthlyDeduction)} / 月` : '已关闭'}。全年一次性奖金单独计税政策现行有效期至 2027 年 12 月 31 日。本工具假设 1 月起连续任职，扣除额每月相同。`;
  }
  function renderCities() {
    $('#city-cards').innerHTML = cities.map(city => `<article class="card city-card ${city.id === settings.cityId ? 'selected' : ''}"><div class="city-card-top"><h3>${escape(city.name)}</h3><span class="pill">${city.source === 'demo' ? '演示参数' : '自定义参数'}${city.id === settings.cityId ? ' · 当前' : ''}</span></div><dl><div><dt>社保基数范围</dt><dd>${number(city.socialMin, 0)} – ${number(city.socialMax, 0)}</dd></div><div><dt>公积金基数范围</dt><dd>${number(city.fundMin, 0)} – ${number(city.fundMax, 0)}</dd></div><div><dt>公积金 · 个人 / 公司</dt><dd>${rate(city.rates[5].personal)} / ${rate(city.rates[5].company)}</dd></div></dl><div class="city-card-bottom"><span>更新 ${escape(city.updated)}</span><button class="text-button" data-edit-city="${escape(city.id)}">${icon('edit')} 编辑参数</button></div></article>`).join('');
  }
  const monthOptions = (selected = 0, average = false) => [`<option value="0"${selected === 0 ? ' selected' : ''}>${average ? '月均花销' : '每月固定'}</option>`, ...Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${selected === i + 1 ? ' selected' : ''}>${i + 1} 月</option>`)].join('');
  function renderExpenseList() {
    $('#expense-list').innerHTML = expenses.length ? expenses.map(item => `<div class="expense-row" data-expense-id="${escape(item.id)}"><input class="plain-input" data-expense-field="name" aria-label="${escape(item.name)}名称" maxlength="30" required value="${escape(item.name)}"><input class="plain-input" data-expense-field="amount" aria-label="${escape(item.name)}金额" type="number" min="0" max="100000000" step="0.01" required value="${item.amount}"><select class="plain-input" data-expense-field="month" aria-label="${escape(item.name)}月份">${monthOptions(item.month)}</select><button type="button" class="remove-expense" data-remove-expense="${escape(item.id)}" aria-label="删除${escape(item.name)}" title="删除这笔花销">×</button></div>`).join('') : '<div class="empty-state"><strong>生活的账，从第一笔开始。</strong><p>添加房租、餐饮、交通或喜欢的事物。<br>还未录入花销时，结余暂等于到手收入。</p></div>';
  }
  function renderBudget(refreshList = true) {
    budget = calculateBudget(result, expenses);
    $('#yearly-saving').innerHTML = metricMoney(budget.yearlySaving);
    $('#yearly-saving').classList.toggle('negative', budget.yearlySaving < 0);
    $('#monthly-spending').innerHTML = metricMoney(budget.monthlyAverage);
    $('#yearly-spending').innerHTML = metricMoney(budget.yearlySpending);
    $('#saving-rate').textContent = result.net > 0 ? `结余率 ${number(budget.yearlySaving / result.net * 100, 1)}% · 占全年到手收入` : '到手收入不大于零，结余率不适用';
    $('#overview-savings').textContent = money(budget.yearlySaving);
    $('#overview-savings').classList.toggle('negative', budget.yearlySaving < 0);
    $('#overview-savings-note').textContent = expenses.length ? `月均花销 ${money(budget.monthlyAverage)} · ${budget.yearlySaving < 0 ? '当前预计支出超过收入' : '这是今年预计的现金结余'}` : '尚未记录生活花销，点这里开始规划。';
    $('#budget-body').innerHTML = budget.rows.map(row => `<tr><td>${String(row.month).padStart(2, '0')} 月</td><td>${money(row.income)}</td><td>${money(row.spending)}</td><td class="${row.saving < 0 ? 'negative' : ''}">${money(row.saving)}</td><td class="${row.accumulated < 0 ? 'negative' : ''}">${money(row.accumulated)}</td></tr>`).join('');
    $('#budget-total').innerHTML = `<tr><td>全年合计</td><td>${money(result.net)}</td><td>${money(budget.yearlySpending)}</td><td class="${budget.yearlySaving < 0 ? 'negative' : ''}">${money(budget.yearlySaving)}</td><td>${money(budget.yearlySaving)}</td></tr>`;
    $('#budget-note').textContent = `${expenses.length ? `已记录 ${expenses.length} 项花销。` : '尚未添加花销，当前结余仅代表到手收入。'}每月固定花销计入 12 个月，指定月份花销只扣一次。${budget.yearlySaving < 0 ? '当前年度收支为负，代表预计缺口。' : '结余是现金收支估算，不包含期初存款或投资收益。'}所选城市${activeCity().source === 'demo' ? '使用演示缴费参数' : '使用自定义缴费参数'}。`;
    $('#budget-mode-note').textContent = `${settings.spreadBonus && result.yearlyBonus ? '当前按奖金分摊口径规划月度结余；实际奖金假设 12 月到账。' : '按实际发放月份估算现金结余，奖金默认在 12 月发放。'}${overtime.includeInSalary ? `含加班费税后影响，起算 ${overtime.startMonth} 月，持续 ${overtime.months} 个月。` : '加班费未计入当前收入。'}`;
    if (refreshList) renderExpenseList();
    renderSpending();
  }
  function renderSpending() {
    const month = +$('#spending-month').value;
    const grouped = new Map();
    expenses.forEach(item => {
      const value = month === 0 ? item.amount * (item.month === 0 ? 12 : 1) / 12 : item.month === 0 || item.month === month ? item.amount : 0;
      if (value > 0) grouped.set(item.name, (grouped.get(item.name) || 0) + value);
    });
    const sorted = [...grouped].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, item) => sum + item[1], 0);
    $('#spending-total').innerHTML = `<span>${month ? `${month} 月生活花销` : '全年花销折算月均'}</span><strong>${money(total)}</strong>`;
    const colors = ['#76966b', '#a2b68a', '#c1af82', '#80a5a0', '#a49baf', '#b78f7b'];
    $('#spending-bars').innerHTML = sorted.length ? sorted.map(([name, amount], index) => `<div class="spending-item"><div><span>${escape(name)}</span><strong>${money(amount)}</strong><span>${number(amount / total * 100, 1)}%</span></div><div class="spending-track"><span style="width:${amount / total * 100}%;background:${colors[index % colors.length]}"></span></div></div>`).join('') : '<div class="empty-state"><p>这个月份还没有花销。<br>添加后即可查看每一项的占比。</p></div>';
    $('#spending-caption').textContent = month ? '含本月的固定花销与额外支出。同名项目合并展示。' : '每月固定支出直接计入；指定月份支出按全年总额 ÷ 12 折算。同名项目合并展示。';
  }
  const overtimeFields = { base: 'ot-base', weekdayDays: 'ot-weekday-days', weekdayHours: 'ot-weekday-hours', weekendDays: 'ot-weekend-days', weekendHours: 'ot-weekend-hours', holidayDays: 'ot-holiday-days', holidayHours: 'ot-holiday-hours', months: 'ot-months', startMonth: 'ot-start-month' };
  function syncOvertimeForm() {
    Object.entries(overtimeFields).forEach(([key, id]) => { $(`#${id}`).value = overtime[key]; });
    $('#ot-leave').checked = overtime.compensatoryLeave;
    $('#ot-include-salary').checked = overtime.includeInSalary;
    $('#ot-include-december').checked = overtime.includeDecember;
    $('#overtime-error').textContent = '';
  }
  function readOvertimeForm() {
    if (!$('#overtime-form').checkValidity()) { $('#overtime-form').reportValidity(); return false; }
    const next = Object.fromEntries(Object.entries(overtimeFields).map(([key, id]) => [key, +$(`#${id}`).value]));
    next.compensatoryLeave = $('#ot-leave').checked;
    next.includeInSalary = $('#ot-include-salary').checked;
    next.includeDecember = $('#ot-include-december').checked;
    try { validateOvertime(next); overtime = next; $('#overtime-error').textContent = ''; return true; }
    catch (error) { $('#overtime-error').textContent = `${error.message}。结果保留上次有效测算。`; return false; }
  }
  function renderOvertime() {
    const r = calculateOvertime(overtime);
    $('#ot-monthly-pay').innerHTML = metricMoney(r.monthlyPay);
    $('#ot-hourly').innerHTML = metricMoney(r.hourly);
    $('#ot-hourly-15').innerHTML = metricMoney(r.hourly15);
    $('#ot-hourly-2').innerHTML = metricMoney(r.hourly2);
    $('#ot-hourly-3').innerHTML = metricMoney(r.hourly3);
    const extraDecember = overtime.includeInSalary && overtime.includeDecember && result.yearlyBonus > 0 && overtime.startMonth + overtime.months <= 12;
    $('#ot-annual-pay').innerHTML = metricMoney(overtime.includeInSalary ? result.yearlyOvertime : r.annualPay);
    $('#ot-total-hours').textContent = `本月合计 ${number(r.totalHours, 2)} 小时加班${overtime.compensatoryLeave ? ' · 休息日已补休' : ''}`;
    $('#ot-annual-note').textContent = `${overtime.startMonth} 月起持续 ${overtime.months} 个月${extraDecember ? '，另含 12 月奖金月' : ''} · ${overtime.includeInSalary ? '已计入工资纳税' : '独立测算'}`;
    $('#overtime-body').innerHTML = `<tr><td>工作日延时</td><td>${number(r.weekdayHours, 2)}</td><td>1.5 ×</td><td>${money(r.hourly15)}</td><td>${money(r.weekdayPay)}</td></tr><tr><td>休息日${overtime.compensatoryLeave ? '（已补休）' : ''}</td><td>${number(r.weekendHours, 2)}</td><td>${overtime.compensatoryLeave ? '补休' : '2 ×'}</td><td>${money(r.hourly2)}</td><td>${money(r.weekendPay)}</td></tr><tr><td>法定节假日</td><td>${number(r.holidayHours, 2)}</td><td>3 ×</td><td>${money(r.hourly3)}</td><td>${money(r.holidayPay)}</td></tr>`;
    $('#overtime-inclusion-note').textContent = `仅测算标准工时制。周六是否属于休息日取决于排班，调休后的工作日归入工作日；三类天数不要重复填写。${overtime.includeInSalary ? `已将 ${overtime.startMonth} 至 ${overtime.startMonth + overtime.months - 1} 月${extraDecember ? '及 12 月奖金月' : ''}的加班费并入工资，重新计算累计个税与结余。` : '当前为独立测算，开启“加班费计入月薪并纳税”后会同步更新收入和年度结余。'}`;
    $('#overtime-note').textContent = `月工资基数 ${money(overtime.base)} ÷ 21.75 天 ÷ 8 小时 × 对应倍数 × 加班小时数。时薪计算保留精度，各项费用最后四舍五入到分。休息日补休开关只影响休息日费用，不影响工作日和法定节假日。`;
  }
  function renderQuote(chooseNext = false) {
    const enabled = content.quotes.filter(item => item.enabled);
    $('#refresh-quote').hidden = !enabled.length;
    if (!enabled.length) { currentQuoteId = null; return; }
    const candidates = chooseNext ? enabled.filter(item => item.id !== currentQuoteId) : [];
    const next = chooseNext && candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : enabled.find(item => item.id === currentQuoteId) || enabled[0];
    currentQuoteId = next.id;
    $('#quote-text').textContent = next.text;
    $('#quote-author').textContent = next.author ? `— ${next.author}` : '';
    $('#quote-author').hidden = !next.author;
  }
  function managedActions(kind, item, index, length) {
    const label = kind === 'quote' ? '名言' : '链接';
    return `<div class="managed-actions"><button type="button" data-content-action="up" aria-label="上移${label}${index + 1}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-content-action="down" aria-label="下移${label}${index + 1}" ${index === length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-content-action="toggle">${item.enabled ? '停用' : '启用'}</button><button type="button" data-content-action="edit">编辑</button><button type="button" data-content-action="delete" class="delete-action" aria-label="删除${label}${index + 1}">删除</button></div>`;
  }
  function renderContent() {
    $('#quote-count').textContent = `${content.quotes.filter(item => item.enabled).length} / ${content.quotes.length} 已启用`;
    $('#link-count').textContent = `${content.links.filter(item => item.enabled).length} / ${content.links.length} 已启用`;
    $('#quote-list').innerHTML = content.quotes.length ? content.quotes.map((item, index) => `<article class="managed-item ${item.enabled ? '' : 'muted-item'}" data-content-kind="quote" data-content-id="${escape(item.id)}"><div class="managed-item-text"><span class="pill">${item.kind === 'wisdom' ? '人生哲理' : '名人名言'}${item.enabled ? '' : ' · 已停用'}</span><p>${escape(item.text)}</p><span class="managed-author">${escape(item.author || '未署名')}</span></div>${managedActions('quote', item, index, content.quotes.length)}</article>`).join('') : '<p class="empty-state">还没有名言，在上方添加一句吧。</p>';
    $('#link-list').innerHTML = content.links.length ? content.links.map((item, index) => `<article class="managed-item ${item.enabled ? '' : 'muted-item'}" data-content-kind="link" data-content-id="${escape(item.id)}"><div class="managed-item-text"><strong>${escape(item.name)}</strong><p>${escape(item.description)}</p><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.url)}</a>${item.enabled ? '' : '<span class="pill">已停用</span>'}</div>${managedActions('link', item, index, content.links.length)}</article>`).join('') : '<p class="empty-state">还没有外部链接，在上方添加常用工具。</p>';
    const links = content.links.filter(item => item.enabled);
    $('#external-calculators').hidden = !links.length;
    $('#external-links').innerHTML = links.map(item => `<a class="external-link-card" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer"><span><strong>${escape(item.name)}</strong><span>${escape(item.description)}</span><span class="external-domain">${escape(new URL(item.url).hostname)}</span></span>${icon('arrow-right')}</a>`).join('');
    renderQuote();
  }
  function resetContentForm(kind) {
    $(`#${kind}-form`).reset();
    $(`#${kind}-error`).textContent = '';
    $(`#save-${kind}`).textContent = kind === 'quote' ? '添加名言' : '添加链接';
    $(`#cancel-${kind}-edit`).hidden = true;
    if (kind === 'quote') editingQuoteId = null; else editingLinkId = null;
  }
  function editContentItem(kind, item) {
    if (kind === 'quote') {
      editingQuoteId = item.id;
      $('#quote-edit-text').value = item.text;
      $('#quote-edit-author').value = item.author;
      $('#quote-edit-kind').value = item.kind;
    } else {
      editingLinkId = item.id;
      $('#link-edit-name').value = item.name;
      $('#link-edit-url').value = item.url;
      $('#link-edit-description').value = item.description;
    }
    $(`#${kind}-edit-enabled`).checked = item.enabled;
    $(`#save-${kind}`).textContent = kind === 'quote' ? '保存名言' : '保存链接';
    $(`#cancel-${kind}-edit`).hidden = false;
    $(`#${kind}-error`).textContent = '';
    $(`#${kind}-form`).scrollIntoView({ block: 'center' });
    $(kind === 'quote' ? '#quote-edit-text' : '#link-edit-name').focus({ preventScroll: true });
  }
  function render() {
    result = calculate(settings, activeCity(), overtime);
    updateOptionalFields();
    if (!settings.customSocialBase) $('#socialBase').value = result.socialBase;
    if (!settings.customFundBase) $('#fundBase').value = result.fundBase;
    $('#base-help').textContent = '两个开关互相独立。关闭时按工资及城市上下限计算，开启时按填写值计算。';
    $('#bonus-preview').textContent = settings.bonusType === 'months' ? `${money(settings.salary)} × ${settings.bonusMonths} 个月 = ${money(result.yearlyBonus)}（额外奖金）` : `全年奖金 ${money(result.yearlyBonus)}，默认 12 月发放`;
    $('#gross-formula').textContent = `基础月薪 × 12${overtime.includeInSalary ? ' + 加班费' : ''}${settings.bonusEnabled ? settings.bonusType === 'months' ? ` + ${settings.bonusMonths} 个月奖金` : ' + 一次性奖金' : ' · 无年终奖'}`;
    $('#city-hint').textContent = activeCity().source === 'demo' ? '演示参数 · 请按当地政策核实' : '自定义参数 · 请确认政策有效性';
    $('#annual-net').innerHTML = metricMoney(result.annualEstimate);
    $('#annual-estimate-label').textContent = settings.includePersonalFund ? '全年预计（含单边公积金）' : '全年预计到手';
    $('#annual-estimate-note').textContent = settings.includePersonalFund ? `现金到手 ${money(result.net)} + 个人公积金 ${money(result.yearlyPersonalFund)}` : '含年终奖 · 扣除个人缴纳及个税';
    $('#personal-fund-info').textContent = `个人全年公积金 ${money(result.yearlyPersonalFund)}；开启后年度参考总额为 ${money(round(result.net + result.yearlyPersonalFund))}。`;
    const spreading = settings.spreadBonus && result.yearlyBonus > 0;
    $('#monthly-net').innerHTML = metricMoney(spreading ? round(result.net / 12) : result.wageAverage);
    $('#monthly-net').previousElementSibling.firstChild.textContent = spreading ? '月均到手（含奖金） ' : '月均到手薪资 ';
    $('#annual-gross').innerHTML = metricMoney(result.gross);
    $('#monthly-net').nextElementSibling.firstElementChild.textContent = spreading ? '奖金按月分摊，全年税额不变' : !settings.bonusEnabled ? '全年工资到手的月均值' : settings.bonusMode === 'separate' ? '不含单独计税年终奖' : '不含奖金收入，含合并计税影响';
    $('#display-settings').innerHTML = `${icon('sliders')} ${settings.includePersonalFund ? '含单边公积金' : spreading ? '奖金按月分摊' : '显示设置'}`;
    $('#spread-bonus-info').textContent = result.yearlyBonus ? `全年奖金 ${money(result.yearlyBonus)}，相关个税 ${money(result.bonusRelatedTax)}，税后奖金 ${money(round(result.yearlyBonus - result.bonusRelatedTax))}。分摊到各月时按分精度分配，全年总额保持一致。` : '当前没有启用奖金或奖金金额为零，分摊设置暂不影响结果。';
    $('.chart-foot span').textContent = spreading ? '奖金及相关个税按月分摊展示，年度总额不变；实际奖金默认 12 月发放。' : '年终奖计入 12 月；累计个税与加班费会影响每月到手金额。';
    $('#company-year').textContent = money(result.yearlyCompany);
    const fund = result.contributions.find(item => item.key === 'fund');
    $('#fund-year').textContent = money((fund.personalAmount + fund.companyAmount) * 12);
    $('#policy-date').textContent = `参数更新：${activeCity().updated.replace(/-/g, '.')}（${activeCity().source === 'demo' ? '示例录入日期' : '用户维护'}）`;
    $('#calculation-note').textContent = `${result.personal > settings.salary ? '注意：个人缴纳已超过基础月薪，请核对缴纳基数和比例。' : ''}按 2026 年全年在职、固定基础月薪、12 月发奖金测算。${overtime.includeInSalary ? `已并入全年加班费 ${money(result.yearlyOvertime)} 计税。` : ''}${spreading ? '月度结果采用奖金分摊展示口径。' : ''}${activeCity().source === 'demo' ? '当前城市为演示参数，请核实后使用。' : '当前使用用户维护的城市参数。'}${result.rows.some(row => row.wageTax < 0) ? '负税额表示估算应退额，实际退税需按年度汇算办理。' : ''}${result.net < 0 ? '到手为负时，环图仅展示非负支出组成。' : ''}`;
    renderTrend(); renderDonut(); renderTables(); renderCities(); renderBudget(); renderOvertime(); renderContent(); renderDailyDashboard();
  }
  function renderDailyDashboard() {
    $('#daily-dashboard').hidden = uiSettings.dashboardCollapsed;
    $('#daily-toggle').setAttribute('aria-expanded', String(!uiSettings.dashboardCollapsed));
    $('#daily-toggle').textContent = uiSettings.dashboardCollapsed ? '展开日期与发薪信息 ⌄' : '收起日期与发薪信息 ⌃';
    const date = new Date();
    const now = clockSnapshot(date);
    renderIncomeClock(date);
    $('#live-time').textContent = now.time;
    $('#live-time').dateTime = `${now.key}T${now.time}+08:00`;
    $('#live-date').textContent = `${now.year}年${now.month}月${now.day}日`;
    $('#live-date').dateTime = now.key;
    $('#live-weekday').textContent = now.weekdayName;
    $('#live-lunar').textContent = now.lunar.date;
    $('#live-lunar-year').textContent = now.lunar.supported ? `${now.lunar.year}${now.lunar.zodiac ? ` · ${now.lunar.zodiac}` : ''}` : '农历需要浏览器支持中国农历历法';
    $('#year-day-number').textContent = `今年第 ${now.dayOfYear} / ${now.daysInYear} 天`;
    $('#year-percentage').textContent = `${now.yearProgress.toFixed(1)}%`;
    $('#year-progress-fill').style.width = `${now.yearProgress}%`;
    const due = nextPayday(date, payday);
    $('#payday-days').textContent = due.days;
    $('#payday-label').textContent = due.today ? '天 · 今天发薪' : '天后预计发薪';
    $('#payday-next-date').textContent = `${due.year}.${String(due.month).padStart(2, '0')}.${String(due.day).padStart(2, '0')} · ${due.weekdayName}`;
    $('#payday-rule').textContent = `每月 ${payday.day} 日 · ${{ none: '周末不调整', previous: '周末提前至周五', next: '周末顺延至周一' }[payday.weekend]}${due.clamped ? ' · 本次按月末' : ''}${due.adjusted ? ' · 本次已调整' : ''}`;
  }
  function renderIncomeClock(date) {
    const clock = incomeSnapshot(date, incomeClock, result?.wageAverage || 0);
    $('#income-clock-earned').textContent = money(clock.earned);
    $('#income-clock-elapsed').textContent = formatDuration(clock.elapsed);
    $('#income-clock-rate').textContent = `¥ ${number(clock.perSecond, 4)}`;
    $('#income-clock-minute').textContent = money(clock.perSecond * 60);
    $('#income-clock-hour').textContent = money(clock.perSecond * 3600);
    $('#workday-countdown-label').textContent = { off: '今天是休息日', before: '距离开工', working: '距离下班', break: '距离下班', done: '今天已收工' }[clock.status];
    $('#workday-countdown-value').textContent = clock.status === 'off' ? '好好休息' : clock.status === 'done' ? '下班快乐' : formatDuration(clock.countdownSeconds);
    $('#workday-countdown-note').textContent = clock.status === 'off' ? '把时间留给喜欢的生活。' : `${incomeClock.start} — ${incomeClock.end} · ${clock.status === 'done' ? '今天也辛苦啦。' : '跟随秒表的班次设置'}`;
    $('#income-clock-status').textContent = { off: '休息日', before: '还没上班', working: '正在赚钱', break: '午休暂停', done: '今日已收工' }[clock.status];
    $('#income-clock-status').classList.toggle('is-working', clock.status === 'working');
    $('#income-clock-source').textContent = `${incomeClock.source === 'salary' ? '跟随月均到手' : '自定义月收入'} ${money(clock.monthly)} / 月 · 按 ${incomeClock.paidDays} 天估算`;
    $('#income-clock-goal-label').textContent = `午饭小目标 · ${money(clock.goal)}`;
    $('#income-clock-goal-percent').textContent = `${Math.floor(clock.goalProgress)}%`;
    $('#income-clock-goal-fill').style.width = `${clock.goalProgress}%`;
    const messages = { off: '今天休息，收入秒表也放个假。', before: '还没上班，先喝口水，慢慢开启今天。', break: '午休暂停计时，吃饱了再出发。', done: '今天的努力已收工，好好享受下班时间。', working: clock.goalReached ? '午饭钱已赚够，继续攒一点小快乐。' : `离午饭小目标，还差 ${money(clock.goal - clock.earned)}。` };
    $('#income-clock-message').textContent = clock.monthly ? messages[clock.status] : '当前收入基数为 0，可在设置中调整。';
  }
  const pageNames = { overview: '薪资计算器', monthly: '月度收入明细', contributions: '五险一金', tax: '个税税率表', cities: '城市参数管理', budget: '花销与结余', overtime: '加班费计算', content: '名言与链接管理', policy: '保障政策指南', mortgage: '房贷计算器', car: '车贷计算器' };
  function showPage(page, updateHash = true) {
    if (!pageNames[page]) page = 'overview';
    currentPage = page;
    $$('.view-panel').forEach(panel => { panel.hidden = panel.id !== `${page}-panel`; });
    $('#calculator-layout').hidden = ['cities', 'budget', 'overtime', 'content', 'policy', 'mortgage', 'car'].includes(page);
    $$('[data-page]').forEach(button => { const selected = button.dataset.page === page; button.classList.toggle('active', selected); if (button.getAttribute('role') === 'tab') { button.setAttribute('aria-selected', String(selected)); button.setAttribute('aria-controls', `${button.dataset.page}-panel`); button.tabIndex = selected || (['cities', 'content'].includes(page) && button.dataset.page === 'overview') ? 0 : -1; } });
    $('#breadcrumb-title').textContent = pageNames[page];
    $('#page-title').innerHTML = page === 'cities' ? '每座城市，都有自己的标准<span class="heading-dot">。</span>' : '每一份努力，都心中有数<span class="heading-dot">。</span>';
    $('#page-subtitle').textContent = page === 'cities' ? '用清晰的参数，让每一笔收入计算有据可依。' : '从税前到到手，看懂你的薪资，也规划好你的生活。';
    if (page === 'budget') { $('#page-title').textContent = '看见生活的花销，也看见积累。'; $('#page-subtitle').textContent = '给每一笔钱安排去处，让每个月的结余慢慢长大。'; }
    if (page === 'overtime') { $('#page-title').textContent = '多付出的一小时，也值得算清楚。'; $('#page-subtitle').textContent = '工作日、休息日、法定节假日，分别算明白。'; }
    if (page === 'content') { $('#page-title').textContent = '让常读的话，常用的工具，都顺手。'; $('#page-subtitle').textContent = '管理名言、人生哲理和页末链接，让这个工作台更像你的。'; }
    if (page === 'policy') { $('#page-title').textContent = '看懂每一份保障，为生活多留一份底气。'; $('#page-subtitle').textContent = '五险一金、企业年金与职业年金，慢慢读明白。'; }
    if (page === 'mortgage') { $('#page-title').textContent = '算清一套房，也算清未来的生活。'; $('#page-subtitle').textContent = '月供、利息、现金流，把这份长久的承诺看清楚。'; }
    if (page === 'car') { $('#page-title').textContent = '开走新车，也留住生活的余地。'; $('#page-subtitle').textContent = '从首付到最后一期，算清车贷与购车总支出。'; }
    if (updateHash) { history.replaceState(null, '', `#${page}`); window.scrollTo({ top: 0, behavior: 'auto' }); }
  }
  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    // Embedded browsers can start saving asynchronously after the click completes.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function openCityDialog(id) {
    editingCityId = id || null;
    const city = id ? cities.find(item => item.id === id) : cityTemplate('', '', 0, 30000, 0, 30000);
    $('#city-dialog-title').textContent = id ? `编辑${city.name}参数` : '添加城市参数';
    $('#city-name').value = city.name;
    $('#city-date').value = city.updated;
    $('#social-min').value = city.socialMin;
    $('#social-max').value = city.socialMax;
    $('#fund-min').value = city.fundMin;
    $('#fund-max').value = city.fundMax;
    $('#medical-extra').value = city.medicalExtra;
    $('#city-source').value = id ? city.source : 'custom';
    $('#rate-fields').innerHTML = city.rates.map(item => `<div class="rate-row"><span>${escape(item.name)}</span><input class="plain-input" id="rate-${item.key}-personal" aria-label="${escape(item.name)}个人比例" type="number" min="0" max="100" step=".01" value="${item.personal}" required><input class="plain-input" id="rate-${item.key}-company" aria-label="${escape(item.name)}公司比例" type="number" min="0" max="100" step=".01" value="${item.company}" required></div>`).join('');
    $('#city-error').textContent = '';
    $('#city-dialog').showModal();
  }
  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-page]'); if (nav) showPage(nav.dataset.page);
    const policyTarget = event.target.closest('[data-policy-target]');
    if (policyTarget) document.getElementById(policyTarget.dataset.policyTarget)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    const edit = event.target.closest('[data-edit-city]'); if (edit) openCityDialog(edit.dataset.editCity);
  });
  $('.tab-list').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const tabs = $$('.tab'); const index = tabs.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    showPage(tabs[next].dataset.page); tabs[next].focus();
  });
  window.addEventListener('hashchange', () => showPage(location.hash.slice(1), false));
  $('#salary-form').addEventListener('submit', event => { event.preventDefault(); if (!readForm()) return; render(); persist(); toast(storageAvailable ? '薪资已计算，设置已自动保存' : '薪资已计算，请导出配置以保存'); });
  $('#salary-form').addEventListener('change', event => {
    if (event.target.id === 'customSocialBase' && event.target.checked) $('#socialBase').value = settings.socialBase;
    if (event.target.id === 'customFundBase' && event.target.checked) $('#fundBase').value = settings.fundBase;
    if (!readForm()) return; render(); persist();
  });
  $('#reset-button').addEventListener('click', () => { settings = { ...defaults, cityId: cities.some(city => city.id === defaults.cityId) ? defaults.cityId : cities[0].id }; syncForm(); render(); persist(); toast('薪资设置已恢复默认，城市参数保留'); });
  $('#save-button').addEventListener('click', () => { if ((!['cities', 'budget', 'overtime', 'content', 'policy', 'mortgage', 'car'].includes(currentPage) && !readForm()) || (currentPage === 'overtime' && !readOvertimeForm())) return; try { if (currentPage === 'mortgage') mortgage = mortgageUI.getValue(); if (currentPage === 'car') carLoan = carLoanUI.getValue(); } catch (error) { toast(error.message); return; } render(); persist(); download(JSON.stringify(configuration(), null, 2), '知薪-个人配置.json', 'application/json'); toast('已导出全部设置，包含房贷、车贷与界面偏好'); });
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('配置文件不能超过 1 MB');
      const data = validateConfiguration(JSON.parse(await file.text()));
      useConfiguration(data); mortgageUI.setValue(mortgage); carLoanUI.setValue(carLoan); resetContentForm('quote'); resetContentForm('link'); syncForm(); syncOvertimeForm(); render(); persist(); toast('配置已导入，收入秒表及全部设置已更新');
    } catch (error) { toast(`导入失败：${error instanceof SyntaxError ? '文件不是有效的 JSON' : error.message}`); }
    finally { event.target.value = ''; }
  });
  $('#export-csv').addEventListener('click', () => {
    const spreading = settings.spreadBonus && result.yearlyBonus > 0;
    const header = ['月份', '基础工资', '加班费', spreading ? '年终奖（分摊展示）' : '年终奖', '税前合计', '个人社保', '个人公积金', spreading ? '工资个税（含分摊影响）' : '工资个税', '单独计税奖金个税', '个税合计', '到手收入'];
    const rows = result.displayRows.map(row => [row.month, row.salary, row.overtimePay, row.bonus, row.gross, row.social, row.fund, row.wageTax, row.bonusTax, row.tax, row.net]);
    rows.push(['合计', round(settings.salary * 12), result.yearlyOvertime, result.yearlyBonus, result.gross, round(result.social * 12), round(result.fund * 12), round(result.tax - result.bonusTax), result.bonusTax, result.tax, result.net]);
    download('\uFEFF' + [header, ...rows].map(row => row.join(',')).join('\r\n'), '知薪-2026月度薪资明细.csv', 'text/csv;charset=utf-8'); toast('月度明细已导出');
  });
  $('#add-city').addEventListener('click', () => openCityDialog());
  ['#close-dialog', '#cancel-dialog'].forEach(selector => $(selector).addEventListener('click', () => $('#city-dialog').close()));
  $('#city-form').addEventListener('submit', event => {
    event.preventDefault();
    const city = { id: editingCityId || `city-${Date.now()}`, name: $('#city-name').value.trim(), updated: $('#city-date').value, socialMin: +$('#social-min').value, socialMax: +$('#social-max').value, fundMin: +$('#fund-min').value, fundMax: +$('#fund-max').value, medicalExtra: +$('#medical-extra').value, source: $('#city-source').value, rates: rateNames.map(([key, name]) => ({ key, name, personal: +$(`#rate-${key}-personal`).value, company: +$(`#rate-${key}-company`).value })) };
    const nextCities = editingCityId ? cities.map(item => item.id === editingCityId ? city : item) : [...cities, city];
    try {
      const validated = validateConfiguration({ ...configuration(), cities: nextCities });
      cities = validated.cities;
      syncForm(); render(); persist(); $('#city-dialog').close(); toast(editingCityId ? '城市参数已更新，测算已同步' : '城市已添加，可在薪资设置中选择');
    } catch (error) { $('#city-error').textContent = error.message; }
  });
  $('#expense-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#expense-name').value.trim();
    if (!name) { toast('请输入花销名称'); $('#expense-name').focus(); return; }
    if (expenses.length >= 200) { toast('最多可记录 200 项花销'); return; }
    expenses.push({ id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, amount: round(+$('#expense-amount').value), month: +$('#expense-month').value });
    $('#expense-name').value = ''; $('#expense-amount').value = ''; renderBudget(); persist(); toast('花销已添加，年度结余已更新'); $('#expense-name').focus();
  });
  function updateExpense(event, reportInvalid = false) {
    const input = event.target.closest('[data-expense-field]'); if (!input) return;
    const item = expenses.find(item => item.id === input.closest('[data-expense-id]').dataset.expenseId);
    const key = input.dataset.expenseField;
    if (!input.checkValidity() || (key === 'name' && !input.value.trim())) {
      if (reportInvalid) { toast('请填写有效的名称或非负金额'); input.value = item[key]; }
      return;
    }
    item[key] = key === 'name' ? input.value.trim() : key === 'amount' ? round(+input.value) : +input.value;
    if (key === 'name') {
      const row = input.closest('[data-expense-id]');
      row.querySelectorAll('[data-expense-field]').forEach(field => field.setAttribute('aria-label', item.name + ({ name: '名称', amount: '金额', month: '月份' }[field.dataset.expenseField])));
      row.querySelector('[data-remove-expense]').setAttribute('aria-label', `删除${item.name}`);
    }
    renderBudget(false); persist();
  }
  $('#expense-list').addEventListener('input', event => updateExpense(event));
  $('#expense-list').addEventListener('change', event => updateExpense(event, true));
  $('#expense-list').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-expense]'); if (!button) return;
    expenses = expenses.filter(item => item.id !== button.dataset.removeExpense);
    renderBudget(); persist(); toast('花销已移除，结余已更新');
  });
  $('#spending-month').addEventListener('change', renderSpending);
  $('#export-budget').addEventListener('click', () => {
    const rows = [['月份', settings.spreadBonus && result.yearlyBonus ? '到手收入（奖金分摊规划）' : '到手收入', '生活花销', '本月结余', '累计结余'], ...budget.rows.map(row => [row.month, row.income, row.spending, row.saving, row.accumulated]), ['全年', result.net, budget.yearlySpending, budget.yearlySaving, budget.yearlySaving]];
    download('\uFEFF' + rows.map(row => row.join(',')).join('\r\n'), '知薪-2026收支与结余.csv', 'text/csv;charset=utf-8'); toast('全年收支明细已导出');
  });
  $('#overtime-form').addEventListener('submit', event => { event.preventDefault(); if (!readOvertimeForm()) return; render(); persist(); toast('加班费及工资测算已更新'); });
  $('#overtime-form').addEventListener('change', event => {
    if (event.target.id === 'ot-start-month') {
      const remaining = 13 - +event.target.value;
      if (+$('#ot-months').value > remaining) $('#ot-months').value = remaining;
    }
    if (!readOvertimeForm()) return; render(); persist();
  });
  $('#use-salary').addEventListener('click', () => { $('#ot-base').value = settings.salary; if (!readOvertimeForm()) return; render(); persist(); toast('已使用当前税前月薪作为加班计算基数'); });
  $('#display-settings').addEventListener('click', () => $('#display-dialog').showModal());
  $('#close-display-dialog').addEventListener('click', () => $('#display-dialog').close());
  $('#app-settings-button').addEventListener('click', () => $('#app-settings-dialog').showModal());
  ['#close-app-settings', '#done-app-settings'].forEach(selector => {
    $(selector).addEventListener('click', () => $('#app-settings-dialog').close());
  });
  $('#spreadBonus').addEventListener('change', () => { settings.spreadBonus = $('#spreadBonus').checked; render(); persist(); });
  $('#includePersonalFund').addEventListener('change', () => { settings.includePersonalFund = $('#includePersonalFund').checked; render(); persist(); });
  $('#payday-settings').addEventListener('click', () => {
    $('#payday-day').value = payday.day;
    $('#payday-weekend').value = payday.weekend;
    $('#payday-error').textContent = '';
    $('#payday-dialog').showModal();
  });
  $('#close-payday-dialog').addEventListener('click', () => $('#payday-dialog').close());
  $('#payday-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      payday = validatePayday({ day: +$('#payday-day').value, weekend: $('#payday-weekend').value });
      renderDailyDashboard(); persist(); $('#payday-dialog').close(); toast('发薪日已保存，倒计时已更新');
    } catch (error) { $('#payday-error').textContent = error.message; }
  });
  $('#refresh-quote').addEventListener('click', () => renderQuote(true));
  $('#quote-form').addEventListener('submit', event => {
    event.preventDefault();
    const item = { id: editingQuoteId || `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: $('#quote-edit-text').value.trim(), author: $('#quote-edit-author').value.trim(), kind: $('#quote-edit-kind').value, enabled: $('#quote-edit-enabled').checked };
    try {
      content = validateContent({ ...content, quotes: editingQuoteId ? content.quotes.map(old => old.id === editingQuoteId ? item : old) : [...content.quotes, item] });
      resetContentForm('quote'); renderContent(); persist(); toast('名言已保存，页脚已更新');
    } catch (error) { $('#quote-error').textContent = error.message; }
  });
  $('#link-form').addEventListener('submit', event => {
    event.preventDefault();
    const item = { id: editingLinkId || `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: $('#link-edit-name').value.trim(), url: $('#link-edit-url').value.trim(), description: $('#link-edit-description').value.trim(), enabled: $('#link-edit-enabled').checked };
    try {
      content = validateContent({ ...content, links: editingLinkId ? content.links.map(old => old.id === editingLinkId ? item : old) : [...content.links, item] });
      resetContentForm('link'); renderContent(); persist(); toast('外部链接已保存，页末已更新');
    } catch (error) { $('#link-error').textContent = error.message; }
  });
  $('#cancel-quote-edit').addEventListener('click', () => resetContentForm('quote'));
  $('#cancel-link-edit').addEventListener('click', () => resetContentForm('link'));
  $('#content-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-content-action]'); if (!button) return;
    const row = button.closest('[data-content-id]');
    const kind = row.dataset.contentKind, key = kind === 'quote' ? 'quotes' : 'links';
    const index = content[key].findIndex(item => item.id === row.dataset.contentId);
    if (index < 0) return;
    const item = content[key][index], action = button.dataset.contentAction;
    if (action === 'edit') { editContentItem(kind, item); return; }
    const items = [...content[key]];
    if (action === 'delete') {
      items.splice(index, 1);
      if ((kind === 'quote' ? editingQuoteId : editingLinkId) === item.id) resetContentForm(kind);
    } else if (action === 'toggle') items[index] = { ...item, enabled: !item.enabled };
    else {
      const target = index + (action === 'up' ? -1 : 1);
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]];
    }
    content = { ...content, [key]: items }; renderContent(); persist();
  });
  $$('.nav-item').forEach(button => { button.setAttribute('aria-label', pageNames[button.dataset.page]); button.title = pageNames[button.dataset.page]; });
  $('#expense-month').innerHTML = monthOptions(); $('#spending-month').innerHTML = monthOptions(0, true);
  $('#ot-start-month').innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1} 月</option>`).join('');
  mortgageUI = SalaryMortgageUI.init({ initial: mortgage, onChange: value => { mortgage = value; persist(); }, onExport: download, notify: toast });
  carLoanUI = SalaryCarLoanUI.init({ initial: carLoan, onChange: value => { carLoan = value; persist(); }, onExport: download, notify: toast });
  $('#project-storage-toggle').addEventListener('change', () => projectStorage.setEnabled($('#project-storage-toggle').checked));
  $('#project-storage-retry').addEventListener('click', () => projectStorage.retry());
  $('#project-storage-reload').addEventListener('click', async () => {
    $('main').inert = true;
    try {
      const data = await projectStorage.load();
      if (data) {
        useConfiguration(data); mortgageUI.setValue(mortgage); carLoanUI.setValue(carLoan); resetContentForm('quote'); resetContentForm('link');
        syncForm(); syncOvertimeForm(); render(); projectStorage.adopt(); persist(); toast('已加载项目根目录中的个人配置');
      }
    } finally { $('main').inert = false; }
  });
  window.addEventListener('pagehide', () => { projectStorage.flush(true); });
  $('#daily-toggle').addEventListener('click', () => { uiSettings.dashboardCollapsed = !uiSettings.dashboardCollapsed; renderDailyDashboard(); persist(); });
  function updateIncomeClockFields() {
    $('#income-clock-custom-field').hidden = $('#income-clock-source-select').value !== 'custom';
    $('#income-clock-monthly').disabled = $('#income-clock-source-select').value !== 'custom';
    $('#income-clock-break-fields').hidden = !$('#income-clock-break-enabled').checked;
    $('#income-clock-break-start').disabled = $('#income-clock-break-end').disabled = !$('#income-clock-break-enabled').checked;
  }
  $('#income-clock-settings').addEventListener('click', () => {
    $('#income-clock-source-select').value = incomeClock.source;
    for (const [id, key] of [['monthly', 'monthlyIncome'], ['days', 'paidDays'], ['start', 'start'], ['end', 'end'], ['break-start', 'breakStart'], ['break-end', 'breakEnd'], ['goal', 'goal']]) $(`#income-clock-${id}`).value = incomeClock[key];
    $('#income-clock-break-enabled').checked = incomeClock.breakEnabled;
    $$('#income-clock-workdays input').forEach(input => { input.checked = incomeClock.workdays.includes(+input.value); });
    $('#income-clock-error').textContent = ''; updateIncomeClockFields(); $('#income-clock-dialog').showModal();
  });
  $('#income-clock-source-select').addEventListener('change', updateIncomeClockFields);
  $('#income-clock-break-enabled').addEventListener('change', updateIncomeClockFields);
  $('#close-income-clock-dialog').addEventListener('click', () => $('#income-clock-dialog').close());
  $('#income-clock-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      incomeClock = validateIncomeClock({ source: $('#income-clock-source-select').value, monthlyIncome: +$('#income-clock-monthly').value, paidDays: +$('#income-clock-days').value,
        start: $('#income-clock-start').value, end: $('#income-clock-end').value, breakEnabled: $('#income-clock-break-enabled').checked,
        breakStart: $('#income-clock-break-start').value || defaultIncomeClock.breakStart, breakEnd: $('#income-clock-break-end').value || defaultIncomeClock.breakEnd, goal: +$('#income-clock-goal').value,
        workdays: $$('#income-clock-workdays input:checked').map(input => +input.value) });
      renderDailyDashboard(); persist(); $('#income-clock-dialog').close(); toast('收入秒表已保存，按新的班次重新估算');
    } catch (error) { $('#income-clock-error').textContent = error.message; }
  });
  renderIcons(); syncForm(); syncOvertimeForm(); render(); persist(); showPage(location.hash.slice(1) || 'overview', false);
  setInterval(renderDailyDashboard, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderDailyDashboard(); });
  window.addEventListener('pageshow', renderDailyDashboard);
  if (loadWarning) toast(loadWarning);
})();
