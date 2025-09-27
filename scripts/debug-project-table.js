const { sequelize } = require('../db');
const { Project } = require('../models/project-model');

async function debugProjectTable() {
    try {
        console.log('🔍 Debugging Project table creation...\n');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Check if projects table exists
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'projects'");
        console.log(`📋 Projects table exists: ${tables.length > 0}`);

        if (tables.length === 0) {
            console.log('🔧 Creating projects table...');

            // Disable foreign key checks
            await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

            try {
                await Project.sync({ force: true });
                console.log('✅ Projects table force created successfully');
            } catch (error) {
                console.error('❌ Error force creating projects table:', error.message);
                console.error('Full error:', error);
            }

            // Re-enable foreign key checks
            await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
        } else {
            console.log('📊 Projects table already exists');

            // Show table structure
            const [columns] = await sequelize.query("DESCRIBE projects");
            console.log('📋 Table structure:');
            columns.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });
        }

        // Test if we can query the table
        try {
            const count = await Project.count();
            console.log(`📊 Projects table has ${count} records`);
        } catch (error) {
            console.error('❌ Error querying projects table:', error.message);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

// Run if called directly
if (require.main === module) {
    debugProjectTable()
        .then(() => {
            console.log('\n✨ Debug completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugProjectTable };
