/**
 * Dynamic Proxy Finder and Tester
 * 
 * Automatically finds and tests proxies to connect to Telegram API
 * 
 * Usage:
 *   npm run test:proxy
 * 
 * This script will:
 * 1. Fetch proxy lists from free proxy APIs
 * 2. Test each proxy to see if it can reach Telegram API
 * 3. Use the first working proxy
 * 4. Optionally save it to .env
 */

import { HttpsProxyAgent } from 'https-proxy-agent';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const TELEGRAM_API = 'https://api.telegram.org';
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const existingProxy = process.env.TELEGRAM_PROXY;

// Proxy sources
const PROXY_SOURCES = [
  {
    name: 'ProxyScrape',
    url: 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
    parser: (text) => text.trim().split('\n').filter(Boolean).map(ip => `http://${ip}`)
  },
  {
    name: 'FreeProxyList',
    url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
    parser: (text) => text.trim().split('\n').filter(Boolean).map(ip => `http://${ip}`)
  },
  {
    name: 'ProxyList',
    url: 'https://www.proxy-list.download/api/v1/get?type=http',
    parser: (text) => text.trim().split('\n').filter(Boolean).map(ip => `http://${ip}`)
  }
];

let testedProxies = 0;
let workingProxy = null;

/**
 * Fetch proxies from a source
 */
async function fetchProxies(source) {
  try {
    console.log(`📡 Fetching proxies from ${source.name}...`);
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const proxies = source.parser(text);
    console.log(`   ✅ Found ${proxies.length} proxies`);
    return proxies;
  } catch (error) {
    console.log(`   ❌ Failed to fetch from ${source.name}: ${error.message}`);
    return [];
  }
}

/**
 * Test a single proxy
 */
