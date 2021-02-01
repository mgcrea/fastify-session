import { randomBytes } from 'crypto';

export const CRYPTO_SPLIT_CHAR = '.';

export const generateRandomKey = (): Buffer => {
  return randomBytes(32);
};

export const generateSalt = (): Buffer => {
  return randomBytes(32);
};
