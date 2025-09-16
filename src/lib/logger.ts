import { db } from '@/src/db/prisma';

type LogLevel = 'info' | 'warn' | 'error';
type LogEvent = 'joined' | 'approved' | 'declined' | 'restricted' | 'soft_kicked' | 'reverified';

export async function log(
  chatId: string,
  level: LogLevel,
  event: LogEvent,
  tgId?: string,
  meta?: unknown
) {
  try {
    // Ensure the group exists before creating log record
    await db.group.upsert({
      where: { chatId },
      update: { updatedAt: new Date() },
      create: { 
        chatId,
        ownerTgId: tgId || null  // Use the tgId if available, otherwise null
      }
    });

    await db.log.create({
      data: {
        chatId,
        tgId,
        level,
        event,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
      }
    });
  } catch (error) {
    console.error('Failed to create log:', error);
  }
}