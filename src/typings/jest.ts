import { warn } from 'console';

declare global {
  namespace NodeJS {
    interface Global {
      d: typeof warn;
    }
  }
}
