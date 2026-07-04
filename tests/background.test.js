import { describe, it, expect, vi } from 'vitest';
import { handleRuntimeMessage } from '../js/background.js';

describe('background suggestion service', () => {
  it('fetches Google suggestions for runtime requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ['', ['hello', 'hello world', 'helium', 'hero', 'help', 'helm', 'hex']],
    });

    const response = await handleRuntimeMessage({
      type: 'ziqi:get-search-suggestions',
      query: ' hel ',
    }, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://suggestqueries.google.com/complete/search?client=chrome&q=hel'
    );
    expect(response).toEqual({
      suggestions: ['hello', 'hello world', 'helium', 'hero', 'help', 'helm'],
    });
  });

  it('returns an empty list for blank queries without fetching', async () => {
    const fetchMock = vi.fn();

    const response = await handleRuntimeMessage({
      type: 'ziqi:get-search-suggestions',
      query: '   ',
    }, fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response).toEqual({ suggestions: [] });
  });

  it('ignores unrelated runtime messages', async () => {
    const fetchMock = vi.fn();

    const response = await handleRuntimeMessage({ type: 'other-message' }, fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response).toBeNull();
  });
});
