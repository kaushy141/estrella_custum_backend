const { sequelize } = require('../db');

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database structure...\n');

    // Check what tables exist
    const [tables] = await sequelize.query(
      "SHOW TABLES"
    );
    console.log('📋 Available tables:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });

    console.log('\n📊 Table details:');

    // Check group table structure
    try {
      const [groupColumns] = await sequelize.query(
        "DESCRIBE `group`"
      );
      console.log('\n🏷️  Group table structure:');
      groupColumns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key === 'PRI' ? '(PRIMARY)' : ''}`);
      });
    } catch (error) {
      console.log('❌ Error describing group table:', error.message);
    }

    // Check users table structure
    try {
      const [userColumns] = await sequelize.query(
        "DESCRIBE `users`"
      );
      console.log('\n👥 Users table structure:');
      userColumns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key === 'PRI' ? '(PRIMARY)' : ''}`);
      });
    } catch (error) {
      console.log('❌ Error describing users table:', error.message);
    }

    // Check foreign key constraints
    try {
      const [constraints] = await sequelize.query(
        "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = 'customs' AND REFERENCED_TABLE_NAME IS NOT NULL"
      );
      console.log('\n🔗 Foreign key constraints:');
      if (constraints.length === 0) {
        console.log('   No foreign key constraints found');
      } else {
        constraints.forEach(constraint => {
          console.log(`   - ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking constraints:', error.message);
    }

    // Check if group table has data
    try {
      const [groups] = await sequelize.query(
        "SELECT * FROM `group`"
      );
      console.log('\n📁 Groups in database:');
      if (groups.length === 0) {
        console.log('   No groups found');
      } else {
        groups.forEach(group => {
          console.log(`   - ID: ${group.id}, Name: ${group.name}, GUID: ${group.guid}`);
        });
      }
    } catch (error) {
      console.log('❌ Error checking groups:', error.message);
    }

  } catch (error) {
    console.error('❌ Error debugging database:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  debugDatabase()
    .then(() => {
      console.log('\n✨ Database debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugDatabase };
