require('dotenv').config();

const config = {
    development: {
        dialect: 'postgres',
        username: process.env.POSTGRES_USER || 'postgres',
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        database: process.env.POSTGRES_DATABASE || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        port: process.env.POSTGRES_PORT || 5432,
    },
    production: {
        dialect: 'postgres',
        username: process.env.POSTGRES_USER || 'postgres',
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        database: process.env.POSTGRES_DATABASE || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        port: process.env.POSTGRES_PORT || 5432,
    },
    test: {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
    },
};

module.exports = config[process.env.NODE_ENV || 'development'];