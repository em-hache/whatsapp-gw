import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

export interface JwtPayload {
    sub: string;
    email?: string;
    role?: string;
    iat?: number;
    exp?: number;
}

export interface AuthResult {
    success: boolean;
    user?: JwtPayload;
    error?: string;
    statusCode?: number;
}

export function validateJwtToken(req: IncomingMessage, jwtSecret: string): AuthResult {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return {
                success: false,
                error: 'Missing Authorization header',
                statusCode: 401
            };
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
            return {
                success: false,
                error: 'Invalid Authorization header format. Expected: Bearer <token>',
                statusCode: 401
            };
        }

        const token = parts[1];
        const decoded = jwt.verify(token, jwtSecret, {
            algorithms: ['HS256']
        }) as JwtPayload;

        if (!decoded.sub) {
            return {
                success: false,
                error: 'Invalid token: missing user ID (sub)',
                statusCode: 401
            };
        }

        return {
            success: true,
            user: decoded
        };

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return {
                success: false,
                error: 'Token expired',
                statusCode: 401
            };
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return {
                success: false,
                error: 'Invalid token',
                statusCode: 401
            };
        }

        console.error('JWT validation error:', error);
        return {
            success: false,
            error: 'Internal authentication error',
            statusCode: 500
        };
    }
}
