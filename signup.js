const express = require('express');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const saltrounds = 12;

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const config = require('./config');

// Initialize Sequelize
const sequelize = new Sequelize(config);

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
    return regex.test(email); // Returns `true` if valid
}

const app = express();
app.use(express.json());

app.post('/account/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json('The form cannot be empty');
        }

        if (!validateEmail(email)) {
            return res.status(400).json('The Email you entered is not valid');
        }

        // const [nameResults] = await sequelize.query('SELECT name FROM ACCOUNT WHERE name = $1', {
        //     bind: [name],
        // });
        // if (nameResults.length != 0) {
        //     return res.status(400).json('The name is already used');
        // }

        const [emailResults] = await sequelize.query('SELECT email FROM ACCOUNT WHERE email = $1', {
            bind: [email],
        });
        if (emailResults.length != 0) {
            return res.status(409).json('The Email you entered already exists');
        }

        if (password.length < 8) {
            return res.status(400).json('The password is too short');
        }

        const hashed_password = await bcrypt.hash(password, saltrounds);

        await sequelize.query('INSERT INTO ACCOUNT(name, email, password_hash, balance) VALUES($1, $2, $3, $4)', {
            bind: [name, email, hashed_password, 0], // account_id is auto-incremented by the database whether Postgres or SQLite
        });
        return res.status(201).json('user inserted succesful');
    } catch (error) {
        return res.status(404).json({ Error: error.message });
    }
});

app.post('/account/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [results] = await sequelize.query('SELECT * FROM ACCOUNT WHERE email = $1', {
            bind: [email],
        });

        if (results.length == 0) {
            return res.status(401).json('This Email does not exist');
        }

        const valid_password = await bcrypt.compare(password, results[0].password_hash);

        if (!valid_password) {
            return res.status(401).json('Either the password or the Email is wrong');
        }

        // contact auth service and pass user id
        // noinspection HttpUrlsUsage
        const result = await axios.post(`http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/auth/create-token?user_id=${results[0].account_id}`)

        //give token
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(404).json({ Error: error.message });
    }
});

app.post('/account/create-external-token', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid Bearer token' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token

    try {
        // noinspection HttpUrlsUsage
        const response = await axios.post(`http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/auth/verify-token`, { token });

        if (response.data && response.data.valid) {
            const id = response.data.user;

            // noinspection HttpUrlsUsage
            const result = await axios.post(`http://${process.env.AUTH_HOST}:${process.env.AUTH_PORT}/auth/create-token?user_id=${id}`)

            //give token
            return res.status(200).json(result.data);
        } else {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
    } catch (error) {
        console.error('Error communicating with auth service:', error.message);
        return res.status(500).json({ message: 'Internal server error: Authentication failed' });
    }
});

const server = app.listen(PORT, () => {
    console.log("Listening on port " + PORT);
});

sequelize.authenticate().catch((error) => {
    console.error('Unable to connect to the database:', error);
    server.close();
});

module.exports = { server, app, sequelize };