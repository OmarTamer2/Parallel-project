const express = require('express');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
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

app = express();
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

        const [nameResults] = await sequelize.query('SELECT name FROM users WHERE name = $1', {
            bind: [name],
        });
        if (nameResults.length != 0) {
            return res.status(400).json('The name is already used');
        }

        const [emailResults] = await sequelize.query('SELECT email FROM users WHERE email = $1', {
            bind: [email],
        });
        if (emailResults.length != 0) {
            return res.status(409).json('The Email you entered already exists');
        }

        if (password.length < 8) {
            return res.status(400).json('The password is too short');
        }

        const hashed_password = await bcrypt.hash(password, saltrounds);

        await sequelize.query('INSERT INTO users(name, email, password) VALUES($1, $2, $3)', {
            bind: [name, email, hashed_password],
        });
        return res.status(200).json('user inserted succesful');
    } catch (error) {
        return res.status(404).json({ Error: error.message });
    }
});

app.post('/account/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [results] = await sequelize.query('SELECT * FROM users WHERE email = $1', {
            bind: [email],
        });

        if (results.length == 0) {
            return res.status(401).json('This Email does not exist');
        }

        const valid_password = await bcrypt.compare(password, results[0].password);

        if (!valid_password) {
            return res.status(401).json('Either the password or the Email is wrong');
        }

        //give token
        return res.status(200).json('loged in');
    } catch (error) {
        return res.status(404).json({ Error: error.message });
    }
});

// Test connection and start server
sequelize.authenticate().then(() => {
    app.listen(PORT, () => {
        console.log("Listening on port " + PORT);
    });
}).catch((error) => {
    console.error('Unable to connect to the database:', error);
});