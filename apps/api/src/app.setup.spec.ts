import { allowedWebOrigins } from './app.setup';

describe('allowedWebOrigins', () => {
  it('accepts both local loopback names outside production', () => {
    expect(allowedWebOrigins('development', 'http://localhost:3000')).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('does not broaden the production allow-list', () => {
    expect(allowedWebOrigins('production', 'https://bestwash.example')).toEqual(
      ['https://bestwash.example'],
    );
  });
});
