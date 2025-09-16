#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.APP_PUBLIC_URL + '/api/tg/webhook';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!BOT_TOKEN || !WEBHOOK_URL || !WEBHOOK_SECRET) {
  console.error('Missing required environment variables');
  console.error('Required: TELEGRAM_BOT_TOKEN, APP_PUBLIC_URL, TELEGRAM_WEBHOOK_SECRET');
  process.exit(1);
}

async function setupWebhook() {
  console.log('Setting up webhook...');
  console.log('Webhook URL:', WEBHOOK_URL);
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'chat_join_request', 'my_chat_member', 'chat_member']
    })
  });
  
  const result = await response.json();
  console.log('Webhook result:', result);
  return result.ok;
}

async function setCommands() {
  console.log('\nSetting bot commands...');
  
  // Default commands (visible everywhere)
  const defaultCommands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help message' }
  ];
  
  // Admin commands (only visible to group admins)
  const adminCommands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help message' },
    { command: 'setpolicy', description: 'Configure group token requirements' },
    { command: 'settings', description: 'View current group settings' }
  ];
  
  // Set default commands
  let response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands: defaultCommands })
  });
  let result = await response.json();
  console.log('Default commands:', result.ok ? 'Set ✓' : 'Failed ✗');
  
  // Set admin commands for group chats
  response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: adminCommands,
      scope: { type: 'all_chat_administrators' }
    })
  });
  result = await response.json();
  console.log('Admin commands:', result.ok ? 'Set ✓' : 'Failed ✗');
  
  // Set commands for private chats
  response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: defaultCommands,
      scope: { type: 'all_private_chats' }
    })
  });
  result = await response.json();
  console.log('Private chat commands:', result.ok ? 'Set ✓' : 'Failed ✗');
}

async function getWebhookInfo() {
  console.log('\nChecking webhook status...');
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const info = await response.json();
  
  if (info.ok) {
    console.log('Webhook URL:', info.result.url || 'Not set');
    console.log('Pending updates:', info.result.pending_update_count || 0);
    console.log('Last error:', info.result.last_error_message || 'None');
  }
}

async function main() {
  console.log('🤖 XCP Group Bot Setup\n');
  
  try {
    await setupWebhook();
    await setCommands();
    await getWebhookInfo();
    console.log('\n✅ Bot setup complete!');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();