import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { validateJwtToken } from '../../src/middleware/auth';

describe('JWT Authentication Middleware', () => {
    const JWT_SECRET = 'test-secret-key';
    const USER_ID = 'user-123';
    const USER_EMAIL = 'test@example.com';

    function createMockRequest(authHeader?: string): IncomingMessage {
        return {
            headers: {
                'authorization': authHeader
            }
        } as IncomingMessage;
    }

    function createValidToken(): string {
        return jwt.sign(
            {
                sub: USER_ID,
                email: USER_EMAIL,
                role: 'admin'
            },
            JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: '1h'
            }
        );
    }

    describe('Valid tokens', () => {
        it('should validate a valid JWT token', () => {
            const token = createValidToken();
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(true);
            expect(result.user?.sub).toBe(USER_ID);
            expect(result.user?.email).toBe(USER_EMAIL);
            expect(result.user?.role).toBe('admin');
        });

        it('should validate token with only required fields', () => {
            const token = jwt.sign({ sub: USER_ID }, JWT_SECRET, { algorithm: 'HS256' });
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(true);
            expect(result.user?.sub).toBe(USER_ID);
        });
    });

    describe('Invalid tokens', () => {
        it('should reject request without Authorization header', () => {
            const req = createMockRequest();

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing Authorization header');
            expect(result.statusCode).toBe(401);
        });

        it('should reject request with invalid header format (no Bearer prefix)', () => {
            const token = createValidToken();
            const req = createMockRequest(token);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid Authorization header format');
            expect(result.statusCode).toBe(401);
        });

        it('should reject request with malformed Bearer token', () => {
            const req = createMockRequest('Bearer');

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid Authorization header format');
            expect(result.statusCode).toBe(401);
        });

        it('should reject expired token', () => {
            const token = jwt.sign(
                { sub: USER_ID },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    expiresIn: '-1h' // Already expired
                }
            );
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Token expired');
            expect(result.statusCode).toBe(401);
        });

        it('should reject token with invalid signature', () => {
            const token = createValidToken();
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, 'wrong-secret');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid token');
            expect(result.statusCode).toBe(401);
        });

        it('should reject token without sub field', () => {
            const token = jwt.sign(
                { email: USER_EMAIL }, // Missing 'sub'
                JWT_SECRET,
                { algorithm: 'HS256' }
            );
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toContain('missing user ID');
            expect(result.statusCode).toBe(401);
        });

        it('should reject completely invalid token', () => {
            const req = createMockRequest('Bearer not-a-valid-jwt-token');

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid token');
            expect(result.statusCode).toBe(401);
        });
    });

    describe('Algorithm validation', () => {
        it('should reject token with different algorithm', () => {
            // Create token with RS256 instead of HS256
            const token = jwt.sign(
                { sub: USER_ID },
                JWT_SECRET,
                { algorithm: 'HS512' } // Different algorithm
            );
            const req = createMockRequest(`Bearer ${token}`);

            const result = validateJwtToken(req, JWT_SECRET);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid token');
            expect(result.statusCode).toBe(401);
        });
    });
});
