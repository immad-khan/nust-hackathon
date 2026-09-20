const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running DDL migrations...');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_seen BOOLEAN NOT NULL DEFAULT false;');
    console.log('Added admin_seen to orders.');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(200) NOT NULL UNIQUE,
        type VARCHAR(60) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT NOT NULL DEFAULT '',
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created sync_log table.');
    
    const resOrders = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';");
    console.log('Orders columns:', resOrders.rows.map(r => r.column_name));
    
    const resSyncLog = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sync_log';");
    console.log('sync_log columns:', resSyncLog.rows.map(r => r.column_name));
    
    console.log('Migration completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
