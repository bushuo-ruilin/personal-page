(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SalaryCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const brackets = [
    { limit: 36000, rate: .03, deduction: 0 },
    { limit: 144000, rate: .10, deduction: 2520 },
    { limit: 300000, rate: .20, deduction: 16920 },
    { limit: 420000, rate: .25, deduction: 31920 },
    { limit: 660000, rate: .30, deduction: 52920 },
    { limit: 960000, rate: .35, deduction: 85920 },
    { limit: Infinity, rate: .45, deduction: 181920 }
  ];
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const bracket = amount => brackets.find(item => amount <= item.limit) || brackets[6];
  const incomeTax = amount => { const b = bracket(Math.max(0, amount)); return round(Math.max(0, amount * b.rate - b.deduction)); };
  const bonusTax = amount => { const b = bracket(amount); return round(Math.max(0, amount * b.rate - b.deduction / 12)); };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  // Preserve version 1 configurations while allowing each deduction to be controlled independently.
  function normalizeSettings(settings) {
    return { ...settings,
      customSocialBase: settings.customSocialBase ?? settings.customBase ?? false,
      customFundBase: settings.customFundBase ?? settings.customBase ?? false,
      bonusEnabled: settings.bonusEnabled ?? true,
      bonusType: settings.bonusType ?? 'amount',
      bonusMonths: settings.bonusMonths ?? 2.5,
      deductionEnabled: settings.deductionEnabled ?? true,
      spreadBonus: settings.spreadBonus ?? false,
      includePersonalFund: settings.includePersonalFund ?? false
    };
  }
  function effectiveBonus(settings) {
    const s = normalizeSettings(settings);
    return s.bonusEnabled ? round(s.bonusType === 'months' ? s.salary * s.bonusMonths : s.bonus) : 0;
  }
  function allocateMoney(amount, count = 12) {
    const cents = Math.round(amount * 100);
    const base = Math.floor(cents / count);
    const remainder = cents - base * count;
    return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
  }
  function calculate(settings, city, overtimeSettings) {
    settings = normalizeSettings(settings);
    const yearlyBonus = effectiveBonus(settings);
    const monthlyDeduction = settings.deductionEnabled ? settings.deduction : 0;
    const socialBase = settings.customSocialBase ? settings.socialBase : clamp(settings.salary, city.socialMin, city.socialMax);
    const fundBase = settings.customFundBase ? settings.fundBase : clamp(settings.salary, city.fundMin, city.fundMax);
    const contributions = city.rates.map(item => {
      const base = item.key === 'fund' ? fundBase : socialBase;
      return { ...item, base, personalAmount: round(base * item.personal / 100 + (item.key === 'medical' ? city.medicalExtra : 0)), companyAmount: round(base * item.company / 100) };
    });
    const personal = round(contributions.reduce((sum, item) => sum + item.personalAmount, 0));
    const company = round(contributions.reduce((sum, item) => sum + item.companyAmount, 0));
    const social = round(contributions.filter(item => item.key !== 'fund').reduce((sum, item) => sum + item.personalAmount, 0));
    const fund = round(contributions.find(item => item.key === 'fund').personalAmount);
    const rows = [];
    let withheld = 0;
    let cumulativeIncome = 0;
    const overtimeResult = overtimeSettings ? calculateOvertime(overtimeSettings) : null;
    const overtimeStart = overtimeSettings?.startMonth ?? 1;
    for (let month = 1; month <= 12; month++) {
      const scheduledOvertime = month >= overtimeStart && month < overtimeStart + overtimeSettings?.months;
      const bonusMonthOvertime = month === 12 && yearlyBonus > 0 && overtimeSettings?.includeDecember === true;
      const overtimePay = overtimeSettings?.includeInSalary && (scheduledOvertime || bonusMonthOvertime) ? overtimeResult.monthlyPay : 0;
      const bonus = month === 12 ? yearlyBonus : 0;
      cumulativeIncome = round(cumulativeIncome + settings.salary + overtimePay - personal - 5000 - monthlyDeduction);
      const taxable = Math.max(0, round(cumulativeIncome + (settings.bonusMode === 'merged' ? bonus : 0)));
      const cumulativeTax = incomeTax(taxable);
      const wageTax = round(cumulativeTax - withheld);
      withheld = cumulativeTax;
      const separateTax = settings.bonusMode === 'separate' ? bonusTax(bonus) : 0;
      const tax = round(wageTax + separateTax);
      rows.push({ month, gross: round(settings.salary + overtimePay + bonus), salary: settings.salary, overtimePay, bonus, personal, social, fund, wageTax, bonusTax: separateTax, tax, net: round(settings.salary + overtimePay + bonus - personal - tax), wageNet: round(settings.salary + overtimePay - personal - wageTax), taxable });
    }
    const total = key => round(rows.reduce((sum, row) => sum + row[key], 0));
    const bonusRelatedTax = settings.bonusMode === 'separate' ? total('bonusTax') : round(incomeTax(rows[11].taxable) - incomeTax(Math.max(0, cumulativeIncome)));
    const bonusParts = allocateMoney(yearlyBonus);
    const bonusTaxParts = allocateMoney(bonusRelatedTax);
    const displayRows = settings.spreadBonus && yearlyBonus ? rows.map((row, index) => {
      const previousBonusTax = row.month === 12 ? bonusRelatedTax : 0;
      const gross = round(row.gross - row.bonus + bonusParts[index]);
      const tax = round(row.tax - previousBonusTax + bonusTaxParts[index]);
      const separate = settings.bonusMode === 'separate';
      return { ...row, gross, tax, bonus: bonusParts[index], bonusTax: separate ? bonusTaxParts[index] : 0, wageTax: separate ? row.wageTax : round(row.wageTax - previousBonusTax + bonusTaxParts[index]), net: round(gross - personal - tax), allocatedBonusTax: bonusTaxParts[index] };
    }) : rows;
    const personalRate = round(city.rates.reduce((sum, item) => sum + item.personal, 0));
    const companyRate = round(city.rates.reduce((sum, item) => sum + item.company, 0));
    const yearlyPersonalFund = round(fund * 12);
    const annualEstimate = round(total('net') + (settings.includePersonalFund ? yearlyPersonalFund : 0));
    return { rows, displayRows, contributions, socialBase, fundBase, personal, company, personalRate, companyRate, combinedRate: round(personalRate + companyRate), social, fund, yearlyPersonalFund, annualEstimate, yearlyBonus, bonusRelatedTax, yearlyOvertime: total('overtimePay'), monthlyDeduction, gross: total('gross'), tax: total('tax'), net: total('net'), yearlyPersonal: round(personal * 12), yearlyCompany: round(company * 12), wageAverage: round(total('wageNet') / 12), taxable: rows[11].taxable, bonusTax: total('bonusTax') };
  }
  function calculateBudget(salaryResult, expenses) {
    let accumulated = 0;
    const rows = (salaryResult.displayRows || salaryResult.rows).map(row => {
      const spending = round(expenses.filter(item => item.month === 0 || item.month === row.month).reduce((sum, item) => sum + item.amount, 0));
      const saving = round(row.net - spending);
      accumulated = round(accumulated + saving);
      return { month: row.month, income: row.net, spending, saving, accumulated };
    });
    const yearlySpending = round(rows.reduce((sum, row) => sum + row.spending, 0));
    return { rows, yearlySpending, monthlyAverage: round(yearlySpending / 12), yearlySaving: round(salaryResult.net - yearlySpending) };
  }
  function calculateOvertime(s) {
    // Keep the unrounded hourly wage throughout the calculation; round payable amounts only.
    const hourly = s.base / 21.75 / 8;
    const weekdayHours = s.weekdayDays * s.weekdayHours;
    const weekendHours = s.weekendDays * s.weekendHours;
    const holidayHours = s.holidayDays * s.holidayHours;
    const weekdayPay = round(hourly * weekdayHours * 1.5);
    const weekendPay = s.compensatoryLeave ? 0 : round(hourly * weekendHours * 2);
    const holidayPay = round(hourly * holidayHours * 3);
    const monthlyPay = round(weekdayPay + weekendPay + holidayPay);
    return { hourly, hourly15: round(hourly * 1.5), hourly2: round(hourly * 2), hourly3: round(hourly * 3), weekdayHours, weekendHours, holidayHours, weekdayPay, weekendPay, holidayPay, totalHours: round(weekdayHours + weekendHours + holidayHours), monthlyPay, annualPay: round(monthlyPay * s.months) };
  }
  return { brackets, round, bracket, incomeTax, bonusTax, calculate, normalizeSettings, effectiveBonus, calculateBudget, calculateOvertime, allocateMoney };
});
