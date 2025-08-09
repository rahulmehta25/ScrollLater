#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests all AI endpoints and functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const API_KEY = process.env.OPENROUTER_API_KEY || 'YOUR_API_KEY_HERE';

async function testEndpoint(name, endpoint, payload) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`Endpoint: ${endpoint}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name} - SUCCESS`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log(`❌ ${name} - FAILED`);
      console.log('Error:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`❌ ${name} - ERROR`);
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting AI Integration Tests...\n');
  console.log('Base URL:', BASE_URL);
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  
  const results = [];
  
  // Test 1: Content Analysis
  results.push(await testEndpoint(
    'Content Analysis',
    '/api/ai/analyze',
    {
      content: 'Check out this amazing article about productivity tips: https://example.com/productivity',
      url: 'https://example.com/productivity',
      metadata: {
        source: 'test-script',
        timestamp: new Date().toISOString()
      }
    }
  ));
  
  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Smart Scheduling
  results.push(await testEndpoint(
    'Smart Scheduling',
    '/api/ai/schedule-suggest',
    {
      entryId: 'test-entry-123',
      title: 'Review productivity article',
      category: 'reading',
      estimatedDuration: 15,
      userPreferences: {
        preferredTimeSlots: ['morning', 'evening'],
        timezone: 'America/New_York'
      }
    }
  ));
  
  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Batch Processing
  results.push(await testEndpoint(
    'Batch Processing',
    '/api/ai/batch-process',
    {
      entries: [
        {
          id: 'entry-1',
          content: 'Machine learning tutorial on neural networks',
          url: 'https://example.com/ml-tutorial'
        },
        {
          id: 'entry-2',
          content: 'React best practices guide',
          url: 'https://example.com/react-guide'
        }
      ],
      processingOptions: {
        summarize: true,
        categorize: true,
        extractKeywords: true
      }
    }
  ));
  
  // Test 4: Quick Capture (Shortcut Integration)
  results.push(await testEndpoint(
    'Quick Capture',
    '/api/shortcuts/capture',
    {
      title: 'Test Quick Capture',
      url: 'https://example.com/quick-test',
      notes: 'Testing quick capture functionality',
      source: 'test-script'
    }
  ));
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`- Test ${i + 1}: ${r.error}`);
      }
    });
  }
  
  console.log('\n✨ AI Integration Tests Complete!');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);