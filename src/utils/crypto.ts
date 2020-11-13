import sodium from 'sodium-native';
import { createError } from './error';

const SPLIT_CHAR = '|';

export const generateNonce = (): Buffer => {
  const buffer = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(buffer);
  return buffer;
};

export const generateSalt = (): Buffer => {
  const buffer = Buffer.allocUnsafe(sodium.crypto_pwhash_SALTBYTES);
  sodium.randombytes_buf(buffer);
  return buffer;
};

export const generateRandomKey = (): Buffer => {
  const buffer = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES);
  sodium.randombytes_buf(buffer);
  return buffer;
};

export const encryptMessage = (message: Buffer, secretKey: Buffer, encoding: BufferEncoding = 'base64'): string => {
  const nonce = generateNonce();

  const ciphertext = Buffer.allocUnsafe(message.length + sodium.crypto_secretbox_MACBYTES);
  sodium.crypto_secretbox_easy(ciphertext, message, nonce, secretKey);

  return ciphertext.toString(encoding) + SPLIT_CHAR + nonce.toString(encoding);
};

export const decryptMessage = (message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean } => {
  // do not use destructuring or it will deopt
  const split = message.split(SPLIT_CHAR);
  if (split.length <= 1) {
    throw createError('MalformedMessageError', 'The message is malformed');
  }

  const ciphertext = Buffer.from(split[0], 'base64');
  const nonce = Buffer.from(split[1], 'base64');

  if (ciphertext.length < sodium.crypto_secretbox_MACBYTES) {
    throw createError('CipherLengthError', 'The cipher is not long enough');
  }

  if (nonce.length !== sodium.crypto_secretbox_NONCEBYTES) {
    throw createError('NonceLengthError', 'The nonce does not have the required length');
  }

  const decrypted = Buffer.allocUnsafe(ciphertext.length - sodium.crypto_secretbox_MACBYTES);

  let rotated = false;
  const success = secretKeys.some((secretKey, index) => {
    const decoded = sodium.crypto_secretbox_open_easy(decrypted, ciphertext, nonce, secretKey);
    rotated = decoded && index > 0;
    return decoded;
  });

  if (!success) {
    throw createError('DecryptError', 'Unable to decrypt');
  }

  return { buffer: decrypted, rotated };
};

export const signMessage = (message: Buffer, secretKey: Buffer, encoding: BufferEncoding = 'base64'): string => {
  const signature = Buffer.allocUnsafe(sodium.crypto_auth_BYTES);
  sodium.crypto_auth(signature, message, secretKey);
  return message.toString(encoding) + SPLIT_CHAR + signature.toString(encoding);
};

export const verifyMessage = (message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean } => {
  // do not use destructuring or it will deopt
  const split = message.split(SPLIT_CHAR);
  if (split.length <= 1) {
    throw createError('MalformedMessageError', 'The message is malformed');
  }
  const cleartext = Buffer.from(split[0], 'base64');
  const signature = Buffer.from(split[1], 'base64');

  if (signature.length !== sodium.crypto_auth_BYTES) {
    throw createError('SignatureLengthError', 'The signature does not have the required length');
  }

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
};
