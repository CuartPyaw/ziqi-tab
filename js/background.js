const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q=';
const SUGGESTION_MESSAGE_TYPE = 'ziqi:get-search-suggestions';
const SUGGESTION_LIMIT = 6;

export async function handleRuntimeMessage(message, fetchImpl = fetch) {
  if (message?.type !== SUGGESTION_MESSAGE_TYPE) return null;

  const query = typeof message.query === 'string' ? message.query.trim() : '';
  if (!query) {
    return { suggestions: [] };
  }

  try {
    const response = await fetchImpl(GOOGLE_SUGGEST_URL + encodeURIComponent(query));
    if (!response.ok) {
      return { suggestions: [] };
    }

    const payload = await response.json();
    return {
      suggestions: Array.isArray(payload?.[1]) ? payload[1].slice(0, SUGGESTION_LIMIT) : [],
    };
  } catch {
    return { suggestions: [] };
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== SUGGESTION_MESSAGE_TYPE) return false;

    handleRuntimeMessage(message).then(sendResponse);
    return true;
  });
}
