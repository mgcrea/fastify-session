import { BinaryToTextEncoding } from 'crypto';
import sodium from 'sodium-native';
import { createError, CRYPTO_SPLIT_CHAR } from 'src/utils';
import { SessionCrypto } from './SessionCrypto';

export class SodiumSecretbox implements SessionCrypto {
  public readonly protocol = '/sodium_secretbox';
  public readonly stateless = true;
  private readonly encoding: BinaryToTextEncoding;
  constructor(encoding: BinaryToTextEncoding = 'base64') {
    this.encoding = encoding;
  }
  private generateNonce(): Buffer {
    const buffer = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
    sodium.randombytes_buf(buffer);
    return buffer;
  }
  public sealMessage(message: Buffer, secretKey: Buffer): string {
    const nonce = this.generateNonce();

    const ciphertext = Buffer.allocUnsafe(message.length + sodium.crypto_secretbox_MACBYTES);
    sodium.crypto_secretbox_easy(ciphertext, message, nonce, secretKey);

    return ciphertext.toString(this.encoding) + CRYPTO_SPLIT_CHAR + nonce.toString(this.encoding);
  }
  public unsealMessage(message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean } {
    const splitCharIndex = message.lastIndexOf(CRYPTO_SPLIT_CHAR);
    if (splitCharIndex === -1) {
      throw createError('MalformedMessageError', 'The message is malformed');
    }

    const nonce = Buffer.from(message.slice(splitCharIndex + 1), this.encoding);
    if (nonce.length !== sodium.crypto_secretbox_NONCEBYTES) {
      throw createError('NonceLengthError', 'The nonce does not have the required length');
    }
    const ciphertext = Buffer.from(message.slice(0, splitCharIndex), this.encoding);
    if (ciphertext.length < sodium.crypto_secretbox_MACBYTES) {
      throw createError('CipherLengthError', 'The cipher is not long enough');
    }

    const decrypted = Buffer.allocUnsafe(ciphertext.length - sodium.crypto_secretbox_MACBYTES);

    let rotated = false;
    const success = secretKeys.some((secretKey, index) => {
      const decoded = sodium.crypto_secretbox_open_easy(decrypted, ciphertext, nonce, secretKey);
      rotated = decoded && index > 0;
      return decoded;
    });

    if (!success) {
      throw createError('VerifyError', 'Unable to verify');
    }

    return { buffer: decrypted, rotated };
  }
}

export const SODIUM_SECRETBOX = new SodiumSecretbox();
