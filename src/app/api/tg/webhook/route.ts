import { NextRequest } from 'next/server';
import { createBotHandler } from '@/src/bot/handler';

// Initialize bot once
const bot = createBotHandler();

export const POST = async (req: NextRequest) => {
  try {
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.log('Webhook auth failed:', secretToken, 'vs', process.env.TELEGRAM_WEBHOOK_SECRET);
      return new Response('Unauthorized', { status: 401 });
    }
    
    const update = await req.json();
    console.log('Received update:', JSON.stringify(update));
    
    // Initialize bot if needed
    if (!bot.isInited()) {
      await bot.init();
    }
    
    await bot.handleUpdate(update);
    
    return new Response('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
};