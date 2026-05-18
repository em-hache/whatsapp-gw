import jwt from 'jsonwebtoken';

/**
 * Generates a JWT token for service-to-service authentication
 * @param jwtSecret The secret key to sign the token
 * @returns JWT token string
 */
export function generateServiceToken(jwtSecret: string): string {
    const payload = {
        sub: 'whatsapp-gw-service',
        service: 'whatsapp-gateway',
        role: 'service'
    };

    const token = jwt.sign(payload, jwtSecret, {
        algorithm: 'HS256',
        expiresIn: '24h'
    });

    return token;
}
