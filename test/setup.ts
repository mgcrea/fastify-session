/* eslint-disable @typescript-eslint/no-namespace */
import { warn } from 'console';
import { inspect } from 'util';
import './typings';

global.d = (...args: unknown[]) =>
  setImmediate(() => warn('🔴 ' + inspect(args.length > 1 ? args : args[0], { colors: true, depth: 10 }) + '\n'));
