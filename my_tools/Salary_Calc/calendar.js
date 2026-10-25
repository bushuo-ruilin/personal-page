(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SalaryCalendar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const timeZone = 'Asia/Shanghai';
  const dayMs = 86400000;
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  const defaultPayday = { day: 10, weekend: 'none' };
  let lunarFormatter;
  try {
    const candidate = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { timeZone, year: 'numeric', month: 'long', day: 'numeric' });
    if (candidate.resolvedOptions().calendar === 'chinese') lunarFormatter = candidate;
  } catch (_) { /* The UI explicitly reports unsupported lunar-calendar browsers. */ }
  function dateParts(date = new Date()) {
    const parts = Object.fromEntries(dateFormatter.formatToParts(date).filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
    const year = +parts.year, month = +parts.month, day = +parts.day;
    const serial = Date.UTC(year, month - 1, day) / dayMs;
    const weekday = new Date(serial * dayMs).getUTCDay();
    return { year, month, day, serial, weekday, weekdayName: weekdays[weekday], key: `${year}-${parts.month}-${parts.day}` };
  }
  function lunarInfo(date = new Date()) {
    if (!lunarFormatter) return { supported: false, date: '当前浏览器暂不支持农历', year: '', zodiac: '' };
    const parts = Object.fromEntries(lunarFormatter.formatToParts(date).filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
    const lunarYear = +parts.relatedYear;
    return { supported: true, date: `${parts.month}${lunarDays[+parts.day - 1] || parts.day}`, year: parts.yearName ? `${parts.yearName}年` : `${parts.relatedYear}年`, zodiac: Number.isFinite(lunarYear) ? `${animals[((lunarYear - 4) % 12 + 12) % 12]}年` : '', relatedYear: lunarYear };
  }
  function validatePayday(value) {
    if (!value || !Number.isInteger(value.day) || value.day < 1 || value.day > 31 || !['none', 'previous', 'next'].includes(value.weekend)) throw new Error('发薪日应为 1—31 日，周末规则应为不调整、提前或顺延');
    return { day: value.day, weekend: value.weekend };
  }
  function paydayForMonth(year, zeroBasedMonth, settings) {
    const first = new Date(Date.UTC(year, zeroBasedMonth, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const nominal = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(settings.day, lastDay)) / dayMs;
    const weekday = new Date(nominal * dayMs).getUTCDay();
    let adjusted = nominal;
    if (settings.weekend === 'previous') adjusted -= weekday === 6 ? 1 : weekday === 0 ? 2 : 0;
    if (settings.weekend === 'next') adjusted += weekday === 6 ? 2 : weekday === 0 ? 1 : 0;
    const effective = new Date(adjusted * dayMs);
    return { serial: adjusted, year: effective.getUTCFullYear(), month: effective.getUTCMonth() + 1, day: effective.getUTCDate(), weekdayName: weekdays[effective.getUTCDay()], adjusted: adjusted !== nominal, clamped: settings.day > lastDay, nominalSerial: nominal };
  }
  function nextPayday(date, value) {
    const settings = validatePayday(value);
    const today = dateParts(date);
    // Include the prior nominal month: a weekend delay can move payment into this month.
    const candidates = Array.from({ length: 17 }, (_, index) => paydayForMonth(today.year, today.month - 1 + index - 2, settings)).sort((a, b) => a.serial - b.serial);
    const next = candidates.find(item => item.serial >= today.serial);
    const previous = candidates.filter(item => item.serial < today.serial).pop();
    const days = next.serial - today.serial;
    const progress = previous ? Math.max(0, Math.min(100, (today.serial - previous.serial) / (next.serial - previous.serial) * 100)) : 0;
    return { ...next, days, today: days === 0, progress, previousSerial: previous?.serial };
  }
  function clockSnapshot(date = new Date()) {
    const current = dateParts(date);
    const first = Date.UTC(current.year, 0, 1) / dayMs;
    const last = Date.UTC(current.year + 1, 0, 1) / dayMs;
    const dayOfYear = current.serial - first + 1;
    return { ...current, time: timeFormatter.format(date), lunar: lunarInfo(date), dayOfYear, daysInYear: last - first, yearProgress: dayOfYear / (last - first) * 100 };
  }
  return { timeZone, defaultPayday, dateParts, lunarInfo, validatePayday, paydayForMonth, nextPayday, clockSnapshot };
});
