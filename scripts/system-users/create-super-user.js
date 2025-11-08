const { sequelize } = require('../../db');
const { User } = require('../../models/user-model');
const { Group } = require('../../models/group-model');
const crypto = require('crypto');
require('dotenv').config();

async function createSuperUser() {
    try {
        console.log('🚀 Creating super user...\n');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Check if any super admin already exists
        const existingSuperAdmin = await User.findOne({
            where: { isSuperAdmin: true }
        });

        if (existingSuperAdmin) {
            console.log('⚠️  Super admin already exists:');
            console.log(`   Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
            console.log(`   Email: ${existingSuperAdmin.email}`);
            console.log(`   Group ID: ${existingSuperAdmin.groupId}`);
            console.log('\n💡 To create another super user, please use the admin panel or modify this script.');
            return;
        }

        // Create or find default group
        let defaultGroup = await Group.findOne({
            where: { name: 'Estrella Admin' }
        });

        if (!defaultGroup) {
            console.log('📁 Creating default admin group...');
            defaultGroup = await Group.create({
                name: 'Estrella Admin',
                description: 'Default admin group for Estrella system',
                logo: null,
                isActive: true
            });
            console.log(`✅ Default group created with ID: ${defaultGroup.id}`);
        } else {
            console.log(`✅ Using existing group: ${defaultGroup.name} (ID: ${defaultGroup.id})`);
        }

        // Super user details
        const superUserData = {
            groupId: defaultGroup.id,
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@estrella.com',
            password: crypto.createHash('sha256').update('admin123').digest('hex'),
            isAdmin: true,
            isSuperAdmin: true,
            isActive: true
        };

        // Check if user with this email already exists
        const existingUser = await User.findOne({
            where: { email: superUserData.email }
        });

        if (existingUser) {
            console.log('⚠️  User with this email already exists. Updating to super admin...');
            await existingUser.update({
                isAdmin: true,
                isSuperAdmin: true,
                isActive: true,
                groupId: defaultGroup.id
            });
            console.log('✅ User updated to super admin');
        } else {
            // Create super user
            console.log('👤 Creating super user...');
            const superUser = await User.create(superUserData);
            console.log('✅ Super user created successfully');
            console.log(`   ID: ${superUser.id}`);
            console.log(`   Name: ${superUser.firstName} ${superUser.lastName}`);
            console.log(`   Email: ${superUser.email}`);
            console.log(`   Group: ${defaultGroup.name}`);
        }

        console.log('\n🎉 Super user setup completed!');
        console.log('\n📋 Login credentials:');
        console.log(`   Email: ${superUserData.email}`);
        console.log(`   Password: admin123`);
        console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    } catch (error) {
        console.error('❌ Error creating super user:', error.message);
        console.error('Full error:', error);
    } finally {
        await sequelize.close();
    }
}

// Interactive version for custom super user
async function createCustomSuperUser() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    try {
        console.log('🚀 Creating custom super user...\n');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Get user input
        const firstName = await new Promise(resolve => {
            rl.question('Enter first name: ', resolve);
        });

        const lastName = await new Promise(resolve => {
            rl.question('Enter last name: ', resolve);
        });

        const email = await new Promise(resolve => {
            rl.question('Enter email: ', resolve);
        });

        const password = await new Promise(resolve => {
            rl.question('Enter password: ', resolve);
        });

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            console.log('❌ All fields are required');
            return;
        }

        // Check if user with this email already exists
        const existingUser = await User.findOne({
            where: { email: email }
        });

        if (existingUser) {
            console.log('❌ User with this email already exists');
            return;
        }

        // Create or find default group
        let defaultGroup = await Group.findOne({
            where: { name: 'Estrella Admin' }
        });

        if (!defaultGroup) {
            console.log('📁 Creating default admin group...');
            defaultGroup = await Group.create({
                name: 'Estrella Admin',
                description: 'Default admin group for Estrella system',
                logo: null,
                isActive: true
            });
            console.log(`✅ Default group created with ID: ${defaultGroup.id}`);
        }

        // Create super user
        const superUser = await User.create({
            groupId: defaultGroup.id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            isAdmin: true,
            isSuperAdmin: true,
            isActive: true
        });

        console.log('\n✅ Custom super user created successfully!');
        console.log(`   ID: ${superUser.id}`);
        console.log(`   Name: ${superUser.firstName} ${superUser.lastName}`);
        console.log(`   Email: ${superUser.email}`);
        console.log(`   Group: ${defaultGroup.name}`);

    } catch (error) {
        console.error('❌ Error creating custom super user:', error.message);
    } finally {
        rl.close();
        await sequelize.close();
    }
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--custom')) {
        createCustomSuperUser()
            .then(() => {
                console.log('\n✨ Custom super user creation completed!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n💥 Custom super user creation failed:', error);
                process.exit(1);
            });
    } else {
        createSuperUser()
            .then(() => {
                console.log('\n✨ Super user creation completed!');
                process.exit(0);
            })
            .catch((error) => {
                console.error('\n💥 Super user creation failed:', error);
                process.exit(1);
            });
    }
}

module.exports = { createSuperUser, createCustomSuperUser };
