import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProxyClient } from './proxy-client';

describe('ProxyClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls correct URL', async () => {
    const client = new ProxyClient('http://baize.local');
    await client.request('/api/v1/agents');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://baize.local/api/v1/agents',
      expect.any(Object)
    );
  });

  it('forwards user JWT as Authorization: Bearer', async () => {
    const client = new ProxyClient('http://baize.local');
    await client.request('/api/v1/agents', { userToken: 'user-jwt-xyz' });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Headers).get('Authorization')).toBe(
      'Bearer user-jwt-xyz'
    );
  });

  it('does not set Authorization when userToken missing', async () => {
    const client = new ProxyClient('http://baize.local');
    await client.request('/api/v1/agents');
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Headers).get('Authorization')).toBeNull();
  });

  it('sends X-API-KEY when staticApiKey is configured', async () => {
    const client = new ProxyClient('http://diting.local', {
      staticApiKey: 'static-key-abc'
    });
    await client.request('/api/projects', { userToken: 'user-jwt-xyz' });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Headers).get('X-API-KEY')).toBe('static-key-abc');
    expect((opts.headers as Headers).get('Authorization')).toBe(
      'Bearer user-jwt-xyz'
    );
  });

  it('does not send X-API-KEY when staticApiKey is not configured', async () => {
    const client = new ProxyClient('http://baize.local');
    await client.request('/api/v1/agents', { userToken: 'user-jwt-xyz' });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Headers).get('X-API-KEY')).toBeNull();
  });

  it('forwards method and body', async () => {
    const client = new ProxyClient('http://baize.local');
    const body = JSON.stringify({ name: 'test' });
    await client.request('/api/v1/agents', { method: 'POST', body });
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(body);
  });

  it('does not override explicit Content-Type', async () => {
    const client = new ProxyClient('http://baize.local');
    const headers = new Headers({ 'Content-Type': 'text/plain' });
    await client.request('/api/v1/agents', {
      method: 'POST',
      body: 'raw',
      headers
    });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Headers).get('Content-Type')).toBe('text/plain');
  });

  it('returns upstream Response', async () => {
    mockFetch.mockResolvedValue(new Response('{"ok":true}', { status: 201 }));
    const client = new ProxyClient('http://baize.local');
    const res = await client.request('/api/v1/agents');
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('{"ok":true}');
  });
});
