import { isSealedSecret, openSecret, sealSecret } from './settings.crypto';

describe('settings crypto', () => {
  it('seals a secret so the stored text is not the original value', () => {
    const sealed = sealSecret('server-key-value', 'jwt-secret-material-32-characters');

    expect(sealed.startsWith('enc:v1:')).toBe(true);
    expect(sealed).not.toContain('server-key-value');
    expect(isSealedSecret(sealed)).toBe(true);
    expect(openSecret(sealed, 'jwt-secret-material-32-characters')).toBe('server-key-value');
  });
});
