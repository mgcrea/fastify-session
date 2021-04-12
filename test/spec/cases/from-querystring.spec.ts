import { buildFastify, getRandomKey } from 'test/fixtures';

describe('session from querystring', () => {
  const context = new Map<string, any>([['payload', { foo: 'bar' }]]);
  const fastify = buildFastify({
    session: { cookieName: 'foobar', key: getRandomKey(), querystring: { key: 'session' } },
  });
  afterAll(() => {
    fastify.close();
  });
  it('should receive a token', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/q',
      payload: context.get('payload'),
    });
    expect(response.statusCode).toEqual(200);
    const body = JSON.parse(response.body);
    expect(Object.keys(body)).toContain('token');
    context.set('token', body.token);
  });

  it('should decode session from querystring', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/session',
      query: { session: context.get('token') },
      payload: context.get('payload'),
    });
    expect(response.statusCode).toEqual(200);
    const payload = JSON.parse(response.payload).data;
    expect(payload.data).toEqual(context.get('payload'));
  });
});
