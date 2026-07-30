import { test, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { resetTestDatabase, uniqueEmail } from './setup';

let request: typeof import('supertest');
let app: import('express').Express;
let jwtSecret: string;

before(async () => {
  await resetTestDatabase();
  request = (await import('supertest')).default as unknown as typeof import('supertest');
  ({ app } = await import('../src/app'));
  ({ config: { jwtSecret } } = await import('../src/config') as unknown as {
    config: { jwtSecret: string };
  });
});

async function signUp(overrides: Partial<{ email: string; password: string }> = {}) {
  const email = overrides.email ?? uniqueEmail('user');
  const password = overrides.password ?? 'CorrectHorse123!';
  const response = await (request as any)(app)
    .post('/api/auth/signup')
    .send({
      email,
      password,
      metadata: { first_name: 'Test', last_name: 'User' },
    });
  return { email, password, response };
}

describe('signup validation', () => {
  test('rejects a password shorter than 8 characters', async () => {
    const { response } = await signUp({ password: 'short' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_SIGNUP');
  });

  test('rejects a malformed email', async () => {
    const { response } = await signUp({ email: 'not-an-email' });
    assert.equal(response.status, 400);
  });

  test('rejects a duplicate email', async () => {
    const email = uniqueEmail('dup');
    await signUp({ email });
    const { response } = await signUp({ email });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'ACCOUNT_EXISTS');
  });

  test('creates a usable session on success', async () => {
    const { response } = await signUp();
    assert.equal(response.status, 201);
    assert.ok(response.body.data.session.access_token);
  });
});

describe('login', () => {
  test('rejects an incorrect password', async () => {
    const { email } = await signUp();
    const response = await (request as any)(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123!' });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('locks the account after repeated failed attempts', async () => {
    const { email } = await signUp();
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await (request as any)(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword123!' });
    }
    assert.equal(last!.status, 423);
    assert.equal(last!.body.error.code, 'ACCOUNT_LOCKED');

    const lockedAttempt = await (request as any)(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123!' });
    assert.equal(lockedAttempt.status, 423);
  });

  test('succeeds with correct credentials', async () => {
    const { email, password } = await signUp();
    const response = await (request as any)(app)
      .post('/api/auth/login')
      .send({ email, password });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.session.access_token);
  });
});

describe('authentication', () => {
  test('rejects requests with no token', async () => {
    const response = await (request as any)(app).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  test('rejects an expired token', async () => {
    const { email } = await signUp();
    const token = jwt.sign({ sub: email, email }, jwtSecret, { expiresIn: -10 });
    const response = await (request as any)(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${token}`);
    assert.equal(response.status, 401);
  });

  test('rejects a token signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: 'abc', email: 'a@b.com' }, 'wrong-secret', {
      expiresIn: '1h',
    });
    const response = await (request as any)(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${token}`);
    assert.equal(response.status, 401);
  });
});

describe('cross-user data authorization', () => {
  async function loginSession() {
    const { email, password } = await signUp();
    const loginResponse = await (request as any)(app)
      .post('/api/auth/login')
      .send({ email, password });
    return loginResponse.body.data.session as { access_token: string; user: { id: string } };
  }

  test('a user cannot update another user\'s book', async () => {
    const owner = await loginSession();
    const attacker = await loginSession();

    const createResponse = await (request as any)(app)
      .post('/api/data/books')
      .set('authorization', `Bearer ${owner.access_token}`)
      .send({
        operation: 'insert',
        values: { title: 'Owned Book', author: 'A. Author', description: 'x', category: 'fiction', language: 'en', condition: 'new', price: 5 },
      });
    assert.equal(createResponse.status, 201);
    const bookId = createResponse.body.data[0].id;

    const attackResponse = await (request as any)(app)
      .post('/api/data/books')
      .set('authorization', `Bearer ${attacker.access_token}`)
      .send({
        operation: 'update',
        values: { title: 'Hijacked Title' },
        filters: [{ column: 'id', operator: 'eq', value: bookId }],
      });
    assert.equal(attackResponse.status, 200);
    assert.equal(attackResponse.body.data.length, 0);

    const readResponse = await (request as any)(app)
      .get('/api/data/books')
      .query({ filters: JSON.stringify([{ column: 'id', operator: 'eq', value: bookId }]) });
    assert.equal(readResponse.body.data[0].title, 'Owned Book');
  });

  test('a user cannot read another user\'s wishlist', async () => {
    const owner = await loginSession();
    const attacker = await loginSession();

    await (request as any)(app)
      .post('/api/data/wishlist')
      .set('authorization', `Bearer ${owner.access_token}`)
      .send({ operation: 'insert', values: { google_books_id: 'gb-1' } });

    const response = await (request as any)(app)
      .get('/api/data/wishlist')
      .set('authorization', `Bearer ${attacker.access_token}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 0);
  });

  test('anonymous requests cannot read private tables', async () => {
    const response = await (request as any)(app).get('/api/data/wishlist');
    assert.equal(response.status, 401);
  });
});
