(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SalaryLoanTools = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const factor = unit => unit === 'wan' ? 10000 : 1;
  const toYuan = (value, unit) => Math.round((value * factor(unit) + Number.EPSILON) * 100) / 100;
  const fromYuan = (value, unit) => Number((value / factor(unit)).toFixed(unit === 'wan' ? 6 : 2));
  const defaultScales = () => Object.fromEntries(['payment', 'balance', 'cumulativeInterest'].map(key => [key, { auto: true, min: 0, max: 10000, step: 2000 }]));
  function validateScale(scale) {
    if (!scale || typeof scale.auto !== 'boolean') throw new Error('坐标轴模式无效');
    for (const key of ['min', 'max', 'step']) if (typeof scale[key] !== 'number' || !Number.isFinite(scale[key]) || scale[key] < 0 || scale[key] > 1e12) throw new Error('坐标轴刻度必须为有效的非负数');
    if (scale.max <= scale.min || scale.step <= 0 || scale.step > scale.max - scale.min || (scale.max - scale.min) / scale.step > 12) throw new Error('上限应大于下限，间隔应大于 0，刻度区间最多 12 格');
    return { auto: scale.auto, min: scale.min, max: scale.max, step: scale.step };
  }
  function validateScales(scales) {
    if (!scales || typeof scales !== 'object') throw new Error('曲线刻度设置无效');
    return Object.fromEntries(['payment', 'balance', 'cumulativeInterest'].map(key => [key, validateScale(scales[key])]));
  }
  function resolveAxis(values, scale) {
    const valid = validateScale(scale);
    let { min, max, step } = valid;
    if (valid.auto) {
      const lowest = values.length ? Math.min(...values) : 0;
      const highest = values.length ? Math.max(...values) : 0;
      // Leave room above and below both series, without magnifying cent-level rounding.
      const padding = Math.max((highest - lowest) * .1, Math.max(Math.abs(lowest), Math.abs(highest)) * .01, 1);
      const lower = Math.max(0, lowest - padding), upper = highest + padding;
      const rough = (upper - lower) / 5, power = 10 ** Math.floor(Math.log10(rough));
      const niceSteps = [1, 2, 2.5, 5, 10].map(n => n * power);
      step = niceSteps.reduce((best, candidate) => Math.abs(candidate - rough) < Math.abs(best - rough) ? candidate : best);
      min = Number((Math.floor(lower / step) * step).toPrecision(12));
      max = Number((Math.ceil(upper / step) * step).toPrecision(12));
    }
    const ticks = [];
    for (let i = 0; i <= 12 && min + i * step < max - step * 1e-8; i++) ticks.push(Number((min + i * step).toPrecision(12)));
    ticks.push(max);
    return { min, max, step, ticks, clipped: values.some(value => value < min || value > max) };
  }
  function mountMonthPicker(host, { name, value, form }) {
    host.innerHTML = `<div class="loan-month-picker"><button type="button" data-month-prev aria-label="上一个还款月">‹</button><div class="loan-month-year"><input class="plain-input" data-month-year type="number" min="1900" max="2200" step="1" required aria-label="首次还款年份"><span>年</span></div><select class="plain-input" data-month-number aria-label="首次还款月份">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, '0')} 月</option>`).join('')}</select><button type="button" data-month-next aria-label="下一个还款月">›</button><input type="hidden" name="${name}"></div>`;
    const year = host.querySelector('[data-month-year]'), month = host.querySelector('[data-month-number]'), hidden = host.querySelector('input[type="hidden"]');
    if (form) hidden.setAttribute('form', form);
    function setValue(next) { const [y, m] = next.split('-'); year.value = y; month.value = Number(m); hidden.value = next; }
    function update(event) {
      if (event.target === hidden) return;
      hidden.value = year.validity.valid && year.value ? `${String(Number(year.value)).padStart(4, '0')}-${String(month.value).padStart(2, '0')}` : '';
    }
    host.addEventListener('input', update); host.addEventListener('change', update);
    host.addEventListener('click', event => {
      const direction = event.target.closest('[data-month-prev]') ? -1 : event.target.closest('[data-month-next]') ? 1 : 0;
      if (!direction || !year.validity.valid) return;
      const index = +year.value * 12 + +month.value - 1 + direction, y = Math.floor(index / 12);
      if (y < 1900 || y > 2200) return;
      setValue(`${y}-${String(index % 12 + 1).padStart(2, '0')}`);
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    });
    setValue(value);
    return { setValue };
  }
  function chartSvg({ id, series, metric, index, axis }) {
    const n = series[0].rows.length, x = i => 86 + (n === 1 ? 0 : i / (n - 1) * 626), y = value => 230 - (value - axis.min) / (axis.max - axis.min) * 204;
    const precision = Math.min(8, Math.max(0, Math.ceil(-Math.log10(axis.step / 10000))));
    const format = value => value >= 10000 ? `${Number((value / 10000).toFixed(precision))}万` : Number(value.toFixed(8)).toLocaleString('en-US', { maximumFractionDigits: 8 });
    let svg = `<svg viewBox="0 0 760 280" role="img" aria-labelledby="${id}-title"><title id="${id}-title">还款曲线，使用下方滑块查看每期数据</title><defs><clipPath id="${id}-clip"><rect x="80" y="20" width="640" height="216"/></clipPath></defs>`;
    axis.ticks.forEach(value => { svg += `<line x1="86" x2="712" y1="${y(value)}" y2="${y(value)}" stroke="#e7ecdf"/><text x="76" y="${y(value) + 4}" text-anchor="end">${format(value)}</text>`; });
    [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => { svg += `<text x="${x(i)}" y="258" text-anchor="middle">第 ${i + 1} 期</text>`; });
    svg += `<g clip-path="url(#${id}-clip)"><line x1="${x(index)}" x2="${x(index)}" y1="26" y2="230" stroke="#a8b89a" stroke-dasharray="4 4"/>`;
    series.forEach(({ rows, color }) => { svg += `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${rows.map((r, i) => `${x(i)},${y(r[metric])}`).join(' ')}"/><circle cx="${x(index)}" cy="${y(rows[index][metric])}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`; });
    return svg + '</g></svg>';
  }
  function axisControls(prefix) {
    return `<details class="loan-axis-settings"><summary>纵坐标刻度设置</summary><label class="mortgage-check"><input type="checkbox" id="${prefix}-axis-auto" checked> 自动选择刻度</label><div class="loan-axis-grid">${[['min', '下限'], ['max', '上限'], ['step', '刻度间隔']].map(([key, label]) => `<label class="mortgage-field">${label}<small>元</small><input class="plain-input" type="number" id="${prefix}-axis-${key}" min="0" max="1000000000000" step="any" required></label>`).join('')}</div><p class="mortgage-help">自动贴合曲线的最小、最大值并在上下留白，不固定从 0 开始。关闭自动后可手动微调，每种曲线单独保存。</p><p id="${prefix}-axis-error" class="form-error" role="status"></p></details>`;
  }
  function bindAxis(root, prefix, { getMetric, getScales, onSave, onRender }) {
    const $ = suffix => root.querySelector(`#${prefix}-axis-${suffix}`);
    function sync() {
      const scale = getScales()[getMetric()]; $('auto').checked = scale.auto;
      for (const key of ['min', 'max', 'step']) { $(key).value = scale[key]; $(key).disabled = scale.auto; }
      $('error').textContent = '';
    }
    function change() {
      const scale = { auto: $('auto').checked };
      for (const key of ['min', 'max', 'step']) { scale[key] = $(key).value.trim() ? Number($(key).value) : NaN; $(key).disabled = scale.auto; }
      try { const valid = validateScale(scale); getScales()[getMetric()] = valid; $('error').textContent = ''; onSave(); onRender(); }
      catch (error) { $('error').textContent = error.message; }
    }
    function showBounds(bounds) {
      if (!getScales()[getMetric()].auto) return;
      for (const key of ['min', 'max', 'step']) $(key).value = bounds[key];
    }
    for (const key of ['auto', 'min', 'max', 'step']) { $(key).addEventListener('input', change); $(key).addEventListener('change', change); }
    return { sync, showBounds };
  }
  return { factor, toYuan, fromYuan, defaultScales, validateScales, resolveAxis, mountMonthPicker, chartSvg, axisControls, bindAxis };
});
