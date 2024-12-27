const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'UserRegistration'
});
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, mobile, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        await db.execute('CALL CreateUser(?, ?, ?, ?, ?)', [
            firstName, lastName, mobile, passwordHash, 'system'
        ]);
        res.status(201).send('User created successfully');
    } catch (err) {
        res.status(500).send('Error creating user');
    }
});
app.get('/api/user/:mobile', async (req, res) => {
    const { mobile } = req.params;

    try {
        const [rows] = await db.execute('CALL GetUser(?)', [mobile]);
        if (rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).send('Error fetching user');
    }
});

app.put('/api/user/:mobile', async (req, res) => {
    const { mobile } = req.params;
    const { firstName, lastName, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        await db.execute('CALL UpdateUser(?, ?, ?, ?, ?)', [
            mobile, firstName, lastName, passwordHash, 'system'
        ]);
        res.send('User updated successfully');
    } catch (err) {
        res.status(500).send('Error updating user');
    }
});
app.delete('/api/user/:mobile', async (req, res) => {
    const { mobile } = req.params;

    try {
        await db.execute('CALL DeleteUser(?)', [mobile]);
        res.send('User deleted successfully');
    } catch (err) {
        res.status(500).send('Error deleting user');
    }
});
app.post('/api/login', async (req, res) => {
    const { mobile, password } = req.body;

    try {
        const [rows] = await db.execute('CALL GetUser(?)', [mobile]);
        if (rows.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).send('Invalid credentials');
        }

        const token = jwt.sign({ id: user.id, mobile: user.mobile }, 'secret', { expiresIn: '1h' });
        res.json({ message: `Good ${greetTime()}, ${user.first_name} ${user.last_name}`, token });
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});
function greetTime() {
    const hours = new Date().getUTCHours();
    if (hours < 12) return 'Morning';
    if (hours < 18) return 'Afternoon';
    return 'Evening';
}
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
