const { Pool } = require('pg');

let pool;

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

function buildPool() {
  if (!hasDatabaseConfig()) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const useSsl = process.env.DATABASE_SSL === 'true';

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2500,
    idleTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

function getPool() {
  if (!pool) {
    pool = buildPool();
  }

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function optionalQuery(text, params = []) {
  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    return await query(text, params);
  } catch (error) {
    console.warn(`Optional DB query failed. ${error.message}`);
    return null;
  }
}

async function testConnection() {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      connected: false,
      error: 'DATABASE_URL is not configured.',
    };
  }

  try {
    const result = await Promise.race([
      query('select now() as now'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out.')), 2500)
      ),
    ]);

    return {
      configured: true,
      connected: true,
      now: result.rows[0]?.now || null,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error?.message || error?.code || 'Database connection failed.',
    };
  }
}

module.exports = {
  hasDatabaseConfig,
  optionalQuery,
  query,
  testConnection,
};
