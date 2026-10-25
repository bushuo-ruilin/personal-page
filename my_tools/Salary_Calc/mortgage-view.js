(function () {
  'use strict';
  const { defaultMortgage, calculateMortgage } = SalaryMortgage;
  const { factor, toYuan, fromYuan, mountMonthPicker, axisControls, bindAxis, resolveAxis, chartSvg } = SalaryLoanTools;
  const amountKeys = ['commercialAmount', 'fundAmount', 'housePrice'];
  const cash = value => `¥ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const methodName = method => method === 'annuity' ? '等额本息' : '等额本金';
  const field = (key, label, min, max, step = '0.01', unit = '') => `<label class="mortgage-field">${label}${unit ? `<small>${unit}</small>` : ''}<input class="plain-input" name="${key}" type="number" min="${min}" max="${max}" step="${step}" required></label>`;
  const select = (key, label, choices) => `<label class="mortgage-field">${label}<select class="plain-input" name="${key}">${choices.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
  const amountField = (key, label) => field(key, label, 0, 1e9, '.01', '元').replace('<small>', '<small data-loan-unit>');
  window.SalaryMortgageUI = { init({ initial, onChange, onExport, notify }) {
    const root = document.getElementById('mortgage-panel');
    root.innerHTML = `
      <div class="mortgage-intro"><span class="eyebrow">A HOME. A LONG COMMITMENT.</span><p>一套房的价格，看总价；一笔贷款的重量，看未来每一个月。</p><span class="pill">本地测算 · 参数可改 · 无需登录</span></div>
      <div class="mortgage-layout">
        <form id="mortgage-form" class="card mortgage-settings" novalidate>
          <div class="card-title"><h2><i data-icon="home"></i> 房贷设置</h2><span class="micro-label">YOUR NUMBERS</span></div>
          ${select('type', '贷款类型', [['commercial', '商业贷款'], ['fund', '公积金贷款'], ['combined', '组合贷款']])}
          ${select('inputMode', '贷款金额计算方式', [['amount', '直接输入贷款金额'], ['total', '房屋总价 × 首付比例'], ['area', '房屋单价 × 面积']])}
          ${select('amountUnit', '房价与贷款金额单位', [['wan', '万元 · 100 = 100 万元'], ['yuan', '元 · 1000000 = 100 万元']])}
          <div data-loan-group="total">${amountField('housePrice', '房屋总价')}</div>
          <div data-loan-group="area" class="mortgage-form-grid">${field('unitPrice', '房屋单价', 0, 1e9, '.01', '元 / ㎡')}${field('area', '建筑面积', '.01', 100000, '.01', '㎡')}</div>
          <div data-loan-group="property">${field('downPercent', '首付比例', 0, 100, '.01', '%')}</div>
          <div data-loan-group="commercialAmount">${amountField('commercialAmount', '商业贷款金额')}</div>
          <div data-loan-group="fundAmount">${amountField('fundAmount', '公积金贷款金额')}</div>
          <p class="mortgage-help" id="mortgage-derived"></p>
          ${field('months', '贷款期数', 1, 600, 1, '个月')}<div class="mortgage-field"><span>首次还款月份</span><div id="mortgage-month-picker"></div></div>
          <p class="mortgage-help">常用期数：<button type="button" class="text-button" data-loan-term="120">10 年</button> / <button type="button" class="text-button" data-loan-term="240">20 年</button> / <button type="button" class="text-button" data-loan-term="360">30 年</button></p>
          <div data-loan-group="commercialRate">
            ${select('rateMode', '商贷利率设置', [['direct', '直接填写年利率'], ['lpr', 'LPR + 加点']])}
            <div data-loan-group="direct">${field('commercialRate', '商贷年利率', 0, 30, '.001', '%')}</div>
            <div data-loan-group="lpr" class="mortgage-form-grid">${field('lpr', 'LPR', 0, 30, '.001', '%')}${field('basisPoints', '加点 / 减点', -3000, 3000, '.1', 'BP')}</div>
          </div>
          <div data-loan-group="fundRate">${field('fundRate', '公积金年利率', 0, 30, '.001', '%')}</div>
          <p class="mortgage-help">利率默认值仅为演示，可改为合同参数。1 BP = 0.01 个百分点；本页按所填利率全程不变测算，不自动调整 LPR。</p>
          ${select('method', '当前查看的还款方式', [['annuity', '等额本息 · 月供基本固定'], ['principal', '等额本金 · 月供逐月减少']])}
          <button class="button secondary loan-settings-button" id="mortgage-income-toggle" type="button" aria-haspopup="dialog" aria-controls="mortgage-income-dialog">收入、花销与提醒 <span>设置 ↗</span></button>
          <dialog id="mortgage-income-dialog" aria-labelledby="mortgage-income-title"><div class="dialog-heading"><h2 id="mortgage-income-title">收入、花销与我的提醒</h2><button class="icon-button" type="button" data-close-income aria-label="关闭收支与提醒设置">×</button></div><div class="dialog-body"><p class="mortgage-help">修改后即时保存。独立填写家庭现金流，不自动计入「花销与结余」，避免重复记账。</p><div class="mortgage-form-grid">
            ${field('monthlyIncome', '家庭每月到手收入', 0, 1e9, '.01', '元')}${field('livingCosts', '每月其他花销（不含房贷）', 0, 1e9, '.01', '元')}
            ${field('emergencySavings', '可动用的应急存款', 0, 1e9, '.01', '元')}${field('incomeDrop', '模拟收入下降', 0, 100, '.1', '%')}
            </div><label class="mortgage-check"><input name="showReminder" type="checkbox"> 显示我的购房提醒</label>
            <label class="mortgage-field">提醒内容<textarea class="plain-input" name="reminder" maxlength="300" rows="4"></textarea></label>
          </div><div class="dialog-footer"><button class="button primary" type="button" data-close-income>完成设置</button></div></dialog>
          <p id="mortgage-error" class="form-error" role="alert"></p>
          <button class="button primary mortgage-calculate" type="submit">计算房贷与现金流 ↗</button>
          <button class="reset-button" id="mortgage-reset" type="button">恢复房贷演示参数</button>
        </form>
        <div class="mortgage-results">
          <p id="mortgage-stale" class="form-error" role="status" hidden>参数尚未通过校验，以下保留上次有效结果。请检查左侧填写内容。</p>
          <article class="mortgage-hero"><div><span class="eyebrow">THE MONTHLY COMMITMENT</span><h2 id="mortgage-payment-label">每月还款</h2><strong id="mortgage-payment"></strong><p id="mortgage-payment-note"></p></div><div class="mortgage-duration"><span id="mortgage-years"></span><small id="mortgage-end"></small></div></article>
          <div class="mortgage-metrics"><article class="card"><span>贷款本金</span><strong id="mortgage-principal"></strong></article><article class="card"><span>累计利息</span><strong id="mortgage-interest"></strong></article><article class="card"><span>本息合计</span><strong id="mortgage-total"></strong></article></div>
          <div class="mortgage-comparison" id="mortgage-comparison" aria-label="两种还款方式对比"></div>
          <article class="card mortgage-chart-card"><div class="card-title"><h2>把未来，画成曲线</h2><label class="sr-only" for="mortgage-curve">曲线指标</label><select class="plain-input" id="mortgage-curve"><option value="payment">每月还款</option><option value="balance">剩余本金</option><option value="cumulativeInterest">累计利息</option></select></div>${axisControls('mortgage')}<div class="mortgage-legend"><span><b></b>等额本息</span><span><b></b>等额本金</span><small>单位：元</small></div><div id="mortgage-chart"></div><p class="mortgage-help" id="mortgage-chart-clipped" hidden>部分曲线超出手动刻度范围，已裁切显示。</p><label class="mortgage-slider-label" for="mortgage-month">拖动查看某个月 <strong id="mortgage-month-label"></strong></label><input type="range" id="mortgage-month" min="1" max="360" value="1"><div id="mortgage-month-readout" class="mortgage-readout" aria-live="polite"></div></article>
          <article class="mortgage-reminder" id="mortgage-reminder"><span class="eyebrow">A NOTE TO MY FUTURE SELF</span><h2 id="mortgage-reminder-text"></h2><p id="mortgage-commitment"></p></article>
          <article class="card mortgage-pressure"><div class="card-title"><h2>房贷之后，生活还剩多少？</h2><button type="button" class="text-button" id="mortgage-edit-income">修改收支 ↗</button></div><div class="mortgage-pressure-grid"><div><span>最高月供 / 月收入</span><strong id="mortgage-ratio"></strong></div><div><span>月收入 − 花销 − 最高月供</span><strong id="mortgage-remaining"></strong></div><div><span id="mortgage-stress-label"></span><strong id="mortgage-stress"></strong></div><div><span>零收入时，存款可维持</span><strong id="mortgage-buffer"></strong></div></div><p class="mortgage-help" id="mortgage-cashflow-note"></p></article>
        </div>
      </div>
      <article class="card mortgage-details"><div class="card-title"><div><h2>每一笔还款，都有去处</h2><p id="mortgage-detail-note"></p></div><div class="mortgage-table-actions"><label class="sr-only" for="mortgage-year">筛选还款年份</label><select class="plain-input" id="mortgage-year"></select><button class="button secondary" type="button" id="mortgage-export">导出完整 CSV</button></div></div><div class="table-scroll"><table><thead><tr><th>期数 / 还款月份</th><th>月供合计</th><th>偿还本金</th><th>当期利息</th><th>剩余本金</th><th>商贷月供</th><th>公积金月供</th></tr></thead><tbody id="mortgage-rows"></tbody></table></div><p class="detail-note">按月计息、每期金额精确到分，末期结清尾差；组合贷款的两部分使用相同期数。未计入税费、装修、保险、提前还款及后续利率调整，实际还款以合同和银行账单为准。</p></article>`;
    const $ = selector => root.querySelector(selector);
    const form = $('#mortgage-form');
    let current, calculated, displayedUnit = initial.amountUnit;
    const monthPicker = mountMonthPicker($('#mortgage-month-picker'), { name: 'startMonth', value: initial.startMonth });
    const axis = bindAxis(root, 'mortgage', { getMetric: () => $('#mortgage-curve').value, getScales: () => current.chartScales, onSave: () => onChange(current), onRender: renderChart });
    function syncUnit() {
      const next = form.elements.amountUnit.value;
      if (next !== displayedUnit) {
        for (const key of amountKeys) { const el = form.elements.namedItem(key); if (el.value.trim()) el.value = fromYuan(toYuan(Number(el.value), displayedUnit), next); }
      }
      displayedUnit = next;
      root.querySelectorAll('[data-loan-unit]').forEach(el => { el.textContent = next === 'wan' ? '万元' : '元'; });
      for (const key of amountKeys) { form.elements.namedItem(key).max = 1e9 / factor(next); form.elements.namedItem(key).step = next === 'wan' ? '.000001' : '.01'; }
    }
    function sync(value) {
      current = { ...value, chartScales: JSON.parse(JSON.stringify(value.chartScales)) }; displayedUnit = value.amountUnit;
      for (const key of Object.keys(defaultMortgage)) {
        const el = form.elements.namedItem(key);
        if (!el) continue;
        if (el.type === 'checkbox') el.checked = value[key]; else el.value = amountKeys.includes(key) ? fromYuan(value[key], value.amountUnit) : value[key];
      }
      monthPicker.setValue(value.startMonth); syncUnit(); updateFields(); axis.sync();
    }
    function updateFields() {
      const get = name => form.elements.namedItem(name).value;
      const type = get('type'), mode = get('inputMode');
      const groups = { total: mode === 'total', area: mode === 'area', property: mode !== 'amount',
        commercialAmount: mode === 'amount' && type !== 'fund', fundAmount: type !== 'commercial' && (mode === 'amount' || type === 'combined'),
        commercialRate: type !== 'fund', direct: type !== 'fund' && get('rateMode') === 'direct',
        lpr: type !== 'fund' && get('rateMode') === 'lpr', fundRate: type !== 'commercial' };
      root.querySelectorAll('[data-loan-group]').forEach(group => { group.hidden = !groups[group.dataset.loanGroup]; });
      form.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = Boolean(el.closest('[data-loan-group][hidden]')); });
    }
    function read() {
      const value = { ...current };
      for (const [key, defaultValue] of Object.entries(defaultMortgage)) {
        const el = form.elements.namedItem(key);
        if (!el) continue;
        value[key] = typeof defaultValue === 'boolean' ? el.checked : typeof defaultValue === 'number' ? (el.value.trim() === '' ? NaN : Number(el.value)) : el.value;
        if (amountKeys.includes(key)) value[key] = toYuan(value[key], displayedUnit);
      }
      return value;
    }
    function calculate(save = true, interactive = true) {
      syncUnit(); updateFields();
      try {
        if (!form.checkValidity()) { if (interactive) { const dialog = $('#mortgage-income-dialog'); if (dialog.querySelector(':invalid') && !dialog.open) dialog.showModal(); form.reportValidity(); } $('#mortgage-stale').hidden = false; return false; }
        calculated = calculateMortgage(read()); current = calculated.settings;
        $('#mortgage-error').textContent = '';
        $('#mortgage-stale').hidden = true;
        render(); if (save) onChange(current); return true;
      } catch (error) { $('#mortgage-error').textContent = error.message; $('#mortgage-stale').hidden = false; return false; }
    }
    function render() {
      const { parts, selected, schedules, endMonth, pressure } = calculated;
      $('#mortgage-derived').textContent = `${parts.downPayment === null ? '' : `首付 ${cash(parts.downPayment)} · `}贷款合计 ${cash(parts.principal)}${parts.commercial ? ` · 商贷 ${current.type === 'combined' ? cash(parts.commercial) + ' / ' : ''}${parts.commercialRate}%` : ''}${parts.fund ? ` · 公积金 ${current.type === 'combined' ? cash(parts.fund) + ' / ' : ''}${parts.fundRate}%` : ''}`;
      $('#mortgage-payment-label').textContent = current.method === 'annuity' ? '每月还款 · 等额本息' : '首月还款 · 等额本金';
      $('#mortgage-payment').textContent = cash(selected.firstPayment);
      $('#mortgage-payment-note').textContent = `末期 ${cash(selected.lastPayment)}${current.method === 'principal' ? ' · 本金基本相同，利息逐月递减' : ' · 月供基本固定，末期结清尾差'}`;
      $('#mortgage-years').textContent = `${Number((current.months / 12).toFixed(2))} 年 / ${current.months} 期`;
      $('#mortgage-end').textContent = `${current.startMonth} → ${endMonth}`;
      $('#mortgage-principal').textContent = cash(parts.principal); $('#mortgage-interest').textContent = cash(selected.totalInterest); $('#mortgage-total').textContent = cash(selected.totalPayment);
      $('#mortgage-comparison').innerHTML = ['annuity', 'principal'].map(method => {
        const s = schedules[method];
        return `<button type="button" class="card mortgage-method ${current.method === method ? 'selected' : ''}" data-loan-method="${method}" aria-pressed="${current.method === method}"><span>${methodName(method)} <small>${current.method === method ? '当前查看 ✓' : '点击查看 ↗'}</small></span><strong>${cash(s.firstPayment)}<small>首月</small></strong><p>总利息 ${cash(s.totalInterest)}</p><p>${method === 'annuity' ? '前期月供相对较低' : `比等额本息少付利息 ${cash(calculated.interestSaving)}`}</p></button>`;
      }).join('');
      $('#mortgage-month').max = current.months; $('#mortgage-month').value = Math.min(+$('#mortgage-month').value, current.months);
      renderChart();
      $('#mortgage-reminder').hidden = !current.showReminder;
      $('#mortgage-reminder-text').textContent = current.reminder.trim() || '记得给未来的自己，留一点自由。';
      $('#mortgage-commitment').textContent = `${current.months} 个月的承诺，${cash(selected.totalInterest)} 的利息。先看清现金流，再决定把多少未来交给这套房。`;
      $('#mortgage-ratio').textContent = pressure.ratio === null ? '无收入，无法计算' : `${pressure.ratio.toFixed(1)}%`;
      $('#mortgage-remaining').textContent = cash(pressure.remaining); $('#mortgage-stress').textContent = cash(pressure.stressedRemaining);
      $('#mortgage-stress-label').textContent = `收入下降 ${current.incomeDrop}% 后月结余`;
      $('#mortgage-buffer').textContent = `${pressure.bufferMonths.toFixed(1)} 个月`;
      ['remaining', 'stress'].forEach((key, i) => $(`#mortgage-${key}`).classList.toggle('negative', (i ? pressure.stressedRemaining : pressure.remaining) < 0));
      $('#mortgage-cashflow-note').textContent = `按最高月供保守估算；家庭月收入 ${cash(current.monthlyIncome)}，其他月花销 ${cash(current.livingCosts)}，应急存款 ${cash(current.emergencySavings)}。存款未扣除首付，请填购房后可用余额；未假定投资收益或房价涨跌。`;
      const year = $('#mortgage-year').value;
      const years = [...new Set(selected.rows.map(row => row.date.slice(0, 4)))];
      $('#mortgage-year').innerHTML = '<option value="all">全部年份</option>' + years.map(y => `<option value="${y}">${y} 年</option>`).join('');
      if (years.includes(year)) $('#mortgage-year').value = year;
      $('#mortgage-detail-note').textContent = `${methodName(current.method)} · 共 ${current.months} 期 · 表格可滚动，导出包含全部月份`;
      renderRows();
    }
    function renderChart() {
      const metric = $('#mortgage-curve').value, index = +$('#mortgage-month').value - 1;
      const sets = ['annuity', 'principal'].map(method => calculated.schedules[method].rows);
      const bounds = resolveAxis(sets.flatMap(rows => rows.map(row => row[metric])), current.chartScales[metric]);
      axis.showBounds(bounds);
      $('#mortgage-chart').innerHTML = chartSvg({ id: 'mortgage-plot', metric, index, axis: bounds, series: sets.map((rows, i) => ({ rows, color: i ? '#b28a50' : '#356d52' })) });
      $('#mortgage-chart-clipped').hidden = !bounds.clipped;
      $('#mortgage-month-label').textContent = `第 ${index + 1} 期 · ${sets[0][index].date}`;
      $('#mortgage-month-readout').innerHTML = sets.map((rows, i) => `<div><span>${methodName(i ? 'principal' : 'annuity')}</span><strong>${cash(rows[index][metric])}</strong><small>本期本金 ${cash(rows[index].principal)} · 利息 ${cash(rows[index].interest)}</small></div>`).join('');
    }
    function renderRows() {
      const year = $('#mortgage-year').value;
      $('#mortgage-rows').innerHTML = calculated.selected.rows.filter(row => year === 'all' || row.date.startsWith(year)).map(row => `<tr><td>${row.month} / ${row.date}</td>${['payment', 'principal', 'interest', 'balance', 'commercialPayment', 'fundPayment'].map(key => `<td>${cash(row[key])}</td>`).join('')}</tr>`).join('');
    }
    form.addEventListener('submit', event => { event.preventDefault(); if (calculate()) notify('房贷已重新计算，参数已保存到本地'); });
    form.addEventListener('input', () => calculate(true, false));
    form.addEventListener('change', () => calculate(true, false));
    root.addEventListener('click', event => {
      const term = event.target.closest('[data-loan-term]'), method = event.target.closest('[data-loan-method]');
      if (term) { form.elements.months.value = term.dataset.loanTerm; calculate(); }
      if (method) { form.elements.method.value = method.dataset.loanMethod; calculate(); }
    });
    $('#mortgage-reset').addEventListener('click', () => { sync(defaultMortgage); calculate(); notify('房贷设置已恢复演示参数'); });
    function openIncome() { $('#mortgage-income-dialog').showModal(); }
    $('#mortgage-edit-income').addEventListener('click', openIncome);
    $('#mortgage-income-toggle').addEventListener('click', openIncome);
    root.querySelectorAll('[data-close-income]').forEach(button => button.addEventListener('click', () => $('#mortgage-income-dialog').close()));
    $('#mortgage-curve').addEventListener('change', () => { axis.sync(); renderChart(); }); $('#mortgage-month').addEventListener('input', renderChart); $('#mortgage-year').addEventListener('change', renderRows);
    $('#mortgage-export').addEventListener('click', () => {
      if (!calculate()) return;
      const header = ['期数', '还款月份', '月供合计', '偿还本金', '当期利息', '剩余本金', '商贷月供', '公积金月供', '累计利息'];
      const rows = calculated.selected.rows.map(r => [r.month, r.date, ...['payment', 'principal', 'interest', 'balance', 'commercialPayment', 'fundPayment', 'cumulativeInterest'].map(key => r[key].toFixed(2))]);
      onExport('\uFEFF' + [header, ...rows].map(row => row.join(',')).join('\r\n'), `知薪-房贷${methodName(current.method)}明细.csv`, 'text/csv;charset=utf-8'); notify('完整房贷还款明细已导出');
    });
    sync(initial); calculate(false);
    return { setValue(value) { sync(value); calculate(false); }, getValue() { if (!calculate(false)) throw new Error('请先修正房贷设置'); return { ...current }; } };
  } };
})();
