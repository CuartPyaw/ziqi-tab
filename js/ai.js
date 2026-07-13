const STORAGE_KEY = 'ziqi-ai-sites';

export const DEFAULT_AI_SITES = [
  { id: 'chatgpt', name: 'ChatGPT', shortcut: 'gpt', url: 'https://chatgpt.com/?hints=search&ref=ext&q={query}' },
  { id: 'gemini', name: 'Gemini', shortcut: 'gm', url: 'https://gemini.google.com/app' },
  { id: 'doubao', name: '豆包', shortcut: 'dbai', url: 'https://www.doubao.com/chat/' },
  { id: 'qianwen', name: '千问', shortcut: 'qw', url: 'https://www.qianwen.com/?q={query}' },
  { id: 'yuanbao', name: '元宝', shortcut: 'yb', url: 'https://yuanbao.tencent.com/chat/' },
  { id: 'minimax', name: 'MiniMax', shortcut: 'mx', url: 'https://chat.minimax.io/' },
  { id: 'deepseek', name: 'DeepSeek', shortcut: 'ds', url: 'https://chat.deepseek.com/' },
  { id: 'kimi', name: 'Kimi', shortcut: 'kimi', url: 'https://www.kimi.com/' },
];

export function getAiSites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (_) { /* Use the presets below. */ }
  return DEFAULT_AI_SITES;
}

export function saveAiSites(sites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

export function getAiSiteByShortcut(shortcut) {
  const normalized = shortcut.trim().toLowerCase();
  return getAiSites().find(site => site.shortcut.toLowerCase() === normalized) || null;
}
