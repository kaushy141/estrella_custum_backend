const { initializeDatabase } = require('../../config/database-init');

async function migrateDatabase() {
    try {
        console.log('🔄 Starting database migration...\n');

        // Run the database initialization which will sync all models
        await initializeDatabase();

        console.log('\n✅ Database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    migrateDatabase();
}

module.exports = { migrateDatabase };

