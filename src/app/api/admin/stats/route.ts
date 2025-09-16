import { NextRequest } from 'next/server';
import { db } from '@/src/db/prisma';
import { getChat, getUser } from '@/src/lib/telegram';

// Simple admin authentication - check for ADMIN_SECRET in headers
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;
  
  if (!adminSecret) {
    console.warn('ADMIN_SECRET not set in environment variables');
    return false;
  }
  
  return authHeader === `Bearer ${adminSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total groups
    const totalGroups = await db.group.count();
    
    // Get active groups (have policies or recent activity)
    const activeGroups = await db.group.count({
      where: {
        OR: [
          { policy: { isNot: null } },
          { logs: { some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } }
        ]
      }
    });

    // Get total members across all groups
    const totalMembers = await db.member.count();
    
    // Get verified members
    const verifiedMembers = await db.member.count({
      where: { state: 'verified' }
    });
    
    // Get pending members
    const pendingMembers = await db.member.count({
      where: { state: 'pending' }
    });
    
    // Get restricted members
    const restrictedMembers = await db.member.count({
      where: { state: 'restricted' }
    });
    
    // Get kicked members
    const kickedMembers = await db.member.count({
      where: { state: 'kicked' }
    });

    // Get total attestations
    const totalAttestations = await db.attestation.count();
    
    // Get recent attestations (last 7 days)
    const recentAttestations = await db.attestation.count({
      where: {
        verifiedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get policy breakdown
    const policyCounts = await db.policy.groupBy({
      by: ['type'],
      _count: { type: true }
    });

    // Get unique policies with group count
    const allPolicies = await db.policy.findMany({
      include: {
        group: true
      }
    });

    // Create unique policy signatures
    const uniquePoliciesMap = new Map();
    for (const policy of allPolicies) {
      const signature = `${policy.type}:${policy.asset || 'N/A'}:${policy.minAmount || 'N/A'}:${policy.onFail}`;
      if (!uniquePoliciesMap.has(signature)) {
        uniquePoliciesMap.set(signature, {
          type: policy.type,
          asset: policy.asset,
          minAmount: policy.minAmount,
          onFail: policy.onFail,
          includeUnconfirmed: policy.includeUnconfirmed,
          groups: []
        });
      }
      uniquePoliciesMap.get(signature).groups.push(policy.chatId);
    }

    const uniquePolicies = Array.from(uniquePoliciesMap.values()).map(policy => ({
      ...policy,
      groupCount: policy.groups.length
    }));

    // Get recent logs for activity
    const recentLogs = await db.log.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        group: true
      }
    });

    // Get group list with details
    const groups = await db.group.findMany({
      include: {
        policy: true,
        members: true,
        _count: {
          select: {
            members: true,
            logs: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Fetch group names in parallel
    const groupsWithNames = await Promise.all(
      groups.map(async (group) => {
        let groupName = null;
        try {
          const chatInfo = await getChat(group.chatId);
          if (chatInfo) {
            groupName = chatInfo.title || chatInfo.first_name || null;
          }
        } catch (error) {
          console.error(`Failed to get name for group ${group.chatId}:`, error);
        }

        return {
          chatId: group.chatId,
          groupName,
          ownerTgId: group.ownerTgId,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          policy: group.policy ? {
            type: group.policy.type,
            asset: group.policy.asset,
            minAmount: group.policy.minAmount,
            onFail: group.policy.onFail
          } : null,
          memberCount: group._count.members,
          logCount: group._count.logs
        };
      })
    );

    // Fetch usernames for recent activity logs
    const uniqueUserIds = [...new Set(recentLogs.filter(log => log.tgId).map(log => log.tgId))];
    const userCache = new Map();

    // Fetch user info in parallel (limited to avoid overwhelming the API)
    const userBatches = [];
    for (let i = 0; i < uniqueUserIds.length; i += 10) {
      userBatches.push(uniqueUserIds.slice(i, i + 10));
    }

    for (const batch of userBatches) {
      await Promise.all(
        batch.map(async (userId) => {
          if (userId && !userCache.has(userId)) {
            try {
              const userInfo = await getUser(userId);
              if (userInfo) {
                const username = userInfo.username ? `@${userInfo.username}` :
                                userInfo.first_name ? userInfo.first_name : null;
                userCache.set(userId, username);
              }
            } catch (error) {
              console.error(`Failed to get username for user ${userId}:`, error);
              userCache.set(userId, null);
            }
          }
        })
      );
    }

    const recentActivityWithUsernames = recentLogs.map(log => ({
      id: log.id,
      chatId: log.chatId,
      tgId: log.tgId,
      username: log.tgId ? userCache.get(log.tgId) || null : null,
      level: log.level,
      event: log.event,
      meta: log.meta,
      createdAt: log.createdAt
    }));

    return Response.json({
      stats: {
        totalGroups,
        activeGroups,
        totalMembers,
        verifiedMembers,
        pendingMembers,
        restrictedMembers,
        kickedMembers,
        totalAttestations,
        recentAttestations,
        policyCounts: Object.fromEntries(
          policyCounts.map(p => [p.type || 'none', p._count.type])
        )
      },
      groups: groupsWithNames,
      recentActivity: recentActivityWithUsernames,
      uniquePolicies
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return Response.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}