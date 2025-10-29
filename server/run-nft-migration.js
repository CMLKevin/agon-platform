import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL?.toLowerCase() === 'false' ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting NFT Marketplace Migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '005_add_nft_marketplace.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 Executing SQL...\n');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ NFT Marketplace tables created successfully!\n');
    
    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'nft%'
      ORDER BY table_name
    `);
    
    console.log('📊 NFT Tables created:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
