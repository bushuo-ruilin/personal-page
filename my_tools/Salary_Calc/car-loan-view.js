(function () {
  'use strict';
  const { defaultCarLoan, calculateCarLoan } = SalaryCarLoan;
  const { factor, toYuan, fromYuan, mountMonthPicker, axisControls, bindAxis, resolveAxis, chartSvg } = SalaryLoanTools;
  const cash = value => `¥ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const field = (key, label, max, unit = '元', step = '.01') => `<label class="mortgage-field">${label}<small${key === 'price' ? ' data-car-unit' : ''}>${unit}</small><input class="plain-input" name="${key}" type="number" min="${key === 'months' ? 1 : 0}" max="${max}" step="${step}" required></label>`;
  const select = (key, label, options) => `<label class="mortgage-field">${label}<select class="plain-input" name="${key}">${options.map(([v, text]) => `<option value="${v}">${text}</option>`).join('')}</select></label>`;
  window.SalaryCarLoanUI = { init({ initial, onChange, onExport, notify }) {
    const root = document.getElementById('car-panel');
    root.innerHTML = `<div class="mortgage-intro"><span class="eyebrow">A NEW RIDE. A CLEAR PLAN.</span><p>看得清月供，也算得清开走这辆车的全部支出。</p><span class="pill">独立测算 · 参数可改</span></div>
      <div class="mortgage-layout"><form id="car-form" class="card mortgage-settings" novalidate>
        <div class="card-title"><h2><i data-icon="car"></i> 车贷设置</h2><span class="micro-label">YOUR NEXT RIDE</span></div>
        ${select('amountUnit', '车价金额单位', [['wan', '万元'], ['yuan', '元']])}${field('price', '裸车价格', 1e9)}${field('downPercent', '首付比例', 100, '%')}
        ${field('months', '贷款期数', 120, '个月', 1)}<p class="mortgage-help">常用期数：${[12, 24, 36, 60].map(n => `<button type="button" class="text-button" data-car-term="${n}">${n} 期</button>`).join(' / ')}</p>
        <div class="mortgage-field"><span>首次还款月份</span><div id="car-month-picker"></div></div>
        ${select('mode', '计息方式', [['apr', '按剩余本金 · 年利率'], ['flat', '按初始本金 · 月费率'], ['zero', '零利息 · 另列手续费']])}
        <div data-car-mode="apr">${field('annualRate', '贷款年利率', 100, '%', '.001')}${select('method', '还款方式', [['annuity', '等额本息'], ['principal', '等额本金']])}</div>
        <div data-car-mode="flat">${field('monthlyFeeRate', '每月固定费率', 10, '%', '.001')}<p class="mortgage-help">每月费用 = 初始贷款本金 × 月费率，不随剩余本金减少。月费率 × 12 不等于真实年化成本。</p></div>
        <details class="car-extra-fees"><summary>购车的其他一次性费用</summary>${field('serviceFee', '贷款手续费（首付时支付）', 1e9)}${field('purchaseTax', '购置税（自行填写）', 1e9)}${field('insurance', '首年保费', 1e9)}${field('registration', '上牌及其他费用', 1e9)}</details>
        <p class="mortgage-help">车价、利率及费用均为可编辑的演示参数，不自动套用税收优惠或金融方案。</p><p id="car-error" class="form-error" role="alert"></p><button class="button primary mortgage-calculate" type="submit">计算车贷与购车总支出 ↗</button><button class="reset-button" id="car-reset" type="button">恢复车贷演示参数</button>
      </form><div class="mortgage-results"><p id="car-stale" class="form-error" role="status" hidden>参数尚未通过校验，以下保留上次有效结果。</p>
        <article class="mortgage-hero car-hero"><div><span class="eyebrow">THE COST OF A NEW RIDE</span><h2 id="car-payment-label"></h2><strong id="car-payment"></strong><p id="car-payment-note"></p></div><div class="mortgage-duration"><span id="car-term"></span><small id="car-date-range"></small></div></article>
        <div class="mortgage-metrics"><article class="card"><span>贷款本金</span><strong id="car-principal"></strong></article><article class="card"><span>利息 / 分期费用合计</span><strong id="car-interest"></strong></article><article class="card"><span>贷款本息合计</span><strong id="car-repayment"></strong></article></div>
        <article class="card mortgage-pressure"><div class="card-title"><h2>从首付，到最后一期</h2></div><div class="mortgage-pressure-grid"><div><span>提车时支付（含一次性费用）</span><strong id="car-upfront"></strong></div><div><span>购车总支出（含贷款费用）</span><strong id="car-total-cost"></strong></div><div><span>融资成本（利息 / 分期费 + 手续费）</span><strong id="car-finance-cost"></strong></div><div><span>含手续费的有效年化估算</span><strong id="car-effective-apr"></strong></div></div><p class="mortgage-help" id="car-cost-note"></p><p class="mortgage-help">有效年化按贷款本金扣除一次性贷款手续费后的净额、各月还款现金流计算，不含购置税、保费等购车费用。未计日常油电、停车、保养或续保支出。</p></article>
        <article class="card mortgage-chart-card"><div class="card-title"><h2>车贷还款曲线</h2><label class="sr-only" for="car-curve">车贷曲线指标</label><select class="plain-input" id="car-curve"><option value="payment">每月还款</option><option value="balance">剩余本金</option><option value="cumulativeInterest">累计利息 / 分期费</option></select></div>${axisControls('car')}<div class="mortgage-legend" id="car-legend"></div><div class="loan-chart" id="car-chart"></div><p class="mortgage-help" id="car-chart-clipped" hidden>部分曲线超出手动刻度范围，已裁切显示。</p><label class="mortgage-slider-label" for="car-month">拖动查看还款期数 <strong id="car-month-label"></strong></label><input class="loan-month-range" id="car-month" type="range" min="1" max="36" value="1"><div class="mortgage-readout" id="car-readout" aria-live="polite"></div></article>
      </div></div><article class="card mortgage-details"><div class="card-title"><div><h2>车贷逐月还款明细</h2><p id="car-detail-note"></p></div><button class="button secondary" type="button" id="car-export">导出完整 CSV</button></div><div class="table-scroll"><table><thead><tr><th>期数 / 还款月份</th><th>当期月供</th><th>偿还本金</th><th>利息 / 分期费用</th><th>剩余本金</th><th>累计利息 / 分期费用</th></tr></thead><tbody id="car-rows"></tbody></table></div><p class="detail-note">按月计息并按分取整，末期结清本金尾差。月费率方案每期按原始本金收取固定费用；手续费及其他一次性费用单独计入提车支出。实际支付以合同为准。</p></article>`;
    const $ = selector => root.querySelector(selector), form = $('#car-form');
    let current, calculated, displayedUnit = initial.amountUnit;
    const picker = mountMonthPicker($('#car-month-picker'), { name: 'startMonth', value: initial.startMonth });
    const axis = bindAxis(root, 'car', { getMetric: () => $('#car-curve').value, getScales: () => current.chartScales, onSave: () => onChange(current), onRender: renderChart });
    function unit() {
      const next = form.elements.amountUnit.value, input = form.elements.price;
      if (next !== displayedUnit && input.value.trim()) input.value = fromYuan(toYuan(+input.value, displayedUnit), next);
      displayedUnit = next; input.max = 1e9 / factor(next); input.step = next === 'wan' ? '.000001' : '.01';
      $('[data-car-unit]').textContent = next === 'wan' ? '万元' : '元';
    }
    function updateFields() {
      root.querySelectorAll('[data-car-mode]').forEach(group => { group.hidden = group.dataset.carMode !== form.elements.mode.value; });
      form.querySelectorAll('input,select').forEach(el => { el.disabled = Boolean(el.closest('[data-car-mode][hidden]')); });
    }
    function sync(value) {
      current = { ...value, chartScales: JSON.parse(JSON.stringify(value.chartScales)) }; displayedUnit = value.amountUnit;
      for (const [key] of Object.entries(defaultCarLoan)) { const el = form.elements.namedItem(key); if (el) el.value = key === 'price' ? fromYuan(value[key], value.amountUnit) : value[key]; }
      picker.setValue(value.startMonth); unit(); updateFields(); axis.sync();
    }
    function read() {
      const value = { ...current };
      for (const [key, sample] of Object.entries(defaultCarLoan)) { const el = form.elements.namedItem(key); if (!el) continue; value[key] = typeof sample === 'number' ? (el.value.trim() ? +el.value : NaN) : el.value; }
      value.price = toYuan(value.price, displayedUnit); return value;
    }
    function calculate(save = true, interactive = true) {
      unit(); updateFields();
      try {
        if (!form.checkValidity()) { if (interactive) { if ($('.car-extra-fees').querySelector(':invalid')) $('.car-extra-fees').open = true; form.reportValidity(); } $('#car-stale').hidden = false; return false; }
        calculated = calculateCarLoan(read()); current = calculated.settings; $('#car-error').textContent = ''; $('#car-stale').hidden = true;
        render(); if (save) onChange(current); return true;
      } catch (error) { $('#car-error').textContent = error.message; $('#car-stale').hidden = false; return false; }
    }
    function render() {
      const c = calculated, s = c.selected;
      $('#car-payment-label').textContent = current.mode === 'flat' ? '每月还款 · 固定月费率' : current.mode === 'zero' ? '每月还款 · 零利息' : current.method === 'annuity' ? '每月还款 · 等额本息' : '首月还款 · 等额本金';
      $('#car-payment').textContent = cash(s.firstPayment); $('#car-payment-note').textContent = `末期 ${cash(s.lastPayment)} · 首付本金 ${cash(c.downPayment)}`;
      $('#car-term').textContent = `${current.months} 期 / ${Number((current.months / 12).toFixed(2))} 年`;
      $('#car-date-range').textContent = `${current.startMonth} → ${s.rows[s.rows.length - 1].date}`;
      for (const [id, value] of Object.entries({ principal: c.principal, interest: s.totalInterest, repayment: s.totalPayment, upfront: c.upfront, 'total-cost': c.totalCost, 'finance-cost': c.financeCost })) $(`#car-${id}`).textContent = cash(value);
      $('#car-effective-apr').textContent = c.effectiveApr === null ? '不适用' : c.effectiveApr > 9999 ? '> 9999%' : `${c.effectiveApr.toFixed(2)}%`;
      $('#car-cost-note').textContent = `裸车 ${cash(c.price)}；首付本金 ${cash(c.downPayment)}，手续费 ${cash(current.serviceFee)}，购置税 ${cash(current.purchaseTax)}，首年保费 ${cash(current.insurance)}，上牌及其他 ${cash(current.registration)}。${!c.principal ? '当前为全款购车，无贷款月供。' : c.effectiveApr === null ? '手续费不低于贷款本金，无法按净到账金额计算年化。' : ''}`;
      $('#car-month').max = current.months; $('#car-month').value = Math.min(+$('#car-month').value, current.months); renderChart();
      $('#car-detail-note').textContent = `${$('#car-payment-label').textContent} · 共 ${current.months} 期`;
      $('#car-rows').innerHTML = s.rows.map(row => `<tr><td>${row.month} / ${row.date}</td>${['payment', 'principal', 'interest', 'balance', 'cumulativeInterest'].map(key => `<td>${cash(row[key])}</td>`).join('')}</tr>`).join('');
    }
    function renderChart() {
      const metric = $('#car-curve').value, index = +$('#car-month').value - 1;
      const series = Object.entries(calculated.schedules).map(([key, schedule], i) => ({ rows: schedule.rows, color: i ? '#b28a50' : '#356d52', name: key === 'annuity' ? '等额本息' : key === 'principal' ? '等额本金' : current.mode === 'flat' ? '月费率方案' : '零利息方案' }));
      const bounds = resolveAxis(series.flatMap(s => s.rows.map(row => row[metric])), current.chartScales[metric]);
      axis.showBounds(bounds);
      $('#car-chart').innerHTML = chartSvg({ id: 'car-plot', series, metric, index, axis: bounds }); $('#car-chart-clipped').hidden = !bounds.clipped;
      $('#car-legend').innerHTML = series.map(s => `<span><b></b>${s.name}</span>`).join('') + '<small>单位：元</small>';
      $('#car-month-label').textContent = `第 ${index + 1} 期 · ${series[0].rows[index].date}`;
      $('#car-readout').innerHTML = series.map(s => `<div><span>${s.name}</span><strong>${cash(s.rows[index][metric])}</strong><small>本金 ${cash(s.rows[index].principal)} · 利息 / 费用 ${cash(s.rows[index].interest)}</small></div>`).join('');
    }
    form.addEventListener('input', () => calculate(true, false)); form.addEventListener('change', () => calculate(true, false));
    form.addEventListener('submit', event => { event.preventDefault(); if (calculate()) notify('车贷已计算并保存'); });
    root.addEventListener('click', event => { const term = event.target.closest('[data-car-term]'); if (term) { form.elements.months.value = term.dataset.carTerm; calculate(); } });
    $('#car-reset').addEventListener('click', () => { sync(defaultCarLoan); calculate(); notify('车贷设置已恢复演示参数'); });
    $('#car-curve').addEventListener('change', () => { axis.sync(); renderChart(); }); $('#car-month').addEventListener('input', renderChart);
    $('#car-export').addEventListener('click', () => { if (!calculate()) return; const rows = calculated.selected.rows.map(row => [row.month, row.date, ...['payment', 'principal', 'interest', 'balance', 'cumulativeInterest'].map(key => row[key].toFixed(2))]); onExport('\uFEFF' + [['期数', '还款月份', '当期月供', '偿还本金', '利息或分期费用', '剩余本金', '累计利息或费用'], ...rows].map(row => row.join(',')).join('\r\n'), '知薪-车贷还款明细.csv', 'text/csv;charset=utf-8'); notify('车贷全部还款明细已导出'); });
    sync(initial); calculate(false);
    return { setValue(value) { sync(value); calculate(false); }, getValue() { if (!calculate(false)) throw new Error('请先修正车贷设置'); return { ...current }; } };
  } };
})();
