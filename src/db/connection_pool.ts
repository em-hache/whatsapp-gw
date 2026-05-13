import pg from 'pg';

let connection_pool: pg.Pool | null = null;

export function createPool(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}): pg.Pool {
    connection_pool = new pg.Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: 5,
        ssl: process.env['DB_SSL'] === "false" ? false : { rejectUnauthorized: false },
    });

    connection_pool.on('error', (err) => {
        console.error('Unexpected error on idle database client:', err);
    });

    return connection_pool;
}

export async function closePool(): Promise<void> {
    if (connection_pool) {
        await connection_pool.end();
        connection_pool = null;
    }
}
