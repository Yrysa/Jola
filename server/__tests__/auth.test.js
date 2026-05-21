import request from 'supertest';
import app from '../app.js';

const parseCookieValue = (setCookieHeaders = [], name) => {
  const match = setCookieHeaders
    .map((header) => String(header || '').split(';')[0])
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return '';
  return decodeURIComponent(match.slice(name.length + 1));
};

describe('Auth', () => {
  it('registers with cookie auth, issues csrf cookie and returns public user only', async () => {
    const agent = request.agent(app);

    const reg = await agent
      .post('/api/auth/register')
      .set('Origin', process.env.CLIENT_URL)
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(reg.body?.status).toBe('success');
    expect(reg.body?.data?.token).toBeUndefined();
    expect(reg.body?.data?.user?.email).toBe('test@example.com');

    const setCookie = reg.headers['set-cookie'] || [];
    expect(parseCookieValue(setCookie, 'jola_token')).toBeTruthy();
    expect(parseCookieValue(setCookie, 'jola_csrf')).toBeTruthy();

    const me = await agent
      .get('/api/auth/me')
      .set('Origin', process.env.CLIENT_URL)
      .expect(200);

    expect(me.body?.status).toBe('success');
    expect(me.body?.data?.user?.email).toBe('test@example.com');
    expect(me.body?.data?.user?.resetPasswordToken).toBeUndefined();
  });

  it('logs in with cookie auth and no bearer token in payload', async () => {
    await request(app)
      .post('/api/auth/register')
      .set('Origin', process.env.CLIENT_URL)
      .send({ name: 'Test User', email: 'login@example.com', password: 'password123' })
      .expect(201);

    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set('Origin', process.env.CLIENT_URL)
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    expect(login.body?.status).toBe('success');
    expect(login.body?.data?.token).toBeUndefined();
    expect(login.body?.data?.user?.email).toBe('login@example.com');

    const setCookie = login.headers['set-cookie'] || [];
    expect(parseCookieValue(setCookie, 'jola_token')).toBeTruthy();
    expect(parseCookieValue(setCookie, 'jola_csrf')).toBeTruthy();
  });
});
