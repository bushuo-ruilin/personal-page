(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./mortgage'), require('./loan-tools'));
  else root.SalaryCarLoan = factory(root.SalaryMortgage, root.SalaryLoanTools);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Mortgage, LoanTools) {
  'use strict';
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const defaultCarLoan = { price: 200000, downPercent: 30, months: 36, annualRate: 4.5, monthlyFeeRate: .25,
    mode: 'apr', method: 'annuity', serviceFee: 2000, purchaseTax: 15000, insurance: 6000, registration: 500,
    startMonth: Mortgage.defaultMortgage.startMonth, amountUnit: 'wan', chartScales: LoanTools.defaultScales() };
  function validateCarLoan(value) {
    if (!value || typeof value !== 'object') throw new Error('车贷设置无效');
    const v = Object.fromEntries(Object.keys(defaultCarLoan).map(key => [key, value[key]]));
    for (const key of ['price', 'serviceFee', 'purchaseTax', 'insurance', 'registration']) if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0 || v[key] > 1e9) throw new Error('车价及购车费用应在 0 至 10 亿元之间');
    if (round(v.price) <= 0) throw new Error('裸车价应大于 0');
    for (const [key, max] of [['downPercent', 100], ['annualRate', 100], ['monthlyFeeRate', 10]]) if (typeof v[key] !== 'number' || !Number.isFinite(v[key]) || v[key] < 0 || v[key] > max) throw new Error('首付比例、年利率或月费率超出范围');
    if (!Number.isInteger(v.months) || v.months < 1 || v.months > 120) throw new Error('车贷期数应为 1 至 120 个月');
    if (!['apr', 'flat', 'zero'].includes(v.mode) || !['annuity', 'principal'].includes(v.method) || !['yuan', 'wan'].includes(v.amountUnit)) throw new Error('车贷计息方式或金额单位无效');
    if (typeof v.startMonth !== 'string' || !/^(19\d{2}|20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(v.startMonth)) throw new Error('首次还款月份无效');
    v.chartScales = LoanTools.validateScales(v.chartScales);
    return v;
  }
  function effectiveAnnualRate(principal, serviceFee, payments) {
    const net = round(principal - serviceFee);
    if (net <= 0) return null;
    if (Math.abs(payments.reduce((a, b) => a + b, 0) - net) < .005) return 0;
    const npv = r => payments.reduce((sum, payment, i) => sum + payment / (1 + r) ** (i + 1), 0) - net;
    let low = 0, high = 1;
    while (npv(high) > 0 && high < 1e16) high *= 2;
    for (let i = 0; i < 100; i++) { const mid = (low + high) / 2; if (npv(mid) > 0) low = mid; else high = mid; }
    return ((1 + (low + high) / 2) ** 12 - 1) * 100;
  }
  function calculateCarLoan(input) {
    const settings = validateCarLoan(input), price = round(settings.price), downPayment = round(price * settings.downPercent / 100), principal = round(price - downPayment);
    // The mortgage engine shares the same amortization rules; its public rate range is 0–30%.
    // Car APRs up to 100% are handled by the identical cent-based formula here.
    function schedule(method, rate) {
      const total = Math.round(principal * 100), r = rate / 1200;
      const payment = Math.round((r ? principal * r / -Math.expm1(-settings.months * Math.log1p(r)) : principal / settings.months) * 100);
      let balance = total, totalInterest = 0, totalPaid = 0;
      const rows = Array.from({ length: settings.months }, (_, i) => {
        const interest = settings.mode === 'flat' ? Math.round(principal * settings.monthlyFeeRate) : Math.round(balance * r);
        let paidPrincipal = method === 'annuity' && settings.mode === 'apr' ? Math.max(0, payment - interest) : Math.round(total * (i + 1) / settings.months) - Math.round(total * i / settings.months);
        paidPrincipal = i === settings.months - 1 ? balance : Math.min(balance, paidPrincipal); balance -= paidPrincipal;
        totalInterest += interest; totalPaid += paidPrincipal + interest;
        return { month: i + 1, date: Mortgage.monthLabel(settings.startMonth, i), principal: paidPrincipal / 100, interest: interest / 100, payment: (paidPrincipal + interest) / 100, balance: balance / 100, cumulativeInterest: totalInterest / 100 };
      });
      return { rows, totalInterest: totalInterest / 100, totalPayment: totalPaid / 100, firstPayment: rows[0].payment, lastPayment: rows[rows.length - 1].payment };
    }
    const schedules = settings.mode === 'apr' ? { annuity: schedule('annuity', settings.annualRate), principal: schedule('principal', settings.annualRate) } : { fixed: schedule('principal', 0) };
    const selected = schedules[settings.mode === 'apr' ? settings.method : 'fixed'];
    const extras = round(settings.serviceFee + settings.purchaseTax + settings.insurance + settings.registration);
    return { settings, price, principal, downPayment, schedules, selected, upfront: round(downPayment + extras),
      financeCost: round(selected.totalInterest + settings.serviceFee), totalCost: round(price + extras + selected.totalInterest),
      effectiveApr: effectiveAnnualRate(principal, settings.serviceFee, selected.rows.map(row => row.payment)) };
  }
  return { defaultCarLoan, validateCarLoan, calculateCarLoan, effectiveAnnualRate };
});
