import { NextRequest } from 'next/server';
import pLimit from 'p-limit';
import { passesTokenPolicy } from '@/src/lib/policy';
import { restrictMember, softKick, isAdmin } from '@/src/lib/telegram';
import { log } from '@/src/lib/logger';
import { db } from '@/src/db/prisma';

export const GET = async (req: NextRequest) => {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const groups = await db.group.findMany({ 
      include: { policy: true }
    });
    
    const limit = pLimit(10);

    for (const group of groups) {
      if (!group.policy) continue; // Skip groups without any policy
      
      const members = await db.member.findMany({ 
        where: { 
          chatId: group.chatId, 
          state: 'verified' 
        } 
      });

      const checks = members.map(member => limit(async () => {
        try {
          // Skip admins - never remove them
          const isUserAdmin = await isAdmin(group.chatId, member.tgId);
          if (isUserAdmin) {
            console.log(`Skipping admin ${member.tgId} in group ${group.chatId}`);
            return;
          }

          let pass = false;
          
          if (group.policy?.type === 'basic') {
            // For basic policy, check if member has verified address
            pass = !!member.address && member.state === 'verified';
          } else if (group.policy?.type === 'token') {
            // For token policy, check balance
            if (!member.address) {
              pass = false;
            } else {
              pass = await passesTokenPolicy(member.address, {
                asset: group.policy.asset!,
                min_amount: group.policy.minAmount!,
                include_unconfirmed: group.policy.includeUnconfirmed,
              });
            }
          }
          
          if (!pass) {
            if (group.policy!.onFail === 'restrict') {
              await restrictMember(group.chatId, member.tgId);
              await db.member.update({ 
                where: { 
                  chatId_tgId: { 
                    chatId: group.chatId, 
                    tgId: member.tgId 
                  }
                }, 
                data: { 
                  state: 'restricted', 
                  lastCheck: new Date() 
                }
              });
              await log(group.chatId, 'warn', 'restricted', member.tgId, {
                reason: group.policy?.type === 'basic' ? 'not_verified' : 'balance_insufficient',
                ...(group.policy?.type === 'token' && {
                  asset: group.policy.asset,
                  required: group.policy.minAmount
                })
              });
            } else {
              await softKick(group.chatId, member.tgId);
              await db.member.update({ 
                where: { 
                  chatId_tgId: { 
                    chatId: group.chatId, 
                    tgId: member.tgId 
                  }
                }, 
                data: { 
                  state: 'kicked', 
                  lastCheck: new Date() 
                }
              });
              await log(group.chatId, 'warn', 'soft_kicked', member.tgId, {
                reason: group.policy?.type === 'basic' ? 'not_verified' : 'balance_insufficient',
                ...(group.policy?.type === 'token' && {
                  asset: group.policy.asset,
                  required: group.policy.minAmount
                })
              });
            }
          } else {
            await db.member.update({ 
              where: { 
                chatId_tgId: { 
                  chatId: group.chatId, 
                  tgId: member.tgId 
                }
              }, 
              data: { 
                lastCheck: new Date() 
              }
            });
          }
        } catch (error) {
          console.error(`Error checking member ${member.tgId}:`, error);
          await log(group.chatId, 'error', 'reverified', member.tgId, {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }));

      await Promise.all(checks);
    }

    return new Response('OK');
  } catch (error) {
    console.error('Recheck error:', error);
    return new Response('Error', { status: 500 });
  }
};