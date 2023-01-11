import { DEFAULT_COOKIE_NAME } from 'src/plugin';
import { buildFastify, getRandomKey } from 'test/fixtures';
import { afterAll, describe, expect, it } from 'vitest';

describe('cookie option', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = new Map<string, any>([['payload', { foo: 'bar' }]]);
  const fastify = buildFastify({
    session: { cookie: { domain: 'example.com', httpOnly: true }, key: getRandomKey() },
  });
  fastify.addHook('onSend', async (request) => {
    if (context) {
      context.set('session', request.session);
    }
  });
  afterAll(() => {
    fastify.close();
  });
  it('should receive a cookie', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: context.get('payload'),
    });
    expect(response.statusCode).toEqual(200);
    expect(Object.keys(response.headers)).toContain('set-cookie');
    expect(response.headers['set-cookie']).toBeTruthy();
    // @ts-expect-error LightMyRequest.Response.cookies
    expect(response.cookies[0].name).toEqual(DEFAULT_COOKIE_NAME);
    // @ts-expect-error LightMyRequest.Response.cookies
    expect(response.cookies[0].domain).toEqual('example.com');
    // @ts-expect-error LightMyRequest.Response.cookies
    expect(response.cookies[0].httpOnly).toBeTruthy();
    context.set('cookie', response.headers['set-cookie']);
    context.set('sessionId', response.headers['set-cookie']);
  });
  it('should properly match an existing session', async () => {
    const lastSessionId = context.get('session').id;
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: context.get('cookie'),
      },
    });
    expect(response.statusCode).toEqual(200);
    expect(Object.keys(response.headers)).not.toContain('set-cookie');
    expect(response.payload).toEqual(JSON.stringify(context.get('payload')));
    expect(lastSessionId).toEqual(context.get('session').id);
  });
});
