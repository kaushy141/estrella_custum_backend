const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
let authToken = '';

// Test data
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user@example.com',
  password: 'password123',
  groupId: 1,
  isAdmin: false
};

const testGroup = {
  name: 'Test Group',
  description: 'A test group for testing',
  isActive: true
};

async function testEndpoints() {
  console.log('🧪 Testing User Service Endpoints...\n');

  try {
    // 1. Create a group first (required for user creation)
    console.log('1️⃣ Creating test group...');
    const groupResponse = await axios.post(`${BASE_URL}/group`, testGroup);
    console.log('✅ Group created:', groupResponse.data.message);
    const groupId = groupResponse.data.data.id;
    testUser.groupId = groupId;

    // 2. Create a user
    console.log('\n2️⃣ Creating test user...');
    const createUserResponse = await axios.post(`${BASE_URL}/user`, testUser);
    console.log('✅ User created:', createUserResponse.data.message);
    const userId = createUserResponse.data.data.id;

    // 3. Get all users
    console.log('\n3️⃣ Getting all users...');
    const getAllUsersResponse = await axios.get(`${BASE_URL}/user?page=1&limit=10`);
    console.log('✅ Users retrieved:', getAllUsersResponse.data.message);

    // 4. Get user by ID
    console.log('\n4️⃣ Getting user by ID...');
    const getUserByIdResponse = await axios.get(`${BASE_URL}/user/${userId}`);
    console.log('✅ User retrieved by ID:', getUserByIdResponse.data.message);

    // 5. Get users by group
    console.log('\n5️⃣ Getting users by group...');
    const getUsersByGroupResponse = await axios.get(`${BASE_URL}/user/group/${groupId}?page=1&limit=10`);
    console.log('✅ Users by group retrieved:', getUsersByGroupResponse.data.message);

    // 6. Search users
    console.log('\n6️⃣ Searching users...');
    const searchUsersResponse = await axios.get(`${BASE_URL}/user/search?search=test&page=1&limit=10`);
    console.log('✅ Users search completed:', searchUsersResponse.data.message);

    // 7. Update user
    console.log('\n7️⃣ Updating user...');
    const updateData = { firstName: 'Updated Test', lastName: 'Updated User' };
    const updateUserResponse = await axios.put(`${BASE_URL}/user/${userId}`, updateData);
    console.log('✅ User updated:', updateUserResponse.data.message);

    // 8. Test authentication (login to get token)
    console.log('\n8️⃣ Testing authentication...');
    const loginData = { email: testUser.email, password: testUser.password };
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', loginResponse.data.message);
    
    if (loginResponse.data.data && loginResponse.data.data.token) {
      authToken = loginResponse.data.data.token;
      console.log('✅ Auth token received');
    }

    // 9. Test profile endpoints (if authenticated)
    if (authToken) {
      console.log('\n9️⃣ Testing profile endpoints...');
      
      // Get profile
      const getProfileResponse = await axios.get(`${BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Profile retrieved:', getProfileResponse.data.message);

      // Update profile
      const updateProfileData = { firstName: 'Profile Updated' };
      const updateProfileResponse = await axios.put(`${BASE_URL}/user/profile`, updateProfileData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Profile updated:', updateProfileResponse.data.message);

      // Change password
      const changePasswordData = {
        currentPassword: testUser.password,
        newPassword: 'newpassword123'
      };
      const changePasswordResponse = await axios.put(`${BASE_URL}/user/change-password`, changePasswordData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Password changed:', changePasswordResponse.data.message);
    } else {
      console.log('⚠️  Skipping profile tests - no auth token received');
    }

    // 10. Delete user
    console.log('\n🔟 Deleting test user...');
    const deleteUserResponse = await axios.delete(`${BASE_URL}/user/${userId}`);
    console.log('✅ User deleted:', deleteUserResponse.data.message);

    // 11. Delete test group
    console.log('\n1️⃣1️⃣ Deleting test group...');
    const deleteGroupResponse = await axios.delete(`${BASE_URL}/group/${groupId}`);
    console.log('✅ Group deleted:', deleteGroupResponse.data.message);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run tests
testEndpoints();
