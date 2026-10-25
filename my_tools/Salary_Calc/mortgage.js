(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SalaryMortgage = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const { defaultScales, validateScales } = typeof module === 'object' && module.exports ? require('./loan-tools') : SalaryLoanTools;
  const date = new Date();
  const nextMonth = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 1));
  const defaultMortgage = {
    type: 'commercial', inputMode: 'amount', commercialAmount: 1000000, fundAmount: 400000,
    housePrice: 2000000, unitPrice: 25000, area: 80, downPercent: 30,
    rateMode: 'direct', commercialRate: 3.1, fundRate: 2.6, lpr: 3.5, basisPoints: -40,
    months: 360, startMonth: nextMonth.toISOString().slice(0, 7), method: 'annuity',
    monthlyIncome: 20000, livingCosts: 6000, emergencySavings: 100000, incomeDrop: 20,
    showReminder: true, reminder: '提醒自己：贷款买房就是套牢。签字之前，想清楚未来的月供，也给生活留一点自由。',
    amountUnit: 'wan', chartScales: defaultScales()
  };
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  function validateMortgage(value) {
    if (!value || typeof value !== 'object') throw new Error('房贷设置无效');
    const normalized = { amountUnit: 'wan', chartScales: defaultScales(), ...value };
    const v = Object.fromEntries(Object.keys(defaultMortgage).map(key => [key, normalized[key]]));
    if (!['yuan', 'wan'].includes(v.amountUnit)) throw new Error('金额单位无效');
    v.chartScales = validateScales(v.chartScales);
    for (const [key, allowed] of Object.entries({ type: ['commercial', 'fund', 'combined'], inputMode: ['amount', 'total', 'area'], rateMode: ['direct', 'lpr'], method: ['annuity', 'principal'] })) {
      if (!allowed.includes(v[key])) throw new Error('房贷类型、金额方式或还款方式无效');
    }
    for (const key of ['commercialAmount', 'fundAmount', 'housePrice', 'unitPrice', 'monthlyIncome', 'livingCosts', 'emergencySavings']) {
      if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0 || v[key] > 1e9) throw new Error('房贷金额及收支应在 0 至 10 亿元之间');
    }
    for (const key of ['commercialRate', 'fundRate', 'lpr']) if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0 || v[key] > 30) throw new Error('年利率应在 0% 至 30% 之间');
    if (typeof v.basisPoints !== 'number' || !Number.isFinite(v.basisPoints) || Math.abs(v.basisPoints) > 3000) throw new Error('加点应在 -3000 至 3000 BP 之间');
    if (!Number.isInteger(v.months) || v.months < 1 || v.months > 600) throw new Error('贷款期数应为 1 至 600 个月');
    if (typeof v.startMonth !== 'string' || !/^(19\d{2}|20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(v.startMonth)) throw new Error('请填写有效的首次还款月份（1900 至 2200 年）');
    if (typeof v.area !== 'number' || !Number.isFinite(v.area) || v.area <= 0 || v.area > 100000) throw new Error('面积应大于 0 且不超过 10 万平方米');
    for (const key of ['downPercent', 'incomeDrop']) if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0 || v[key] > 100) throw new Error('首付比例及收入降幅应在 0% 至 100% 之间');
    if (typeof v.showReminder !== 'boolean' || typeof v.reminder !== 'string' || v.reminder.length > 300) throw new Error('提醒内容不能超过 300 字');
    loanParts(v); // Validate derived amounts and the effective LPR rate as well.
    return v;
  }
  function loanParts(v) {
    let commercial = v.type === 'fund' ? 0 : round(v.commercialAmount);
    let fund = v.type === 'commercial' ? 0 : round(v.fundAmount);
    const housePrice = v.inputMode === 'area' ? round(v.unitPrice * v.area) : round(v.housePrice);
    const downPayment = round(housePrice * v.downPercent / 100);
    if (v.inputMode !== 'amount') {
      if (housePrice <= 0 || housePrice > 1e9) throw new Error('房屋总价应大于 0 且不超过 10 亿元');
      const loan = round(housePrice - downPayment);
      if (v.type === 'commercial') commercial = loan;
      else if (v.type === 'fund') fund = loan;
      else { fund = round(v.fundAmount); commercial = round(loan - fund); }
    }
    if (commercial < 0 || fund < 0 || round(commercial + fund) <= 0 || commercial + fund > 1e9) throw new Error('贷款合计应大于 0 且不超过 10 亿元，组合贷公积金部分不能超过贷款总额');
    if (v.type === 'combined' && (!commercial || !fund)) throw new Error('组合贷款的商业贷款、公积金贷款金额都应大于 0');
    const commercialRate = v.rateMode === 'lpr' ? Number((v.lpr + v.basisPoints / 100).toFixed(7)) : v.commercialRate;
    if (commercial && (commercialRate < 0 || commercialRate > 30)) throw new Error('LPR 加点后的商贷年利率应在 0% 至 30% 之间');
    return { commercial, fund, principal: round(commercial + fund), commercialRate, fundRate: v.fundRate,
      housePrice: v.inputMode === 'amount' ? null : housePrice, downPayment: v.inputMode === 'amount' ? null : downPayment };
  }
  function monthLabel(start, offset) {
    const [year, month] = start.split('-').map(Number);
    const index = year * 12 + month - 1 + offset;
    return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  }
  function amortize(amount, annualRate, months, method) {
    const totalCents = Math.round(amount * 100), r = annualRate / 1200;
    const fixedPayment = Math.round((r === 0 ? amount / months : amount * r / -Math.expm1(-months * Math.log1p(r))) * 100);
    let balance = totalCents;
    return Array.from({ length: months }, (_, i) => {
      const interest = Math.round(balance * r);
      let principal = method === 'annuity' ? Math.max(0, fixedPayment - interest) : Math.round(totalCents * (i + 1) / months) - Math.round(totalCents * i / months);
      principal = i === months - 1 ? balance : Math.min(balance, principal);
      balance -= principal;
      return { principal, interest, payment: principal + interest, balance };
    });
  }
  function calculateMortgage(input) {
    const settings = validateMortgage(input), parts = loanParts(settings);
    const schedules = {};
    for (const method of ['annuity', 'principal']) {
      const commercial = amortize(parts.commercial, parts.commercialRate, settings.months, method);
      const fund = amortize(parts.fund, parts.fundRate, settings.months, method);
      let interestCents = 0, paidCents = 0;
      const rows = commercial.map((item, i) => {
        const other = fund[i], interest = item.interest + other.interest, payment = item.payment + other.payment;
        interestCents += interest; paidCents += payment;
        return { month: i + 1, date: monthLabel(settings.startMonth, i), payment: payment / 100,
          principal: (item.principal + other.principal) / 100, interest: interest / 100,
          balance: (item.balance + other.balance) / 100, cumulativeInterest: interestCents / 100,
          cumulativePaid: paidCents / 100, commercialPayment: item.payment / 100, fundPayment: other.payment / 100 };
      });
      schedules[method] = { rows, totalInterest: interestCents / 100, totalPayment: paidCents / 100,
        firstPayment: rows[0].payment, lastPayment: rows[rows.length - 1].payment,
        maxPayment: Math.max(...rows.map(row => row.payment)) };
    }
    const selected = schedules[settings.method], payment = selected.maxPayment;
    return { settings, parts, schedules, selected, endMonth: monthLabel(settings.startMonth, settings.months - 1),
      interestSaving: round(schedules.annuity.totalInterest - schedules.principal.totalInterest),
      pressure: { ratio: settings.monthlyIncome > 0 ? payment / settings.monthlyIncome * 100 : null,
        remaining: round(settings.monthlyIncome - settings.livingCosts - payment),
        stressedRemaining: round(settings.monthlyIncome * (1 - settings.incomeDrop / 100) - settings.livingCosts - payment),
        bufferMonths: settings.emergencySavings / (payment + settings.livingCosts) } };
  }
  return { defaultMortgage, validateMortgage, calculateMortgage, monthLabel };
});
