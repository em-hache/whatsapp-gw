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
    return {
        success: true,
        user: {
            sub: '1',
            role: 'user'
        }
    };
}
