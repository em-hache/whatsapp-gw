# Testing Scripts

Scripts for testing the QR authentication endpoint locally.

## Quick Start

### Node.js (Recommended)

```bash
# Generate a test JWT token and get curl command
npm run generate-token

# Copy the curl command from output and run it
curl -H "Authorization: Bearer <token>" http://localhost:3000/qr --output qr.png
```

### Python

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Set your JWT secret (same as in .env)
export JWT_SECRET_KEY="your-secret-key-here"

# Fetch QR code
python3 scripts/fetch-qr.py

# QR code saved to qr.png
```

### Manual with existing token

If you already have a JWT token from your backend:

```bash
# Fetch and save QR as image
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/qr \
  --output qr.png

# View response headers only
curl -I -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/qr
```

## Response Codes

- `200 OK` + PNG image → QR code available, scan it with WhatsApp
- `204 No Content` → Already authenticated, no QR needed
- `401 Unauthorized` → Invalid/expired/missing token

## Integration with Frontend

Your frontend should make a GET request with the user's JWT token:

```javascript
// React/Vue/Angular example
const token = localStorage.getItem('authToken'); // or from your auth state

fetch('http://localhost:3000/qr', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(response => {
    if (response.status === 200) {
      return response.blob();
    } else if (response.status === 204) {
      console.log('Already authenticated');
      return null;
    } else if (response.status === 401) {
      throw new Error('Unauthorized');
    }
  })
  .then(blob => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      document.getElementById('qr-image').src = url;
    }
  })
  .catch(error => console.error('Error:', error));
```

## Troubleshooting

### "401 Unauthorized"

- Check that `JWT_SECRET_KEY` in your `.env` matches the backend
- Verify token is not expired
- Ensure `Authorization: Bearer <token>` header format is correct

### "Invalid token"

- Token must be signed with HS256 algorithm
- Token must include `sub` field (user ID)
- Secret key must match exactly

### "Connection refused"

- Ensure gateway is running: `npm start`
- Check port 3000 is not in use by another service
