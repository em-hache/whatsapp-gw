const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET_KEY || 'your-secret-key-here-must-match-backend';

const payload = {
    sub: 'test-user-123',
    email: 'test@example.com',
    role: 'admin'
};

const token = jwt.sign(payload, SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h'
});

console.log('\n=== JWT TOKEN ===');
console.log(token);
console.log('\n=== CURL COMMAND ===');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/qr --output qr.png`);
console.log('\n=== DECODED PAYLOAD ===');
console.log(JSON.stringify(jwt.decode(token), null, 2));
