export abstract class SessionCrypto {
  abstract readonly protocol: string;
  abstract readonly stateless: boolean;
  // Sign or encrypt a message (eg. stringified to cookie)
  abstract sealMessage(message: Buffer, secretKey: Buffer): string;
  // Verify or decrypt a message (eg. stringified from cookie)
  abstract unsealMessage(message: string, secretKeys: Buffer[]): { buffer: Buffer; rotated: boolean };
}
