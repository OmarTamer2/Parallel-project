const request = require('supertest');
const { server, app, sequelize } = require('./signup.js');
const {beforeAll, beforeEach, afterAll, describe, it, expect, afterEach} = require("@jest/globals");
const nock = require('nock');

beforeAll(async () => {
    // Make sure DB schema is ready
    await sequelize.sync({ force: true });

    // force auth service host and port
    process.env.AUTH_HOST = 'fake-auth-service';
    process.env.AUTH_PORT = '8080';
});

beforeEach(async () => {
    // Clean and re-seed DB before each test
    await sequelize.truncate({ cascade: true });
    // await sequelize.sync({ force: true });

    await sequelize.query('DROP TABLE IF EXISTS ACCOUNT');

    // Insert your fixture
    await sequelize.query(`
      CREATE TABLE ACCOUNT
      (
          password_hash VARCHAR(255) NOT NULL,  -- Storing hashed passwords as strings
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,         -- Email addresses are text
          balance DECIMAL(10,2) NOT NULL,      -- Monetary value should be decimal
          account_id INT,
          PRIMARY KEY (account_id)
      );
    `).catch(console.error);

    await sequelize.query(`
      INSERT INTO ACCOUNT (name, email, balance, account_id, password_hash)
      VALUES ('Some user with password: password', 'some@user.com', 8799.10, 2, '$2b$12$3nNt.K/mxu5XkyNQuOpDVe4c0Gzug53AFvxsHEnYzrsWnnLup1ueu')
    `).catch(console.error);

    nock('http://fake-auth-service:8080')
        .post('/auth/create-token?user_id=2')
        .reply(200, { token: 'fake-token' });
});

afterEach(async () => {
    nock.cleanAll();
})

afterAll(async () => {
    // Close DB connection
    await sequelize.close();
    await new Promise((resolve) => server.close(resolve));
});

describe('API Login Tests', () => {
    it('should reject non existing user (401)', async () => {
        const res = await request(app)
            .post('/account/login')
            .send({
              email: 'non-existing@user.com',
              password: 'some-password'
            })
            .expect(401);
    });

    it('should reject existing user with wrong password (401)', async () => {
        const res = await request(app)
            .post('/account/login')
            .send({
                email: 'some@user.com',
                password: 'wrong-password'
            })
            .expect(401);
    });

    it('should return token when existing user with correct password (200)', async () => {
        const res = await request(app)
            .post('/account/login')
            .send({
                email: 'some@user.com',
                password: 'password'
            })
            .expect(200);

        expect(res.body.token).toBe('fake-token');
        expect(res.body.user.name).toBe('Some user with password: password');
        expect(res.body.user.email).toBe('some@user.com');
    });
});