#!/usr/bin/env node

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!BOT_TOKEN || !WEBHOOK_URL || !WEBHOOK_SECRET) {
  console.error('Missing required environment variables: TELEGRAM_BOT_TOKEN, WEBHOOK_URL, TELEGRAM_WEBHOOK_SECRET');
  process.exit(1);
}

async function setupWebhook() {
  console.log('Setting up Telegram webhook...');
  
  // Set webhook
  const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
  
  const response = await fetch(setWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'chat_join_request', 'chat_member'],
      drop_pending_updates: true
    })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Webhook set successfully!');
    console.log(`Webhook URL: ${WEBHOOK_URL}`);
    
    // Get webhook info
    const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const info = await infoResponse.json();
    console.log('Webhook info:', info.result);
  } else {
    console.error('❌ Failed to set webhook:', result);
  }
}

// Also set bot commands
async function setBotCommands() {
  console.log('Setting bot commands...');
  
  const commands = [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help message' },
    { command: 'setpolicy', description: 'Configure group requirements' },
    { command: 'settings', description: 'View current settings' },
  ];
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    console.log('✅ Bot commands set successfully!');
  } else {
    console.error('❌ Failed to set commands:', result);
  }
}

// Run setup
(async () => {
  await setupWebhook();
  await setBotCommands();
})();