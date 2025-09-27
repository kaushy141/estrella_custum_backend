const { sequelize } = require('../db');

// Import all models to ensure they're registered
const { Group } = require('../models/group-model');
const { User } = require('../models/user-model');
const { Project } = require('../models/project-model');
const { Invoice } = require('../models/invoice-model');
const { ShippingService } = require('../models/shipping-service-model');
const { CustomAgent } = require('../models/custom-agent-model');
const { CustomClearance } = require('../models/custom-clearance-model');
const { CustomDeclaration } = require('../models/custom-declaration-model');
const { CourierReceipt } = require('../models/courier-receipt-model');
const { GroupAddress } = require('../models/group-address-model');
const { ActivityLog } = require('../models/activity-log-model');

// Define the order of table creation (parent tables first)
const syncOrder = [
  'Group',
  'User',
  'Project',
  'Invoice',
  'ShippingService',
  'CustomAgent',
  'CustomClearance',
  'CustomDeclaration',
  'CourierReceipt',
  'GroupAddress',
  'ActivityLog'
];

// Models mapping
const models = {
  Group,
  User,
  Project,
  Invoice,
  ShippingService,
  CustomAgent,
  CustomClearance,
  CustomDeclaration,
  CourierReceipt,
  GroupAddress,
  ActivityLog
};

async function initializeDatabase() {
  try {
    console.log('🔄 Starting database initialization...');

    // Disable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    // Clean up orphaned records in ActivityLog before syncing
    // console.log('🧹 Cleaning up orphaned ActivityLog records...');
    // await sequelize.query(`
    //   UPDATE activityLogs 
    //   SET projectId = NULL 
    //   WHERE projectId IS NOT NULL 
    //   AND projectId NOT IN (SELECT id FROM projects)
    // `);
    // console.log('✅ Orphaned ActivityLog records cleaned up');

    // Sync models in order to avoid foreign key constraint issues
    for (const modelName of syncOrder) {
      const model = models[modelName];
      if (model) {
        console.log(`📋 Syncing ${modelName} table...`);
        // First try to sync with alter: true to update existing tables
        // If table doesn't exist, it will be created automatically
        await model.sync({ alter: true });
        console.log(`✅ ${modelName} table synced successfully`);
      }
    }

    // Re-enable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log('🎉 Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);

    // Ensure foreign key checks are re-enabled even on error
    try {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (fkError) {
      console.error('Failed to re-enable foreign key checks:', fkError);
    }

    throw error;
  }
}

module.exports = { initializeDatabase };
