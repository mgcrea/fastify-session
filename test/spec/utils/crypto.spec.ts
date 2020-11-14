import { CRYPTO_SPLIT_CHAR, decryptMessage, encryptMessage, signMessage, verifyMessage } from 'src/utils/crypto';
import { secretKey, encryptedFixture, signedFixture } from 'test/fixtures';

describe('crypto', () => {
  it('should properly encrypt a message', async () => {
    const message = Buffer.from(JSON.stringify({ hello: 'world' }));
    const encrypted = encryptMessage(message, secretKey);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toEqual('string');
    expect(encrypted.length).toEqual(77);
    expect(encrypted.split(CRYPTO_SPLIT_CHAR).length).toEqual(2);
  });
  it('should properly decrypt an encrypted message', async () => {
    const result = decryptMessage(encryptedFixture, [secretKey]);
    expect(result).toBeDefined();
    expect(typeof result).toEqual('object');
    expect(Object.keys(result)).toEqual(['buffer', 'rotated']);
    expect(Buffer.isBuffer(result.buffer)).toBeTruthy();
    expect(result.buffer.toString('utf8')).toEqual(JSON.stringify({ hello: 'world' }));
    expect(result.rotated).toBeFalsy();
  });

  it('should properly sign a message', async () => {
    const message = Buffer.from(JSON.stringify({ hello: 'world' }));
    const signed = signMessage(message, secretKey);
    expect(signed).toBeDefined();
    expect(typeof signed).toEqual('string');
    expect(signed.length).toEqual(69);
    expect(signed.split(CRYPTO_SPLIT_CHAR).length).toEqual(2);
  });

  it('should properly verify a signed message', async () => {
    const result = verifyMessage(signedFixture, [secretKey]);
    expect(result).toBeDefined();
    expect(typeof result).toEqual('object');
    expect(Object.keys(result)).toEqual(['buffer', 'rotated']);
    expect(Buffer.isBuffer(result.buffer)).toBeTruthy();
    expect(result.buffer.toString('utf8')).toEqual(JSON.stringify({ hello: 'world' }));
    expect(result.rotated).toBeFalsy();
  });
});
