import { describe, expect, it, vi } from 'vitest';
import { csrfTokenHandler } from '../common/security';
import { LocalStorageProvider } from '../common/storage/local-storage';

describe('security hardening', () => {
  it('rotates csrf tokens instead of reusing an existing cookie', () => {
    const req = { headers: { cookie: 'marketplace_csrf=existing-token' } } as any;
    const res = {
      cookie: vi.fn(),
      setHeader: vi.fn(),
      json: vi.fn(),
    } as any;

    csrfTokenHandler(req, res, vi.fn());

    const token = res.cookie.mock.calls[0][1];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toBe('existing-token');
    expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', token);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { token } });
  });

  it('rejects local storage delete paths outside the upload directory', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = new LocalStorageProvider();

    await expect(storage.delete('../../../etc/passwd')).rejects.toThrow('Invalid storage path');

    consoleError.mockRestore();
  });
});
