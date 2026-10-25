(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calendar'));
  else root.SalaryIncomeClock = factory(root.SalaryCalendar);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Calendar) {
  'use strict';
  const defaultIncomeClock = { source: 'salary', monthlyIncome: 15000, paidDays: 21.75,
    start: '09:00', end: '18:00', breakEnabled: true, breakStart: '12:00', breakEnd: '13:00',
    workdays: [1, 2, 3, 4, 5], goal: 30 };
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  function seconds(value) {
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('请填写有效的上下班及午休时间');
    const [h, m] = value.split(':').map(Number); return h * 3600 + m * 60;
  }
  function validateIncomeClock(value) {
    if (!value || typeof value !== 'object') throw new Error('收入秒表设置无效');
    const v = Object.fromEntries(Object.keys(defaultIncomeClock).map(key => [key, value[key]]));
    if (!['salary', 'custom'].includes(v.source) || typeof v.breakEnabled !== 'boolean') throw new Error('收入秒表口径或午休开关无效');
    if (!Number.isFinite(v.monthlyIncome) || v.monthlyIncome < 0 || v.monthlyIncome > 1e8) throw new Error('自定义月收入应在 0 至 1 亿元之间');
    if (!Number.isFinite(v.paidDays) || v.paidDays < 1 || v.paidDays > 31) throw new Error('月计薪天数应在 1 至 31 天之间');
    if (!Number.isFinite(v.goal) || v.goal <= 0 || v.goal > 1e8) throw new Error('午饭小目标应大于 0 且不超过 1 亿元');
    const start = seconds(v.start), end = seconds(v.end), breakStart = seconds(v.breakStart), breakEnd = seconds(v.breakEnd);
    if (end <= start) throw new Error('下班时间需晚于上班时间，当前秒表支持当天班次');
    if (v.breakEnabled && (breakStart < start || breakEnd > end || breakStart >= breakEnd || breakEnd - breakStart >= end - start)) throw new Error('午休需位于上下班之间，并至少留出一段计薪时间');
    if (!Array.isArray(v.workdays) || !v.workdays.length || v.workdays.length > 7 || new Set(v.workdays).size !== v.workdays.length || v.workdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error('请至少选择一个工作日，且不要重复');
    return { ...v, workdays: [...v.workdays] };
  }
  function incomeSnapshot(date, value, salaryMonthly = 0) {
    const v = validateIncomeClock(value), today = Calendar.dateParts(date);
    const [h, m, s] = timeFormatter.format(date).split(':').map(Number), now = h * 3600 + m * 60 + s;
    const start = seconds(v.start), end = seconds(v.end), breakStart = seconds(v.breakStart), breakEnd = seconds(v.breakEnd);
    const duration = end - start - (v.breakEnabled ? breakEnd - breakStart : 0);
    const isWorkday = v.workdays.includes(today.weekday);
    const overlap = v.breakEnabled ? Math.max(0, Math.min(now, breakEnd) - breakStart) : 0;
    const elapsed = isWorkday ? Math.max(0, Math.min(duration, Math.min(now, end) - start - overlap)) : 0;
    const monthly = v.source === 'custom' ? v.monthlyIncome : Number.isFinite(salaryMonthly) ? Math.max(0, salaryMonthly) : 0;
    const daily = monthly / v.paidDays, perSecond = daily / duration, earned = elapsed * perSecond;
    const status = !isWorkday ? 'off' : now < start ? 'before' : now >= end ? 'done' : v.breakEnabled && now >= breakStart && now < breakEnd ? 'break' : 'working';
    const countdownSeconds = status === 'off' || status === 'done' ? 0 : status === 'before' ? start - now : end - now;
    return { date: today.key, monthly, daily, perSecond, earned, elapsed, duration, status, goal: v.goal,
      countdownSeconds, goalReached: earned >= v.goal, goalProgress: Math.min(100, earned / v.goal * 100), shiftProgress: elapsed / duration * 100 };
  }
  function formatDuration(totalSeconds) {
    const n = Math.max(0, Math.floor(totalSeconds));
    return [Math.floor(n / 3600), Math.floor(n % 3600 / 60), n % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
  return { defaultIncomeClock, validateIncomeClock, incomeSnapshot, formatDuration };
});
