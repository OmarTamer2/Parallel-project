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

    await sequelize.query('DROP TABLE IF EXISTS ACCOUNT_PREFERENCES');
    await sequelize.query('DROP TABLE IF EXISTS ACCOUNT_METADATA');
    await sequelize.query('DROP TABLE IF EXISTS ACCOUNT');

    // Insert your fixture
    await sequelize.query(`
      CREATE TABLE ACCOUNT
      (
          password_hash VARCHAR(255) NOT NULL,  -- Storing hashed passwords as strings
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,         -- Email addresses are text
          balance DECIMAL(10,2) NOT NULL,      -- Monetary value should be decimal
          account_id INTEGER PRIMARY KEY
      );
    `).catch(console.error);

    await sequelize.query(`
      INSERT INTO ACCOUNT (name, email, balance, account_id, password_hash)
      VALUES ('Existing User', 'existing@example.com', 100.22, 33, '$bcrypt$2b$10$examplehash')
    `).catch(console.error);

    await sequelize.query(`
        CREATE TABLE ACCOUNT_PREFERENCES
            (
                account_id INTEGER PRIMARY KEY REFERENCES ACCOUNT(account_id),
                language VARCHAR(10) DEFAULT 'en',
                theme VARCHAR(50) DEFAULT 'light',
                notifications_enabled BOOLEAN DEFAULT TRUE
            );
    `);

    await sequelize.query(`
        CREATE TABLE ACCOUNT_METADATA
        (
            account_id INTEGER PRIMARY KEY REFERENCES ACCOUNT(account_id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        );
    `);
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

    const [results_pref] = await sequelize.query(`
        SELECT * FROM ACCOUNT_PREFERENCES WHERE account_id = ${results[0].account_id}
    `);
    expect(results_pref.length).toBe(1);
    expect(results_pref[0].language).toBe('en');
    expect(results_pref[0].theme).toBe('light');
    expect(results_pref[0].notifications_enabled).toBe(1);

    const [results_meta] = await  sequelize.query(`
        SELECT * FROM ACCOUNT_METADATA WHERE account_id = ${results[0].account_id}
    `)

    expect(results_meta.length).toBe(1);
    expect(results_meta[0].created_at).toBeDefined();
    expect(results_meta[0].last_login).toBeNull();
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