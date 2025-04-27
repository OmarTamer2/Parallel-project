const request = require('supertest');
const { server, app, sequelize } = require('./signup.js');
const {beforeAll, beforeEach, afterAll, describe, it, expect} = require("@jest/globals");

beforeAll(async () => {
    // Make sure DB schema is ready
    await sequelize.sync({ force: true });
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
      VALUES ('Existing User', 'existing@example.com', 100.22, 33, '$bcrypt$2b$10$examplehash')
    `).catch(console.error);
});

afterAll(async () => {
    // Close DB connection
    await sequelize.close();
    await new Promise((resolve) => server.close(resolve));
});

describe('API Signup Tests', () => {
  it('should create a new account (201)', async () => {
    const res = await request(app)
        .post('/account/signup')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'newuserpassword'
        })
        .expect(201);

    // Check database
    const [results] = await sequelize.query(`
            SELECT * FROM ACCOUNT WHERE email = 'newuser@example.com'
        `);

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('New User');
  });

  it('should reject invalid payload (400)', async () => {
    const res = await request(app)
        .post('/account/signup')
        .send({
          email: 'missingname@example.com',
          password: 'somepassword'
        })
        .expect(400);
  });

  it('should reject duplicate email (409)', async () => {
    const res = await request(app)
        .post('/account/signup')
        .send({
          name: 'Another User',
          email: 'existing@example.com', // already inserted in fixture
          password: 'anotherpassword'
        })
        .expect(409);
  });
});