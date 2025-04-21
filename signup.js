const express = require('express');
const {Pool} = require('pg');
const bcrypt = require('bcrypt');
const saltrounds = 12;
const PORT = 8000;

  const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'Users',
    password: 'Oti@3002472',
    port: 5432,
  });

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
    return regex.test(email); // Returns `true` if valid
}

app = express();
app.use(express.json());

app.post('/account/signup', async (req, res) => {
    try{
        const {name , email, password} = req.body;

        if(!name || !email || !password){
            return res.status(400).json('The form cannot be empty');
        }

        if(!validateEmail(email)){
            return res.status(400).json('The Email you entered is not valid');
        }

        const result = await pool.query('select name from users where name = $1', [name])
        if(result.rows.length != 0){
            return res.status(400).json('The name is already used');
        }

        const { rows } = await pool.query('select email from users where email = $1', [email]);
        if(rows.length != 0){
            return res.status(409).json('The Email you entered already exists');
        }

        if (password.length < 8){
            return res.status(400).json('The password is too short');
        }

        const hashed_password = await bcrypt.hash(password, saltrounds)

        await pool.query('insert into users(name, email, password) values($1, $2, $3)', [name, email, hashed_password]);
        return res.status(200).json('user inserted succesful');
    }
    catch(error){
        return res.status(404).json({Error: error.message});
    }
    
})

app.post('/account/login', async (req, res) => {
    try{
        const { email , password } = req.body;
        const {rows} = await pool.query('select * from users where email = $1', [email]);

        if(rows.length == 0){
            return res.status(401).json('This Email does not exist');
        }

        const valid_password = await bcrypt.compare(password, rows[0].password);

        if(!valid_password){
            return res.status(401).json('Either the password or the Email is wrong');
        }

        //give token
        return res.status(200).json('loged in');
    }
    catch(error){
        return res.status(404).json({Error: error.message});
    }
    

})

app.listen(PORT, () => {
    console.log("Listning");
})