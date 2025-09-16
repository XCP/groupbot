import { NextRequest } from 'next/server';
import { getChat } from '@/src/lib/telegram';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) => {
  try {
    const { chatId } = await params;
    
    // Get chat info
    const chat = await getChat(chatId);
    if (!chat?.photo?.small_file_id) {
      return new Response('No photo', { status: 404 });
    }
    
    // Get file info from Telegram
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${chat.photo.small_file_id}`
    );
    
    const fileData = await fileResponse.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return new Response('Photo not found', { status: 404 });
    }
    
    // Fetch the actual image
    const imageResponse = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
    );
    
    if (!imageResponse.ok) {
      return new Response('Failed to fetch photo', { status: 500 });
    }
    
    // Return the image with proper headers
    const imageBuffer = await imageResponse.arrayBuffer();
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching group photo:', error);
    return new Response('Error', { status: 500 });
  }
};