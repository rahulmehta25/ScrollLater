#!/usr/bin/env node

/**
 * Production Testing Script for ScrollLater
 * Tests core functionality of the deployed application
 */

const https = require('https');

const PRODUCTION_URL = 'https://scroll-later.vercel.app';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// Test functions
async function testHomePage() {
  console.log('\n📍 Testing Home Page...');
  try {
    const response = await makeRequest('/');
    const passed = response.statusCode === 200;
    logTest('Home page loads', passed);
    return passed;
  } catch (error) {
    logTest('Home page loads', false, error.message);
    return false;
  }
}

async function testAPIHealth() {
  console.log('\n🔌 Testing API Endpoints...');
  const endpoints = [
    { path: '/api/test/openrouter', name: 'OpenRouter API test' },
    { path: '/api/auth/callback', name: 'Auth callback endpoint' },
    { path: '/api/shortcuts/webhook', name: 'Shortcuts webhook' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.path);
      // Most endpoints will return 405 without proper method/auth
      const passed = response.statusCode < 500;
      logTest(endpoint.name, passed, `Status: ${response.statusCode}`);
    } catch (error) {
      logTest(endpoint.name, false, error.message);
    }
  }
}

async function testStaticAssets() {
  console.log('\n🎨 Testing Static Assets...');
  const assets = [
    { path: '/manifest.json', name: 'PWA Manifest' },
    { path: '/sw.js', name: 'Service Worker' }
  ];

  for (const asset of assets) {
    try {
      const response = await makeRequest(asset.path);
      const passed = response.statusCode === 200;
      logTest(asset.name, passed);
    } catch (error) {
      logTest(asset.name, false, error.message);
    }
  }
}

async function testSecurityHeaders() {
  console.log('\n🔒 Testing Security Headers...');
  try {
    const response = await makeRequest('/');
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy'
    ];

    for (const header of securityHeaders) {
      const passed = !!response.headers[header];
      logTest(`${header} header`, passed, response.headers[header] || 'Missing');
    }
  } catch (error) {
    logTest('Security headers', false, error.message);
  }
}

async function testAIIntegration() {
  console.log('\n🤖 Testing AI Integration...');
  try {
    const response = await makeRequest('/api/test/openrouter');
    const passed = response.statusCode === 200;
    
    if (passed) {
      const data = JSON.parse(response.body);
      logTest('AI analysis endpoint', data.success === true, 
        `Processing time: ${data.processingTime || 'N/A'}`);
    } else {
      logTest('AI analysis endpoint', false, `Status: ${response.statusCode}`);
    }
  } catch (error) {
    logTest('AI analysis endpoint', false, error.message);
  }
}

// Logging helper
function logTest(testName, passed, details = '') {
  const status = passed ? 
    `${colors.green}✓ PASS${colors.reset}` : 
    `${colors.red}✗ FAIL${colors.reset}`;
  
  console.log(`  ${status} ${testName} ${details ? `(${details})` : ''}`);
  
  testResults.tests.push({ testName, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// Main test runner
async function runTests() {
  console.log(`\n${colors.yellow}🧪 ScrollLater Production Tests${colors.reset}`);
  console.log(`Testing: ${PRODUCTION_URL}`);
  console.log('═'.repeat(50));

  await testHomePage();
  await testAPIHealth();
  await testStaticAssets();
  await testSecurityHeaders();
  await testAIIntegration();

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Test Summary:`);
  console.log(`  ${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`  Total: ${testResults.passed + testResults.failed}`);

  // Exit code based on failures
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`\n${colors.red}Test runner error:${colors.reset}`, error);
  process.exit(1);
});