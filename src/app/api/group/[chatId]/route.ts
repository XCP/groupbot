import { NextRequest } from 'next/server';
import { getChat, getChatMemberCount } from '@/src/lib/telegram';
import { db } from '@/src/db/prisma';

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) => {
  try {
    const { chatId } = await params;
    
    // Fetch group info from Telegram
    const [chat, memberCount] = await Promise.all([
      getChat(chatId),
      getChatMemberCount(chatId)
    ]);
    
    // Check if group has a photo
    const photoUrl = chat?.photo ? `/api/group/${chatId}/photo` : null;
    
    // Fetch policy from database
    const policy = await db.policy.findUnique({
      where: { chatId }
    });
    
    return Response.json({
      ok: true,
      group: {
        title: chat?.title || 'Unknown Group',
        username: chat?.username,
        memberCount: memberCount || 0,
        type: chat?.type,
        photoUrl: photoUrl
      },
      policy: policy ? {
        type: policy.type,
        asset: policy.asset,
        minAmount: policy.minAmount,
        includeUnconfirmed: policy.includeUnconfirmed
      } : {
        type: 'basic'
      }
    });
  } catch (error) {
    console.error('Error fetching group info:', error);
    return Response.json(
      { ok: false, error: 'Failed to fetch group info' },
      { status: 500 }
    );
  }
};