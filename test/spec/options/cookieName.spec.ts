import { buildFastify, getRandomKey } from 'test/fixtures';

describe('cookieName option', () => {
  const context = new Map<string, any>([['payload', { foo: 'bar' }]]);
  const fastify = buildFastify({
    session: { cookieName: 'foobar', key: getRandomKey() },
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
    expect(response.cookies[0].name).toEqual('foobar');
    context.set('cookie', response.headers['set-cookie']);
  });
  it('should properly match an existing session', async () => {
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
  });
});
