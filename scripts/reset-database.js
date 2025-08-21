const { sequelize } = require('../db');

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...\n');

    // Disable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    // Drop all existing tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('🗑️  Dropping existing tables...');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`   Dropping table: ${tableName}`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    // Re-enable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log('\n✅ All tables dropped successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Restart the server: npm start');
    console.log('2. The server will recreate all tables with correct structure');
    console.log('3. Run the AI webhook setup: npm run setup-ai-webhook');

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('\n✨ Database reset completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