async function testProxy(proxyUrl, timeout = 5000) {
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = Date.now();
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`, {
      agent: agent,
      signal: controller.signal,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const data = await response.json();

    if (data.ok) {
      return {
        success: true,
        proxy: proxyUrl,
        duration,
        botInfo: data.result
      };
    } else {
      return {
        success: false,
        proxy: proxyUrl,
        error: data.description || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      proxy: proxyUrl,
      error: error.message
    };
  }
}

/**
 * Test multiple proxies in parallel
 */
async function testProxies(proxies, maxConcurrent = 5, maxTests = 20) {
  const results = [];
  const workingProxies = [];
  
  // Limit number of proxies to test
  const proxiesToTest = proxies.slice(0, maxTests);
  console.log(`\n🧪 Testing ${proxiesToTest.length} proxies (max ${maxConcurrent} concurrent)...\n`);

  // Test in batches
  for (let i = 0; i < proxiesToTest.length; i += maxConcurrent) {
    const batch = proxiesToTest.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (proxy) => {
      testedProxies++;
      process.stdout.write(`   [${testedProxies}/${proxiesToTest.length}] Testing ${proxy.replace(/\/\/.*@/, '//***:***@')}... `);
      
      const result = await testProxy(proxy, 8000); // 8 second timeout per proxy
      
      if (result.success) {
        console.log(`✅ Working! (${result.duration}ms)`);
        workingProxies.push(result);
        return result;
      } else {
        console.log(`❌ Failed: ${result.error}`);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));

    // Stop if we found a working proxy
    if (workingProxies.length > 0) {
      console.log(`\n✅ Found working proxy! Stopping search...\n`);
      break;
    }
  }

  return workingProxies;
}

/**
 * Save proxy to .env file
 */
function saveProxyToEnv(proxyUrl) {
  const envPath = path.join(__dirname, '.env');
  
  try {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Remove existing TELEGRAM_PROXY line
    envContent = envContent.replace(/^TELEGRAM_PROXY=.*$/m, '');

    // Add new proxy
    if (envContent.trim() && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `TELEGRAM_PROXY=${proxyUrl}\n`;

    fs.writeFileSync(envPath, envContent);
    console.log(`💾 Saved proxy to .env file`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save to .env: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Dynamic Proxy Finder for Telegram Bot API\n');
  console.log('=' .repeat(60));

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env');
    console.error('   Please set it first before running this script.');
    process.exit(1);
  }

  // First, test direct connection (no proxy)
  console.log('\n1️⃣ Testing direct connection (no proxy)...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    const duration = Date.now() - startTime;
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Direct connection works! No proxy needed.');
      console.log(`   Bot: @${data.result.username} (${data.result.first_name})`);
      console.log(`   Response time: ${duration}ms\n`);
      
      // Remove proxy from .env if it exists
      if (existingProxy) {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf-8');
          envContent = envContent.replace(/^TELEGRAM_PROXY=.*$/m, '');
          fs.writeFileSync(envPath, envContent);
          console.log('💾 Removed proxy from .env (direct connection works)');
        }
      }
      process.exit(0);
    } else {
      console.log('❌ Direct connection failed. Searching for proxies...\n');
    }
  } catch (error) {
    console.log('❌ Direct connection failed. Searching for proxies...\n');
  }

  // Fetch proxies from all sources
  console.log('2️⃣ Fetching proxy lists...\n');
  const allProxies = [];
  
  for (const source of PROXY_SOURCES) {
    const proxies = await fetchProxies(source);
    allProxies.push(...proxies);
  }

  // Remove duplicates
  const uniqueProxies = [...new Set(allProxies)];
  console.log(`\n📊 Total unique proxies found: ${uniqueProxies.length}\n`);

  if (uniqueProxies.length === 0) {
    console.error('❌ No proxies found. Please check your internet connection or try again later.');
    process.exit(1);
  }

  // Test existing proxy first if set
  if (existingProxy) {
    console.log('3️⃣ Testing existing proxy from .env...');
    const existingTest = await testProxy(existingProxy, 10000);
    
    if (existingTest.success) {
      console.log(`✅ Existing proxy works! (${existingTest.duration}ms)`);
      console.log(`   Proxy: ${existingProxy.replace(/\/\/.*@/, '//***:***@')}`);
      console.log(`   Bot: @${existingTest.botInfo.username}\n`);
      process.exit(0);
    } else {
      console.log(`❌ Existing proxy failed: ${existingTest.error}\n`);
    }
  }

  // Test proxies
  console.log('4️⃣ Testing proxies...');
  const workingProxies = await testProxies(uniqueProxies, 5, 30); // Test up to 30 proxies, 5 at a time

  if (workingProxies.length === 0) {
    console.error('\n❌ No working proxies found.');
    console.error('   This could mean:');
    console.error('   - All proxies are blocked or slow');
    console.error('   - Telegram API is unreachable');
    console.error('   - Your bot token is invalid');
    console.error('\n💡 Try:');
    console.error('   1. Run the script again (proxy lists change frequently)');
    console.error('   2. Use a paid proxy service (more reliable)');
    console.error('   3. Check your bot token');
    process.exit(1);
  }

  // Use the fastest working proxy
  workingProxies.sort((a, b) => a.duration - b.duration);
  workingProxy = workingProxies[0];

  console.log('\n' + '='.repeat(60));
  console.log('✅ SUCCESS! Found working proxy:\n');
  console.log(`   Proxy: ${workingProxy.proxy.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`   Response Time: ${workingProxy.duration}ms`);
  console.log(`   Bot: @${workingProxy.botInfo.username} (${workingProxy.botInfo.first_name})`);
  console.log(`   Bot ID: ${workingProxy.botInfo.id}\n`);

  // Ask to save to .env
  console.log('💾 Save this proxy to .env file? (Recommended)');
  console.log(`   This will add: TELEGRAM_PROXY=${workingProxy.proxy}\n`);
  
  // Auto-save (can be made interactive if needed)
  const saved = saveProxyToEnv(workingProxy.proxy);
  
  if (saved) {
    console.log('\n✅ Proxy saved! Restart your server to use it.');
  } else {
    console.log('\n⚠️  Could not save automatically. Add this to your .env:');
    console.log(`   TELEGRAM_PROXY=${workingProxy.proxy}`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

