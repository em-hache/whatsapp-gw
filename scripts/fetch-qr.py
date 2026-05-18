#!/usr/bin/env python3
import jwt
import requests
import os
from datetime import datetime, timedelta

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here-must-match-backend')
GATEWAY_URL = os.getenv('GATEWAY_URL', 'http://localhost:3000')

payload = {
    'sub': 'test-user-123',
    'email': 'test@example.com',
    'role': 'admin',
    'iat': datetime.utcnow(),
    'exp': datetime.utcnow() + timedelta(hours=24)
}

token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

print(f'\n=== Fetching QR from {GATEWAY_URL}/qr ===\n')

headers = {
    'Authorization': f'Bearer {token}'
}

response = requests.get(f'{GATEWAY_URL}/qr', headers=headers)

if response.status_code == 200:
    with open('qr.png', 'wb') as f:
        f.write(response.content)
    print('✅ QR code saved to qr.png')
elif response.status_code == 204:
    print('ℹ️  WhatsApp is already authenticated (no QR needed)')
elif response.status_code == 401:
    print(f'❌ Authentication failed: {response.json()}')
else:
    print(f'❌ Error {response.status_code}: {response.text}')
