import { BinaryToTextEncoding } from 'crypto';
import sodium from 'sodium-native';
import { asBuffer, buildKeyFromSecretAndSalt, createError, CRYPTO_SPLIT_CHAR, sanitizeSecretKeys } from 'src/utils';
import { SecretKey, SessionCrypto } from './SessionCrypto';

export class SodiumAuth implements SessionCrypto {
  public readonly protocol = '/sodium_auth';
  public readonly stateless = false;
  private readonly encoding: BinaryToTextEncoding;
  constructor(encoding: BinaryToTextEncoding = 'base64') {
    this.encoding = encoding;
  }
  public deriveSecretKeys(key?: SecretKey, secret?: Buffer | string, salt?: Buffer | string): Buffer[] {
    if (key) {
      return sanitizeSecretKeys(key);
    } else if (secret) {
      return [buildKeyFromSecretAndSalt(asBuffer(secret), salt ? asBuffer(salt, 'base64') : undefined)];
    }
    throw createError('SecretKeyDerivation', 'Failed to derive keys from options');
  }
  public sealMessage(message: Buffer, secretKey: Buffer): string {
    const signature = Buffer.allocUnsafe(sodium.crypto_auth_BYTES);
    sodium.crypto_auth(signature, message, secretKey);
    return message.toString(this.encoding) + CRYPTO_SPLIT_CHAR + signature.toString(this.encoding);
  }
  public unsealMessage(message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean } {
    const splitCharIndex = message.lastIndexOf(CRYPTO_SPLIT_CHAR);
    if (splitCharIndex === -1) {
      throw createError('MalformedMessageError', 'The message is malformed');
    }
    const signature = Buffer.from(message.slice(splitCharIndex + 1), this.encoding);
    if (signature.length !== sodium.crypto_auth_BYTES) {
      throw createError('SignatureLengthError', 'The signature does not have the required length');
    }
    const cleartext = Buffer.from(message.slice(0, splitCharIndex), this.encoding);

    let rotated = false;
    const success = secretKeys.some((secretKey, index) => {
      const verified = sodium.crypto_auth_verify(signature, cleartext, secretKey);
      rotated = verified && index > 0;
      return verified;
    });

    if (!success) {
      throw createError('VerifyError', 'Unable to verify');
    }

    return { buffer: cleartext, rotated };
  }
}

export const SODIUM_AUTH = new SodiumAuth();
