# Fastify Session

[![npm version](https://img.shields.io/npm/v/mgcrea/fastify-session.svg)](https://github.com/mgcrea/fastify-session/releases)
[![license](https://img.shields.io/npm/l/mgcrea/fastify-session)](https://tldrlegal.com/license/mit-license)
[![build status](https://img.shields.io/github/workflow/status/mgcrea/fastify-session/ci)](https://github.com/mgcrea/fastify-session/actions)
[![dependencies status](https://img.shields.io/david/mgcrea/fastify-session)](https://david-dm.org/mgcrea/fastify-session)
[![devDependencies status](https://img.shields.io/david/dev/mgcrea/fastify-session)](https://david-dm.org/mgcrea/fastify-session?type=dev)

Session plugin for [fastify](https://github.com/fastify/fastify) that supports both stateless (without store)

- Requires [fastify-cookie](https://github.com/fastify/fastify-cookiek) to handle cookies.

- Relies on [sodium-native](https://github.com/sodium-friends/sodium-native) to perform crypto.

- Built with [TypeScript](https://www.typescriptlang.org/) for static type checking with exported types along the
  library.

## Usage

```bash
npm install fastify-cookie @mgcrea/fastify-session --save
# or
yarn add fastify-cookie @mgcrea/fastify-session
```

### Stateless session

No external store required, the entire session data is encrypted using a secret-key with
[libsodium's crypto_secretbox_easy](https://libsodium.gitbook.io/doc/secret-key_cryptography/secretbox)

### Using a key (recommended)

```ts
import createFastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyCookie from 'fastify-cookie';
import fastifySession from '@mgcrea/fastify-session';
import Redis from 'ioredis';
import { IS_PROD, IS_TEST, REDIS_URI, SESSION_TTL } from './config/env';
import { RedisStore } from 'fastify-redis-session';

const SESSION_KEY = 'Egb/g4RUumlD2YhWYfeDlm5MddajSjGEBhm0OW+yo9s='';
const SESSION_TTL = 864e3; // 1 day

export const buildFastify = (options?: FastifyServerOptions): FastifyInstance => {
  const fastify = createFastify(options);

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, {
    key: Buffer.from(SESSION_KEY, 'base64'),
    cookie: { maxAge: SESSION_TTL },
  });

  return fastify;
};
```

### Using a secret (will derive a key on startup)

```ts
import createFastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyCookie from 'fastify-cookie';
import fastifySession from '@mgcrea/fastify-session';
import Redis from 'ioredis';
import { IS_PROD, IS_TEST, REDIS_URI, SESSION_TTL } from './config/env';
import { RedisStore } from 'fastify-redis-session';

const SESSION_TTL = 864e3; // 1 day

export const buildFastify = (options?: FastifyServerOptions): FastifyInstance => {
  const fastify = createFastify(options);

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, {
    secret: 'a secret with minimum length of 32 characters',
    cookie: { maxAge: SESSION_TTL },
  });

  return fastify;
};
```

### Stateful session

Leveraging an external store, the session id (generated with [nanoid](https://github.com/ai/nanoid)) is signed using a
secret-key with
[libsodium's crytpo_auth](https://libsodium.gitbook.io/doc/secret-key_cryptography/secret-key_authentication)

### Using a in memory store (not production-ready!)

```ts
import createFastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyCookie from 'fastify-cookie';
import fastifySession, { MemoryStore } from '@mgcrea/fastify-session';
import Redis from 'ioredis';
import { IS_PROD, IS_TEST, REDIS_URI, SESSION_TTL } from './config/env';
import { RedisStore } from 'fastify-redis-session';

const SESSION_TTL = 864e3; // 1 day

export const buildFastify = (options?: FastifyServerOptions): FastifyInstance => {
  const fastify = createFastify(options);

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, {
    store: new MemoryStore(),
    secret: 'a secret with minimum length of 32 characters',
    cookie: { maxAge: SESSION_TTL },
  });

  return fastify;
};
```

### Using an external store (eg. redis)

Using [fastify-redis-session](https://github.com/mgcrea/fastify-redis-session)

```ts
import createFastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyCookie from 'fastify-cookie';
import fastifySession from '@mgcrea/fastify-session';
import Redis from 'ioredis';
import { IS_PROD, IS_TEST, REDIS_URI, SESSION_TTL } from './config/env';
import { RedisStore } from 'fastify-redis-session';

const SESSION_TTL = 864e3; // 1 day

export const buildFastify = (options?: FastifyServerOptions): FastifyInstance => {
  const fastify = createFastify(options);

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, {
    store: new RedisStore({ client: new Redis(REDIS_URI), ttl: SESSION_TTL }),
    secret: 'a secret with minimum length of 32 characters',
    cookie: { maxAge: SESSION_TTL },
  });

  return fastify;
};
```

## Authors

- [Olivier Louvignes](https://github.com/mgcrea) <<olivier@mgcrea.io>>

### Credits

Heavily inspired from

- [fastify-secure-session](https://github.com/fastify/fastify-secure-session) by
  [Matteo Collina](https://github.com/mcollina)
- [fastify-session](https://github.com/SerayaEryn/fastify-session) by [Denis Fäcke](https://github.com/SerayaEryn)
- [express-session](https://github.com/expressjs/session) by [Douglas Wilson](https://github.com/dougwilson)

## License

```
The MIT License

Copyright (c) 2020 Olivier Louvignes <olivier@mgcrea.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
