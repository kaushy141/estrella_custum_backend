const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    console.log('🚀 Setting up database...\n');

    // Database configuration
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'customs'
    };

    console.log('Database configuration:');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log(`  Database: ${dbConfig.database}\n`);

    // First connect without specifying database to create it if needed
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    console.log('✅ Connected to MySQL server successfully');

    // Check if database exists
    const [rows] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${dbConfig.database}'`
    );

    if (rows.length === 0) {
      console.log(`📁 Database '${dbConfig.database}' does not exist. Creating...`);
      await connection.execute(`CREATE DATABASE \`${dbConfig.database}\``);
      console.log(`✅ Database '${dbConfig.database}' created successfully`);
    } else {
      console.log(`✅ Database '${dbConfig.database}' already exists`);
    }

    await connection.end();
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. The server will automatically create all required tables');
    console.log('3. Run the AI webhook setup: npm run setup-ai-webhook');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check your MySQL username and password');
      console.log('2. Ensure MySQL is running');
      console.log('3. Create a .env file with correct database credentials');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL server is not running. Please start MySQL first.');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✨ Database setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
