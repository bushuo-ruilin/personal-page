(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SalaryContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const sentences = [
    ['生活的理想，就是为了理想的生活。', '张闻天'],
    ['千里之行，始于足下。', '老子《道德经》'],
    ['不积跬步，无以至千里；不积小流，无以成江海。', '荀子《劝学》'],
    ['长风破浪会有时，直挂云帆济沧海。', '李白《行路难》'],
    ['采菊东篱下，悠然见南山。', '陶渊明《饮酒》'],
    ['行到水穷处，坐看云起时。', '王维《终南别业》'],
    ['天生我材必有用，千金散尽还复来。', '李白《将进酒》'],
    ['山重水复疑无路，柳暗花明又一村。', '陆游《游山西村》'],
    ['竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', '苏轼《定风波》'],
    ['海内存知己，天涯若比邻。', '王勃《送杜少府之任蜀州》'],
    ['会当凌绝顶，一览众山小。', '杜甫《望岳》'],
    ['纸上得来终觉浅，绝知此事要躬行。', '陆游《冬夜读书示子聿》'],
    ['路漫漫其修远兮，吾将上下而求索。', '屈原《离骚》'],
    ['学而时习之，不亦说乎？', '《论语》'],
    ['己所不欲，勿施于人。', '《论语》'],
    ['知足不辱，知止不殆，可以长久。', '老子《道德经》'],
    ['穷则独善其身，达则兼善天下。', '《孟子》'],
    ['非淡泊无以明志，非宁静无以致远。', '诸葛亮《诫子书》'],
    ['问渠那得清如许？为有源头活水来。', '朱熹《观书有感》'],
    ['少壮不努力，老大徒伤悲。', '汉乐府《长歌行》']
  ];
  const defaultQuotes = sentences.map(([text, author], index) => ({ id: `quote-${index + 1}`, text, author, kind: 'quote', enabled: true })).concat([
    { id: 'wisdom-1', text: '把生活过好，也是一种值得认真经营的事业。', author: '生活小记', kind: 'wisdom', enabled: true },
    { id: 'wisdom-2', text: '给未来留一点积蓄，也给今天留一点欢喜。', author: '生活小记', kind: 'wisdom', enabled: true },
    { id: 'wisdom-3', text: '钱要算清楚，生活要慢慢过。', author: '生活小记', kind: 'wisdom', enabled: true },
    { id: 'wisdom-4', text: '积累不必惊天动地，每一个小小的坚持都有意义。', author: '生活小记', kind: 'wisdom', enabled: true }
  ]);
  const defaultLinks = [
    { id: 'link-1', name: '好工具啊 · 工资计算器', url: 'https://www.haogongjua.cn/tool/salary-calculator/', description: '税前税后工资与五险一金测算', enabled: true },
    { id: 'link-2', name: '365 工具箱 · 个税计算器', url: 'https://www.toolbox365.cn/tools/tax-calc/', description: '工资、年终奖和个税计算', enabled: true },
    { id: 'link-3', name: '工具匠 · 个税计算器', url: 'https://www.toolkk.com/tools/individual-income-tax-calculator', description: '工资薪金及多类收入的个税估算', enabled: true }
  ];
  function safeExternalUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('链接地址无效');
    let url;
    try { url = new URL(value); } catch (_) { throw new Error('请填写完整的 http:// 或 https:// 链接'); }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('链接仅支持不含账号密码的 http:// 或 https:// 地址');
    return url.href;
  }
  function validateContent(content) {
    if (!content || !Array.isArray(content.quotes) || content.quotes.length > 500 || !Array.isArray(content.links) || content.links.length > 200) throw new Error('名言或外部链接列表无效');
    const text = (value, limit, empty = false) => typeof value === 'string' && value.length <= limit && (empty || value.trim().length > 0);
    const validateId = (item, ids) => {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id) || typeof item.enabled !== 'boolean') throw new Error('内容标识或启用状态无效');
      ids.add(item.id);
    };
    const quoteIds = new Set(), linkIds = new Set();
    const quotes = content.quotes.map(item => {
      validateId(item, quoteIds);
      if (!text(item.text, 500) || !text(item.author, 80, true) || !['quote', 'wisdom'].includes(item.kind)) throw new Error('名言文字、作者或分类无效');
      return { id: item.id, text: item.text.trim(), author: item.author.trim(), kind: item.kind, enabled: item.enabled };
    });
    const links = content.links.map(item => {
      validateId(item, linkIds);
      if (!text(item.name, 60) || !text(item.description, 160, true)) throw new Error('链接名称或描述无效');
      return { id: item.id, name: item.name.trim(), description: item.description.trim(), url: safeExternalUrl(item.url), enabled: item.enabled };
    });
    return { quotes, links };
  }
  return { defaultQuotes, defaultLinks, safeExternalUrl, validateContent };
});
