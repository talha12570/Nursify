#!/usr/bin/env node

/**
 * Connection Test Script
 * Tests if the mobile app can reach the backend server
 */

const http = require('http');

const SERVER_IP = '192.168.0.105';
const SERVER_PORT = '5000';

console.log('\n🧪 Testing Backend Connection...\n');
console.log(`📡 Target: http://${SERVER_IP}:${SERVER_PORT}/api`);
console.log('─'.repeat(50));

// Test 1: Basic connectivity
console.log('\n1️⃣ Testing basic connectivity...');

const options = {
    hostname: SERVER_IP,
    port: SERVER_PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`   ✅ Server responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`   ✅ Response received (${data.length} bytes)`);
        console.log('\n2️⃣ Network Configuration:');
        console.log(`   📱 Mobile device should use: http://${SERVER_IP}:${SERVER_PORT}/api`);
        console.log(`   🖥️  Make sure mobile device is on the same WiFi network`);
        console.log(`   🔥 Check firewall allows port ${SERVER_PORT}`);
        
        console.log('\n✅ Backend is accessible! Your Expo app should be able to connect.\n');
        console.log('📝 Next steps:');
        console.log('   1. Start Expo: npm start');
        console.log('   2. Scan QR code with Expo Go');
        console.log('   3. App should connect to backend\n');
    });
});

req.on('timeout', () => {
    console.log('   ❌ Connection timeout - server may not be running');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Start the backend: cd Server && npm start');
    console.log('   2. Check firewall settings');
    console.log('   3. Ensure you\'re connected to WiFi\n');
    req.destroy();
    process.exit(1);
});

req.on('error', (error) => {
    console.log(`   ❌ Connection failed: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Is the backend server running? (cd Server && npm start)');
    console.log('   2. Check if another service is using port 5000');
    console.log('   3. Verify firewall allows connections on port 5000');
    console.log('   4. Ensure you\'re connected to a network\n');
    process.exit(1);
});

// Send a test request (will fail without credentials, but proves connectivity)
req.write(JSON.stringify({
    email: 'test@test.com',
    password: 'test'
}));

req.end();
