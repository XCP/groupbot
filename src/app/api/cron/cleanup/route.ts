import { NextRequest } from 'next/server';
import { db } from '@/src/db/prisma';
import { declineJoin } from '@/src/lib/telegram';
import { log } from '@/src/lib/logger';

export async function GET(req: NextRequest) {
  // Simple cron authentication - check for CRON_SECRET
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Find expired join requests
    const expiredRequests = await db.joinRequest.findMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`Found ${expiredRequests.length} expired join requests`);

    let declinedCount = 0;
    let errorCount = 0;

    // Process each expired request
    for (const request of expiredRequests) {
      try {
        // Decline the join request in Telegram
        await declineJoin(request.chatId, request.tgId);
        
        // Update the status in database
        await db.joinRequest.update({
          where: { id: request.id },
          data: { 
            status: 'expired',
            processedAt: now
          }
        });

        // Remove any pending member record
        await db.member.deleteMany({
          where: {
            chatId: request.chatId,
            tgId: request.tgId,
            state: 'pending'
          }
        });

        // Log the expiration
        await log(request.chatId, 'info', 'declined', request.tgId, {
          reason: 'expired_after_48h'
        });

        declinedCount++;
        console.log(`Declined expired request for user ${request.tgId} in chat ${request.chatId}`);

      } catch (error) {
        console.error(`Error processing expired request ${request.id}:`, error);
        errorCount++;
        
        // Log the error but don't fail the entire job
        try {
          await log(request.chatId, 'error', 'declined', request.tgId, {
            error: error instanceof Error ? error.message : 'Unknown error',
            reason: 'cleanup_failed'
          });
        } catch (logError) {
          console.error('Failed to log cleanup error:', logError);
        }
      }
    }

    // Clean up old processed requests (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedOldRequests = await db.joinRequest.deleteMany({
      where: {
        status: { in: ['approved', 'declined', 'expired'] },
        processedAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`Cleaned up ${deletedOldRequests.count} old processed requests`);

    return Response.json({
      success: true,
      processed: expiredRequests.length,
      declined: declinedCount,
      errors: errorCount,
      oldRequestsDeleted: deletedOldRequests.count,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Cleanup job error:', error);
    return Response.json(
      { 
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}