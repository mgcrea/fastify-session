import { SODIUM_AUTH } from 'src/crypto';
import { CRYPTO_SPLIT_CHAR } from 'src/utils/crypto';
import { secretKey, sodiumAuthFixture } from 'test/fixtures';

describe('SodiumAuth', () => {
  it('should properly sign a message', async () => {
    const message = Buffer.from(JSON.stringify({ hello: 'world' }));
    const signed = SODIUM_AUTH.sealMessage(message, secretKey);
    expect(signed).toBeDefined();
    expect(typeof signed).toEqual('string');
    expect(signed.length).toEqual(69);
    expect(signed.split(CRYPTO_SPLIT_CHAR).length).toEqual(2);
  });

  it('should properly verify a signed message', async () => {
    const result = SODIUM_AUTH.unsealMessage(sodiumAuthFixture, [secretKey]);
    expect(result).toBeDefined();
    expect(typeof result).toEqual('object');
    expect(Object.keys(result)).toEqual(['buffer', 'rotated']);
    expect(Buffer.isBuffer(result.buffer)).toBeTruthy();
    expect(result.buffer.toString('utf8')).toEqual(JSON.stringify({ hello: 'world' }));
    expect(result.rotated).toBeFalsy();
  });
});
