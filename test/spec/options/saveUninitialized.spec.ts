import { buildFastify, getRandomKey } from 'test/fixtures';

describe('saveUninitialized option', () => {
  describe('with a falsy value', () => {
    const context = new Map<string, any>([['payload', { foo: 'bar' }]]);
    const fastify = buildFastify({
      session: { saveUninitialized: false, key: getRandomKey() },
    });
    afterAll(() => {
      fastify.close();
    });
    it('should receive a cookie', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/noop',
        payload: context.get('payload'),
      });
      expect(response.statusCode).toEqual(200);
      expect(Object.keys(response.headers)).not.toContain('set-cookie');
    });
  });
  describe('with a truthy value', () => {
    const context = new Map<string, any>([['payload', { foo: 'bar' }]]);
    const fastify = buildFastify({
      session: { saveUninitialized: true, key: getRandomKey() },
    });
    afterAll(() => {
      fastify.close();
    });
    it('should receive a cookie', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/noop',
        payload: context.get('payload'),
      });
      expect(response.statusCode).toEqual(200);
      expect(Object.keys(response.headers)).toContain('set-cookie');
      expect(response.headers['set-cookie']).toBeTruthy();
      // @ts-expect-error LightMyRequest.Response.cookies
      expect(response.cookies[0].name).toEqual('Session');
      context.set('cookie', response.headers['set-cookie']);
    });
  });
});
