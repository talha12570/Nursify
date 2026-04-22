#!/usr/bin/env node
/**
 * Expo Start Script with Auto-IP Detection
 * 
 * This script starts Expo with the correct local network IP for Metro bundler.
 * Note: The API URL (ngrok) is separate from the Metro bundler IP.
 * 
 * - Metro bundler: Uses local network IP (for hot reloading)
 * - API calls: Use ngrok URL (configured in config/api.js)
 */

const { spawn } = require('child_process');
const { networkInterfaces } = require('os');

// Get local network IP for Metro bundler
function getLocalIP() {
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    
    return 'localhost';
}

const localIP = getLocalIP();

// Check if Metro ngrok URL is set for global mode
const metroNgrokUrl = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
const isGlobalMode = metroNgrokUrl && metroNgrokUrl.includes('ngrok');

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║              NURSIFY - EXPO START SCRIPT                    ║');
if (isGlobalMode) {
    console.log('║              🌍 GLOBAL MODE (Ngrok Tunnels)                ║');
} else {
    console.log('║              🏠 LOCAL MODE (Same Network)                  ║');
}
console.log('╠════════════════════════════════════════════════════════════╣');
if (isGlobalMode) {
    console.log(`║  📡 Metro: ${metroNgrokUrl.substring(0, 38).padEnd(38)}║`);
} else {
    console.log(`║  📡 Metro: ${localIP.padEnd(38)}║`);
}
console.log('║  📱 API: Using ngrok (see config/api.js)                   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

if (!isGlobalMode) {
    console.log('ℹ️  For GLOBAL access:');
    console.log('   1. Run: start-global.bat (starts 2 ngrok tunnels)');
    console.log('   2. Update App/.env with Metro ngrok URL');
    console.log('   3. Restart with: npm start');
    console.log('');
}

// Check if --clear flag is passed
const clearFlag = process.argv.includes('--clear');

// Build the expo command - NEVER use --tunnel, use --lan or default
const expoArgs = ['start'];
if (clearFlag) {
    expoArgs.push('--clear');
}

// Set the environment variable and start expo
const env = {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: localIP
};

console.log(`🚀 Starting Expo...`);
console.log('');

const expoProcess = spawn('npx', ['expo', ...expoArgs], {
    stdio: 'inherit',
    shell: true,
    env: env
});

expoProcess.on('exit', (code) => {
    process.exit(code);
});
