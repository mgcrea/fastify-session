export class ErrorWithCode extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(`${code}: ${message}`); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.code = code;
  }
}

export const createError = (code: string, message?: string): ErrorWithCode => new ErrorWithCode(code, message);
