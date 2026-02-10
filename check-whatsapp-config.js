#!/usr/bin/env node
/**
 * WhatsApp Bot Configuration Checker
 * Run this to verify your WhatsApp bot configuration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('\n=== WhatsApp Bot Configuration Check ===\n');

// Check required variables
const whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true';
console.log(`WHATSAPP_ENABLED: ${whatsappEnabled ? '✅ true' : '❌ false (or not set)'}`);

if (!whatsappEnabled) {
  console.log('\n⚠️  WhatsApp bot is disabled!');
  console.log('   Set WHATSAPP_ENABLED=true in your .env file to enable it.\n');
  process.exit(1);
}

// Check optional variables
console.log('\nOptional Configuration:');
console.log(`WHATSAPP_PROXY: ${process.env.WHATSAPP_PROXY || 'not set'}`);
console.log(`WHATSAPP_DATA_PATH: ${process.env.WHATSAPP_DATA_PATH || 'default (.wwebjs_auth)'}`);
console.log(`WHATSAPP_FREE_LIMIT: ${process.env.WHATSAPP_FREE_LIMIT || 'default (7)'}`);
console.log(`WHATSAPP_FREE_WINDOW_DAYS: ${process.env.WHATSAPP_FREE_WINDOW_DAYS || 'default (30)'}`);
console.log(`WHATSAPP_SUBSCRIBE_URL: ${process.env.WHATSAPP_SUBSCRIBE_URL || 'not set'}`);

// Check frontend variables
console.log('\nFrontend Configuration (for button):');
console.log(`VITE_WHATSAPP_ENABLED: ${process.env.VITE_WHATSAPP_ENABLED || 'not set'}`);
console.log(`VITE_WHATSAPP_PHONE_NUMBER: ${process.env.VITE_WHATSAPP_PHONE_NUMBER || 'not set'}`);

if (!process.env.VITE_WHATSAPP_PHONE_NUMBER) {
  console.log('\n⚠️  VITE_WHATSAPP_PHONE_NUMBER is not set!');
  console.log('   The WhatsApp button on the landing page won\'t work.');
  console.log('   Set it to your WhatsApp number (with country code, no +)');
  console.log('   Example: VITE_WHATSAPP_PHONE_NUMBER=1234567890\n');
}

// Check if auth directory exists
const dataPath = process.env.WHATSAPP_DATA_PATH || resolve(__dirname, '.wwebjs_auth');
console.log(`\nAuth Directory: ${dataPath}`);
console.log(`Exists: ${existsSync(dataPath) ? '✅ Yes' : '❌ No (will be created on first run)'}`);

// Check PUBLIC_BASE_URL
console.log(`\nPUBLIC_BASE_URL: ${process.env.PUBLIC_BASE_URL || 'not set'}`);
if (!process.env.PUBLIC_BASE_URL) {
  console.log('⚠️  PUBLIC_BASE_URL is not set. Some features may not work correctly.');
}

console.log('\n=== Configuration Check Complete ===\n');
console.log('Next steps:');
console.log('1. Make sure WHATSAPP_ENABLED=true');
console.log('2. Start your server and scan the QR code');
console.log('3. Wait for "✅ WhatsApp bot is ready and authenticated!" message');
console.log('4. Then send /start to your WhatsApp number\n');
