import request from 'supertest';
import app from '../app.js';
import Product from '../models/Product.js';

const parseCookieValue = (setCookieHeaders = [], name) => {
  const match = setCookieHeaders
    .map((header) => String(header || '').split(';')[0])
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return '';
  return decodeURIComponent(match.slice(name.length + 1));
};

const registerAndCreateAgent = async () => {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .set('Origin', process.env.CLIENT_URL)
    .send({ name: 'Buyer', email: 'buyer@example.com', password: 'password123' })
    .expect(201);

  return {
    agent,
    csrfToken: parseCookieValue(res.headers['set-cookie'] || [], 'jola_csrf'),
  };
};

describe('Orders', () => {
  it('creates cash order with cookie auth + csrf and decrements stock only once', async () => {
    const { agent, csrfToken } = await registerAndCreateAgent();

    const p = await Product.create({
      name: 'Coffee',
      description: 'Tasty coffee',
      price: 1000,
      category: 'drinks',
      brand: 'Jola',
      images: ['https://example.com/img.jpg'],
      stock: 5,
      discount: 0,
    });

    const orderRes = await agent
      .post('/api/orders')
      .set('Origin', process.env.CLIENT_URL)
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('X-Jola-CSRF', csrfToken)
      .send({
        orderItems: [{ product: p._id, quantity: 2 }],
        shippingAddress: {
          street: 'Main 1',
          city: 'City',
          zipCode: '00000',
          country: 'KZ',
        },
        paymentMethod: 'cash',
        deliveryWindow: '1–2 дня',
        deliveryDays: 2,
      })
      .expect(201);

    expect(orderRes.body?.status).toBe('success');
    expect(orderRes.body?.data?.order?._id).toBeTruthy();

    const updated = await Product.findById(p._id).lean();
    expect(updated.stock).toBe(3);
  });
});
