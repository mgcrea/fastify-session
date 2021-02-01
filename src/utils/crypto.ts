import sodium from 'sodium-native';

export const CRYPTO_SPLIT_CHAR = '.';

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
