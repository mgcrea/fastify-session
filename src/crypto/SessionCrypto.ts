export type SecretKey = Buffer | string | (Buffer | string)[];

export abstract class SessionCrypto {
  abstract readonly protocol: string;
  abstract readonly stateless: boolean;
  abstract deriveSecretKeys(key?: SecretKey, secret?: Buffer | string, salt?: Buffer | string): Buffer[];
  // Sign or encrypt a message (eg. stringified to cookie)
  abstract sealMessage(message: Buffer, secretKey: Buffer): string;
  // Verify or decrypt a message (eg. stringified from cookie)
  abstract unsealMessage(message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean };
}
