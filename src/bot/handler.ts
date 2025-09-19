import { Bot, session, Context, SessionFlavor } from 'grammy';
import { conversations, createConversation, type ConversationFlavor } from '@grammyjs/conversations';
import { sendDM } from '@/src/lib/telegram';
import { getPolicyForChat } from '@/src/lib/policy';
import { log } from '@/src/lib/logger';
import { verifyConversation } from './verifyConversation';

// Define session data
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SessionData {}

// Define custom context
type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor<Context>;

let botInstance: Bot<MyContext> | null = null;

export function createBotHandler() {
  if (!botInstance) {
    botInstance = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

    // Set up session and conversations middleware
    botInstance.use(session({
      initial: () => ({}),
    }));
    botInstance.use(conversations());

    // Register the verify conversation
    botInstance.use(createConversation(verifyConversation));

    setupHandlers(botInstance);
  }
  return botInstance;
}

function setupHandlers(bot: Bot<MyContext>) {

  // Handle /start command
  bot.command('start', async (ctx) => {
    const message = `🤖 **Welcome to XCP Group Bot!**

I help token-gate Telegram groups with Counterparty assets.

**Setup Requirements:**
• Add me to your group as admin
• Create invite link with "Approval Required"
• Configure policy with /setpolicy
• ⚠️ Forums/Topics NOT supported

**Commands:**
/setpolicy - Configure group requirements
/settings - View current settings
/verify - Complete group verification inline
/help - Show detailed help

**Need help?** Visit https://telegram.xcp.io/faq`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // Handle /verify command - start the conversation
  bot.command('verify', async (ctx) => {
    // Only works in private chats
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('This command can only be used in private messages with the bot.');
      return;
    }

    await ctx.conversation.enter('verifyConversation');
  });

  // Test command for admins to simulate join request
  bot.command('testjoin', async (ctx) => {
    // Only works in groups and for admins
    if (ctx.chat?.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }

    // Check if user is admin
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status !== 'administrator' && member.status !== 'creator') {
      await ctx.reply('Only admins can use this test command.');
      return;
    }

    const chatId = String(ctx.chat!.id);
    const tgId = String(ctx.from!.id);
    
    try {
      // Simulate a join request
      const policy = await getPolicyForChat(chatId);

      const url = new URL(`${process.env.APP_PUBLIC_URL}/verify`);
      url.searchParams.set('tg_id', tgId);
      url.searchParams.set('chat_id', chatId);
      if (policy?.id) {
        url.searchParams.set('policy_id', policy.id);
      }

      // Get group info for the message
      const { getChat } = await import('@/src/lib/telegram');
      const chat = await getChat(chatId);
      const groupName = chat?.username ? `@${chat.username}` : (chat?.title || 'this group');

      // Build policy-specific message
      let verifyMessage = '';
      if (!policy || policy.type === 'basic') {
        verifyMessage = `To join ${groupName}, **please verify you're a human by signing a message.**`;
      } else if (policy.type === 'token') {
        const amount = policy.minAmount || '0';
        const asset = policy.asset || 'XCP';
        verifyMessage = `To join ${groupName}, **please verify you have at least ${amount} ${asset}.**`;
      }

      const message = `🔐 **Verification Required**

${verifyMessage}

**Option 1:** 🌐 Web Verification
👉 [Click here to verify](${url.toString()})

**Option 2:** 📱 Verify in Telegram
Type /verify to complete verification right here`;

      // Send test DM to the admin
      await sendDM(tgId, message);
      
    } catch (error) {
      console.error('Test join error:', error);
      await ctx.reply('Failed to simulate join request. Check logs.');
    }
  });

  // Handle /help command
  bot.command('help', async (ctx) => {
    const isPrivate = ctx.chat?.type === 'private';

    let message = `📚 **XCP Group Bot Help**\n\n`;

    if (isPrivate) {
      message += `**🔐 User Commands:**
• **/verify** - Complete group verification inline in Telegram
• **/start** - Show welcome message and bot info\n\n`;
    }

    message += `**🛠 Group Admin Commands:**
• **/setpolicy basic** [kick|restrict] - Require address verification only
• **/setpolicy token** <AMOUNT> <ASSET> [kick|restrict] - Require token balance
• **/settings** - View current group policy
• **/recheck** - Report which members don't meet requirements
• **/enforce** - Remove/restrict members below threshold (requires **CONFIRM**)
• **/testjoin** - Test the join flow as an admin

**📝 Examples:**
• \`/setpolicy basic kick\` - Remove non-verified users
• \`/setpolicy basic restrict\` - Make non-verified users read-only
• \`/setpolicy token 0.5 XCP kick\` - Remove users without **0.5 XCP**
• \`/setpolicy token 1000 PEPECASH restrict\` - Restrict users without **1000 PEPECASH**

**⚡ Quick Start Workflow:**
1. **Set policy:** \`/setpolicy token 1 XCP kick\`
2. **Check status:** \`/recheck\` (shows report)
3. **Enforce policy:** \`/enforce\` (type **CONFIRM** when prompted)

**🔒 Enforcement Options:**
• **kick** - Remove non-compliant users (24h auto-checks)
• **restrict** - Make non-compliant users read-only (24h auto-checks)

**💡 Support:** https://telegram.xcp.io/faq`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // Handle /setpolicy command (in groups only)
  bot.command('setpolicy', async (ctx) => {
    // Check if in group
    if (ctx.chat?.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }
    
    // Check if forum group
    const { checkGroupIsForumEnabled } = await import('@/src/lib/telegram');
    const isForum = await checkGroupIsForumEnabled(ctx.chat!.id);
    
    if (isForum) {
      await ctx.reply(`⚠️ **Forum Groups Not Supported**

This group has Topics enabled. The bot cannot work properly in forum groups.

Please disable Topics in group settings to use XCP Group Bot.`, { parse_mode: 'Markdown' });
      return;
    }

    // Check if user is admin
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status !== 'administrator' && member.status !== 'creator') {
      await ctx.reply('Only group admins can configure policies.');
      return;
    }

    const args = ctx.message?.text?.split(' ').slice(1) || [];
    
    if (args.length === 0) {
      await ctx.reply('Usage: /setpolicy basic OR /setpolicy token <AMOUNT> <ASSET> [kick|restrict]');
      return;
    }

    const chatId = String(ctx.chat!.id);
    const { db } = await import('@/src/db/prisma');

    try {
      // Get chat name from context
      const chatName = ctx.chat?.title || ctx.chat?.first_name || null;

      // Ensure the group exists before creating/updating the policy
      await db.group.upsert({
        where: { chatId },
        update: {
          updatedAt: new Date(),
          chatName: chatName  // Update chat name if we have it
        },
        create: {
          chatId,
          chatName: chatName,
          ownerTgId: String(ctx.from!.id)
        }
      });

      if (args[0] === 'basic') {
        // Parse optional enforcement action - default to 'restrict'
        const enforcementAction = args[1] && ['kick', 'restrict'].includes(args[1]) ? args[1] : 'restrict';
        const onFail = enforcementAction === 'restrict' ? 'restrict' : 'soft_kick';
        
        // Create basic policy with enforcement action
        await db.policy.upsert({
          where: { chatId },
          update: {
            type: 'basic',
            asset: null,
            minAmount: null,
            includeUnconfirmed: false,
            onFail
          },
          create: {
            chatId,
            type: 'basic',
            asset: null,
            minAmount: null,
            includeUnconfirmed: false,
            onFail
          }
        });
        
        await ctx.reply(`✅ Policy set to: Basic (address verification only)
**Enforcement:** ${enforcementAction === 'restrict' ? 'Restrict (read-only)' : 'Kick (remove)'}`, { parse_mode: 'Markdown' });
      } else if (args[0] === 'token' && args[1] && args[2]) {
        // Set token policy
        const amount = args[1];
        const asset = args[2].toUpperCase();
        
        // Parse optional enforcement action - default to 'restrict'
        const enforcementAction = args[3] && ['kick', 'restrict'].includes(args[3]) ? args[3] : 'restrict';
        const onFail = enforcementAction === 'restrict' ? 'restrict' : 'soft_kick';
        
        // Upsert policy in database
        await db.policy.upsert({
          where: { chatId },
          update: {
            type: 'token',
            asset: asset,
            minAmount: amount,
            includeUnconfirmed: false,
            onFail
          },
          create: {
            chatId,
            type: 'token',
            asset: asset,
            minAmount: amount,
            includeUnconfirmed: false,
            onFail
          }
        });
        
        await ctx.reply(`✅ **Policy set to: Token**
**Asset:** ${asset}
**Minimum:** ${amount}
**Enforcement:** ${enforcementAction === 'restrict' ? 'Restrict (read-only)' : 'Kick (remove)'}`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('Invalid format. Use: /setpolicy basic [kick|restrict] OR /setpolicy token <AMOUNT> <ASSET> [kick|restrict]');
      }
    } catch (error) {
      console.error('Failed to set policy:', error);
      await ctx.reply('Failed to set policy. Please try again.');
    }
  });

  // Handle /recheck command (report on verification status or balances)
  bot.command('recheck', async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }

    // Check if user is admin
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status !== 'administrator' && member.status !== 'creator') {
      await ctx.reply('Only group admins can use this command.');
      return;
    }

    const chatId = String(ctx.chat!.id);
    const policy = await getPolicyForChat(chatId);
    const isBasicPolicy = !policy || policy.type === 'basic';

    if (isBasicPolicy) {
      await ctx.reply(`🔍 **Checking member verification status...**`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`🔍 **Checking member balances...**

Required: **${policy.minAmount} ${policy.asset}**`, { parse_mode: 'Markdown' });
    }

    try {
      const { db } = await import('@/src/db/prisma');
      const { passesTokenPolicy } = await import('@/src/lib/policy');
      const { getChatMember, getChatMemberCount } = await import('@/src/lib/telegram');
      const { generatePolicyHash, isGrandfathered } = await import('@/src/lib/policyHash');
      
      // Get total member count from Telegram
      const totalMembers = await getChatMemberCount(chatId) || 0;

      // Get current policy hash
      const currentPolicyHash = generatePolicyHash(policy);

      // Get tracked members from database
      const trackedMembers = await db.member.findMany({
        where: { chatId }
      });

      const nonCompliantMembers: string[] = [];
      const grandfatheredMembers: string[] = [];
      let compliantCount = 0;
      let adminCount = 0;
      const untrackedCount = totalMembers - trackedMembers.length;
      let errorCount = 0;

      for (const member of trackedMembers) {
        try {
          // Check if user is still in group
          const chatMember = await getChatMember(chatId, member.tgId);
          if (!chatMember || chatMember.status === 'left' || chatMember.status === 'kicked') {
            continue;
          }

          // Update cached username/name if different
          const user = chatMember.user;
          if (user && (member.tgUsername !== user.username || member.tgName !== user.first_name)) {
            await db.member.update({
              where: { id: member.id },
              data: {
                tgUsername: user.username || null,
                tgName: user.first_name || null
              }
            });
          }

          // Skip admins/creators
          if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
            adminCount++;
            continue;
          }

          // Check if member is grandfathered
          if (isGrandfathered(member.policyHash, currentPolicyHash)) {
            const user = chatMember.user;
            const displayName = user.username ? `@${user.username}` : (user.first_name || `User ${member.tgId}`);
            grandfatheredMembers.push(displayName);
            continue;
          }

          let passes = false;

          if (isBasicPolicy) {
            // For basic policy, just check if they have a verified address
            passes = member.state === 'verified' && !!member.address;
          } else {
            // For token policy, check balance
            if (member.address) {
              passes = await passesTokenPolicy(member.address, {
                asset: policy.asset!,
                min_amount: policy.minAmount!,
                include_unconfirmed: policy.includeUnconfirmed
              });
            }
          }

          if (!passes) {
            // Get username or name for display
            const user = chatMember.user;
            const displayName = user.username ? `@${user.username}` : (user.first_name || `User ${member.tgId}`);
            if (isBasicPolicy) {
              nonCompliantMembers.push(`${displayName} (not verified)`);
            } else {
              nonCompliantMembers.push(displayName);
            }
          } else {
            compliantCount++;
          }
        } catch (error) {
          console.error(`Error checking member ${member.tgId}:`, error);
          errorCount++;
        }
      }

      // Build report message
      let message = `📊 **${isBasicPolicy ? 'Verification' : 'Balance'} Check Report**\n\n`;
      message += `**Total members:** ${totalMembers}\n`;
      message += `**Tracked:** ${trackedMembers.length}\n`;
      message += `**Untracked:** ${untrackedCount} (not in database)\n`;
      message += `**Admins:** ${adminCount}\n`;
      if (grandfatheredMembers.length > 0) {
        message += `**Grandfathered:** ${grandfatheredMembers.length} (policy changed)\n`;
      }
      if (errorCount > 0) {
        message += `**Errors:** ${errorCount}\n`;
      }
      message += '\n';

      if (isBasicPolicy) {
        message += `**Verification Status:**\n`;
        message += `✅ Verified: ${compliantCount}\n`;
        message += `❌ Not verified: ${nonCompliantMembers.length}\n`;
      } else {
        message += `**Balance Status:**\n`;
        message += `✅ Sufficient: ${compliantCount}\n`;
        message += `❌ Insufficient: ${nonCompliantMembers.length}\n`;
      }

      if (grandfatheredMembers.length > 0) {
        message += `\n**Grandfathered members (exempt until /enforce):**\n`;
        const displayLimit = 10;
        const displayGrandfathered = grandfatheredMembers.slice(0, displayLimit);
        message += displayGrandfathered.join('\n');

        if (grandfatheredMembers.length > displayLimit) {
          message += `\n...and ${grandfatheredMembers.length - displayLimit} others`;
        }
      }

      if (nonCompliantMembers.length > 0) {
        message += `\n**Members ${isBasicPolicy ? 'without verification' : 'with insufficient balance'}:**\n`;
        const displayLimit = 20;
        const displayMembers = nonCompliantMembers.slice(0, displayLimit);
        message += displayMembers.join('\n');

        if (nonCompliantMembers.length > displayLimit) {
          message += `\n...and ${nonCompliantMembers.length - displayLimit} others`;
        }

        message += `\n\n⚠️ Run /enforce to apply policy to all members`;
      } else if (grandfatheredMembers.length === 0) {
        message += `\n✅ All tracked members meet the requirements!`;
      }

      if (untrackedCount > 0) {
        message += `\n\n💡 ${untrackedCount} members not in database. Run /enforce to check them.`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Recheck error:', error);
      await ctx.reply('❌ Failed to complete check. Check logs for details.');
    }
  });

  // Handle /enforce command (actually remove members who don't meet requirements)
  bot.command('enforce', async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }

    // Check if user is admin
    const member = await ctx.getChatMember(ctx.from!.id);
    if (member.status !== 'administrator' && member.status !== 'creator') {
      await ctx.reply('Only group admins can use this command.');
      return;
    }

    const chatId = String(ctx.chat!.id);
    const policy = await getPolicyForChat(chatId);
    const isBasicPolicy = !policy || policy.type === 'basic';

    // Check if this is a confirmation (message contains CONFIRM parameter)
    const messageText = ctx.message?.text || '';
    const isConfirmed = messageText.includes('CONFIRM');
    
    if (!isConfirmed) {
      // Ask for confirmation
      let warningMessage = `⚠️ **Warning: Enforcement Mode**

This will:
• Check ALL members (including grandfathered)`;
      
      if (isBasicPolicy) {
        warningMessage += `
• Remove those without verified addresses`;
      } else {
        warningMessage += `
• Remove those without ${policy!.minAmount} ${policy!.asset}`;
      }
      
      warningMessage += `
• Cannot be undone

To proceed, type: /enforce CONFIRM`;

      await ctx.reply(warningMessage, { parse_mode: 'Markdown' });
      return;
    }

    const actionText = (policy?.onFail === 'restrict') ? 'Restricting' : 'Removing';
    let statusMessage = `🔨 **Starting enforcement...**

`;
    
    if (isBasicPolicy) {
      statusMessage += `${actionText} members without **verified addresses**`;
    } else {
      statusMessage += `${actionText} members without **${policy!.minAmount} ${policy!.asset}**`;
    }
    
    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });

    try {
      const { db } = await import('@/src/db/prisma');
      const { passesTokenPolicy } = await import('@/src/lib/policy');
      const { softKick, restrictMember, getChatMember } = await import('@/src/lib/telegram');
      const { sendDM } = await import('@/src/lib/telegram');
      const { generatePolicyHash } = await import('@/src/lib/policyHash');
      
      // Get current policy hash
      const currentPolicyHash = generatePolicyHash(policy);

      // Get ALL group members from Telegram API
      // Note: This is limited, we'd need to iterate for large groups
      // For now, work with tracked members + prompt to verify new ones

      const trackedMembers = await db.member.findMany({
        where: { chatId }
      });

      let removedCount = 0;
      let keptCount = 0;
      let errorCount = 0;
      let updatedHashCount = 0;
      const removedNames: string[] = [];

      for (const member of trackedMembers) {
        try {
          // Check if user is still in group
          const chatMember = await getChatMember(chatId, member.tgId);
          if (!chatMember || chatMember.status === 'left' || chatMember.status === 'kicked') {
            // Clean up database
            await db.member.delete({
              where: { id: member.id }
            });
            continue;
          }

          // NEVER remove admins/creators
          if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
            // Still update their policy hash if needed
            if (member.policyHash !== currentPolicyHash) {
              await db.member.update({
                where: { id: member.id },
                data: {
                  policyHash: currentPolicyHash,
                  lastCheck: new Date()
                }
              });
              updatedHashCount++;
            }
            keptCount++;
            continue;
          }

          // Track if this member was grandfathered (hash mismatch)
          const wasGrandfathered = member.policyHash !== currentPolicyHash;

          let passes = false;

          if (isBasicPolicy) {
            // For basic policy, just check if they have a verified address
            passes = !!member.address && member.state === 'verified';
          } else {
            // For token policy, check if they have an address first, then check balance
            if (!member.address) {
              passes = false;
            } else {
              passes = await passesTokenPolicy(member.address, {
                asset: policy!.asset!,
                min_amount: policy!.minAmount!,
                include_unconfirmed: policy!.includeUnconfirmed
              });
            }
          }

          if (!passes) {
            // Apply enforcement action
            const defaultOnFail = 'soft_kick'; // Default for both basic and no policy
            const onFail = policy?.onFail || defaultOnFail;
            
            if (onFail === 'restrict') {
              await restrictMember(chatId, member.tgId);
              
              // Update database with new policy hash
              await db.member.update({
                where: { id: member.id },
                data: {
                  state: 'restricted',
                  policyHash: currentPolicyHash,
                  lastCheck: new Date()
                }
              });
              
              const user = chatMember.user;
              const displayName = user.username ? `@${user.username}` : (user.first_name || 'User');
              
              if (isBasicPolicy) {
                removedNames.push(`${displayName} (restricted - not verified)`);
              } else {
                removedNames.push(`${displayName} (restricted - insufficient balance)`);
              }
              removedCount++;
              
              // Try to notify them
              try {
                const groupName = ctx.chat?.username ? `@${ctx.chat.username}` : ctx.chat?.title;
                let dmMessage: string;
                
                if (isBasicPolicy) {
                  dmMessage = `You've been restricted in **${groupName}** because you haven't verified your address.

You can only read messages. To regain posting privileges, please verify your Counterparty address.`;
                } else {
                  dmMessage = `You've been restricted in **${groupName}** because your balance of ${policy!.asset} is below the required ${policy!.minAmount}.

You can only read messages. To regain posting privileges, ensure you have the required balance.`;
                }
                
                await sendDM(member.tgId, dmMessage);
              } catch {
                // Ignore DM errors
              }
            } else {
              // Remove member from group
              await softKick(chatId, member.tgId);
              
              // Update database with new policy hash
              await db.member.update({
                where: { id: member.id },
                data: {
                  state: 'kicked',
                  policyHash: currentPolicyHash,
                  lastCheck: new Date()
                }
              });
              
              const user = chatMember.user;
              const displayName = user.username ? `@${user.username}` : (user.first_name || 'User');
              
              if (isBasicPolicy) {
                removedNames.push(`${displayName} (removed - not verified)`);
              } else {
                removedNames.push(`${displayName} (removed - insufficient balance)`);
              }
              removedCount++;
              
              // Try to notify them
              try {
                const groupName = ctx.chat?.username ? `@${ctx.chat.username}` : ctx.chat?.title;
                let dmMessage: string;
                
                if (isBasicPolicy) {
                  dmMessage = `You've been removed from **${groupName}** because you haven't verified your address.

To rejoin, please verify your Counterparty address and request to join again.`;
                } else {
                  dmMessage = `You've been removed from **${groupName}** because your balance of ${policy!.asset} is below the required ${policy!.minAmount}.

To rejoin, ensure you have the required balance and request to join again.`;
                }
                
                await sendDM(member.tgId, dmMessage);
              } catch {
                // Ignore DM errors
              }
            }
          } else {
            // Update policy hash and last check time
            await db.member.update({
              where: { id: member.id },
              data: {
                policyHash: currentPolicyHash,
                lastCheck: new Date()
              }
            });
            if (wasGrandfathered) {
              updatedHashCount++;
            }
            keptCount++;
          }
        } catch (error) {
          console.error(`Error enforcing on member ${member.tgId}:`, error);
          errorCount++;
        }
      }

      // Build result message
      const defaultOnFail = 'soft_kick';
      const onFail = policy?.onFail || defaultOnFail;
      const actionLabel = onFail === 'restrict' ? 'Restricted' : 'Removed';
      let message = `✅ **Enforcement Complete**\n\n`;
      message += `**${actionLabel}:** ${removedCount} members\n`;
      message += `**Kept:** ${keptCount} members\n`;
      if (updatedHashCount > 0) {
        message += `**Updated from grandfathered:** ${updatedHashCount} members\n`;
      }
      if (errorCount > 0) {
        message += `**Errors:** ${errorCount} members\n`;
      }
      
      if (removedNames.length > 0) {
        message += `\n**${actionLabel} members:**\n`;
        const displayLimit = 10;
        const displayNames = removedNames.slice(0, displayLimit);
        message += displayNames.join('\n');
        
        if (removedNames.length > displayLimit) {
          message += `\n...and ${removedNames.length - displayLimit} others`;
        }
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Enforcement error:', error);
      await ctx.reply('❌ Failed to complete enforcement. Check logs for details.');
    }
  });

  // Handle /settings command
  bot.command('settings', async (ctx) => {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('This command can only be used in groups.');
      return;
    }

    const chatId = String(ctx.chat!.id);
    const policy = await getPolicyForChat(chatId);
    
    let message = '📋 **Current Group Settings**\n\n';
    
    if (!policy) {
      message += '**Policy:** Basic (default - address verification only)\n';
      message += '**Enforcement:** Restrict (read-only)\n';
    } else if (policy.type === 'basic') {
      message += '**Policy:** Basic (address verification only)\n';
      message += `**Enforcement:** ${policy.onFail === 'restrict' ? 'Restrict (read-only)' : 'Kick (remove)'}\n`;
    } else if (policy.type === 'token') {
      message += `**Policy:** Token Requirement\n`;
      message += `**Asset:** ${policy.asset}\n`;
      message += `**Minimum:** ${policy.minAmount}\n`;
      message += `**Enforcement:** ${policy.onFail === 'restrict' ? 'Restrict (read-only)' : 'Kick (remove)'}\n`;
      if (policy.includeUnconfirmed) {
        message += `**Include Unconfirmed:** Yes\n`;
      }
    }
    
    message += '\nUse /setpolicy to change.';
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // Handle when bot is added to a group
  bot.on('my_chat_member', async (ctx) => {
    const update = ctx.update.my_chat_member;
    
    // Check if bot was added to a group/supergroup
    if (update?.new_chat_member?.status === 'administrator' || 
        update?.new_chat_member?.status === 'member') {
      
      if (update.chat.type === 'group' || update.chat.type === 'supergroup') {
        const chatId = update.chat.id;
        
        // Get proper chat info via API call
        const { checkGroupHasApprovalRequired, checkGroupIsForumEnabled } = await import('@/src/lib/telegram');
        const [hasApproval, isForum] = await Promise.all([
          checkGroupHasApprovalRequired(chatId),
          checkGroupIsForumEnabled(chatId)
        ]);
        
        // Check for forum/topics issue first
        if (isForum) {
          const errorMessage = `⚠️ **Forum Groups Not Supported!**

This group has Topics/Forum mode enabled, which prevents the bot from working properly.

**To use XCP Group Bot, you need to:**
1. Go to Group Settings → Edit
2. Turn OFF "Topics" / "Forum" mode
3. Re-add the bot after disabling topics

Forum groups restrict bots to single topics and break token-gating functionality.

For help, visit: https://telegram.xcp.io/faq`;

          try {
            await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
          } catch (error) {
            console.error('Failed to send forum warning:', error);
          }
          return; // Exit early for forum groups
        }
        
        // Persist the group in database
        const { db } = await import('@/src/db/prisma');
        const chatIdStr = String(chatId);
        const addedBy = String(update.from.id);

        await db.group.upsert({
          where: { chatId: chatIdStr },
          update: { updatedAt: new Date() },
          create: {
            chatId: chatIdStr,
            ownerTgId: addedBy // User who added the bot
          }
        });

        // Check bot permissions
        const botMember = await ctx.getChatMember(ctx.me.id);
        const isAdmin = botMember.status === 'administrator' || botMember.status === 'creator';
        const canInvite = isAdmin && (botMember.status === 'creator' ||
          (botMember.status === 'administrator' && botMember.can_invite_users !== false));

        // Check if policy is configured
        const policy = await getPolicyForChat(chatIdStr);
        const hasPolicy = policy && policy.type === 'token';

        // Get chat info to determine if public or private
        const { getChat } = await import('@/src/lib/telegram');
        const chatInfo = await getChat(chatId);
        const isPrivateGroup = !chatInfo?.username; // Private groups don't have usernames

        let welcomeMessage = `👋 **Thanks for adding me!**

I'll help you token-gate this group with Counterparty.

**Setup Status:**
${isAdmin ? '✅' : '❌'} Bot is admin
${canInvite ? '✅' : '❌'} Can invite users permission
${hasApproval ? '✅' : '❌'} Approval for new members
${hasPolicy ? '✅' : '❌'} Policy ${hasPolicy ? `(${policy.minAmount} ${policy.asset})` : 'not configured'}`;

        if (!hasApproval) {
          if (isPrivateGroup) {
            welcomeMessage += `

⚠️ **Private Group Setup Required:**
The bot only gates users who join via invite links with **"Request Admin Approval"** enabled.

1. Go to **Group Info → Invite Links**
2. Create or edit a link
3. Enable **"Request Admin Approval"**
4. Share only this link for gated access`;
          } else {
            welcomeMessage += `

⚠️ **Public Group Setup Required:**
Enable **"Approve new members"** in group settings.

1. Go to **Group Info → Edit**
2. Turn on **"Approve new members"**`;
          }
        }
        
        if (!isAdmin || !canInvite) {
          welcomeMessage += `

⚠️ Bot needs admin permissions with "Add New Members" enabled`;
        }
        
        welcomeMessage += `

**Next Step:** Use /setpolicy to configure requirements`;

        try {
          await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
        } catch (error) {
          console.error('Failed to send welcome message:', error);
        }
      }
    }
  });

  // Handle when any member joins/leaves (for tracking)
  bot.on('chat_member', async (ctx) => {
    const update = ctx.update.chat_member;
    
    // Track new members who join directly (not via join request)
    if (update?.new_chat_member?.status === 'member' && 
        update?.old_chat_member?.status === 'left') {
      
      const chatId = String(update.chat.id);
      const userId = String(update.new_chat_member.user.id);
      
      console.log(`User ${userId} joined group ${chatId} directly (manually added)`);
      
      try {
        // Check if there's a policy requiring verification
        const policy = await getPolicyForChat(chatId);
        
        if (policy) {
          // Add member to database as unverified
          const { db } = await import('@/src/db/prisma');
          
          // Ensure the group exists before creating member record
          await db.group.upsert({
            where: { chatId },
            update: { updatedAt: new Date() },
            create: { 
              chatId,
              ownerTgId: userId  // The user joining is set as owner for now
            }
          });

          // Get user info for caching
          const user = update.new_chat_member.user;
          const username = user.username || null;
          const firstName = user.first_name || null;

          await db.member.upsert({
            where: {
              chatId_tgId: {
                chatId: chatId,
                tgId: userId
              }
            },
            update: {
              state: 'pending',
              lastCheck: new Date(),
              tgUsername: username,
              tgName: firstName
            },
            create: {
              chatId: chatId,
              tgId: userId,
              tgUsername: username,
              tgName: firstName,
              address: '', // Will need to verify
              state: 'pending',
              lastCheck: new Date()
            }
          });

          // Send verification DM
          const url = new URL(`${process.env.APP_PUBLIC_URL}/verify`);
          url.searchParams.set('tg_id', userId);
          url.searchParams.set('chat_id', chatId);
          if (policy.id) {
            url.searchParams.set('policy_id', policy.id);
          }

          const groupName = update.chat.username ? `@${update.chat.username}` : (update.chat.title || 'this group');
          
          // Build policy-specific message
          let verifyMessage = '';
          if (!policy || policy.type === 'basic') {
            verifyMessage = `To join ${groupName}, **please verify you're a human by signing a message.**`;
          } else if (policy.type === 'token') {
            const amount = policy.minAmount || '0';
            const asset = policy.asset || 'XCP';
            verifyMessage = `To join ${groupName}, **please verify you have at least ${amount} ${asset}.**`;
          }

          const message = `🔐 **Verification Required**

${verifyMessage}

**Option 1:** 🌐 Web Verification
👉 [Click here to verify](${url.toString()})

**Option 2:** 📱 Verify in Telegram
Type /verify to complete verification right here`;

          await sendDM(userId, message);
          await log(chatId, 'info', 'joined', userId, { 
            group_name: groupName,
            method: 'manual_add'
          });
        }
      } catch (error) {
        console.error(`Error handling manual add for user ${userId}:`, error);
        await log(chatId, 'error', 'joined', userId, { 
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'manual_add'
        });
      }
    }
    
    // Track members who leave
    if (update?.new_chat_member?.status === 'left' && 
        update?.old_chat_member?.status === 'member') {
      
      const chatId = String(update.chat.id);
      const userId = String(update.new_chat_member.user.id);
      
      console.log(`User ${userId} left group ${chatId}`);
      
      try {
        // Remove from database
        const { db } = await import('@/src/db/prisma');
        await db.member.deleteMany({
          where: { 
            chatId: chatId,
            tgId: userId
          }
        });
        
        await log(chatId, 'info', 'declined', userId, { reason: 'left_group' });
      } catch (error) {
        console.error(`Error cleaning up user ${userId} who left:`, error);
      }
    }
  });

  bot.on('chat_join_request', async (ctx) => {
    const req = ctx.update.chat_join_request!;
    const chatId = String(req.chat.id);
    const tgId = String(req.from.id);

    try {
      const { db } = await import('@/src/db/prisma');
      const policy = await getPolicyForChat(chatId);

      // Get chat info for caching
      const chatName = req.chat.title || null;

      // Ensure the group exists before creating join request record
      await db.group.upsert({
        where: { chatId },
        update: {
          updatedAt: new Date(),
          chatName: chatName
        },
        create: {
          chatId,
          chatName: chatName,
          ownerTgId: tgId  // The user requesting to join
        }
      });

      // Track the join request with 48-hour expiration
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      await db.joinRequest.upsert({
        where: { chatId_tgId: { chatId, tgId } },
        update: { 
          status: 'pending',
          requestedAt: new Date(),
          expiresAt,
          processedAt: null
        },
        create: {
          chatId,
          tgId,
          status: 'pending',
          expiresAt,
        }
      });

      const url = new URL(`${process.env.APP_PUBLIC_URL}/verify`);
      url.searchParams.set('tg_id', tgId);
      url.searchParams.set('chat_id', chatId);
      if (policy?.id) {
        url.searchParams.set('policy_id', policy.id);
      }

      const dmChatId = (req as unknown as {user_chat_id?: string}).user_chat_id ?? tgId;
      
      // Get group name from the request
      const groupName = req.chat.username ? `@${req.chat.username}` : (req.chat.title || 'this group');
      
      // Build policy-specific message
      let verifyMessage = '';
      if (!policy || policy.type === 'basic') {
        verifyMessage = `To join ${groupName}, **please verify you're a human by signing a message.**`;
      } else if (policy.type === 'token') {
        const amount = policy.minAmount || '0';
        const asset = policy.asset || 'XCP';
        verifyMessage = `To join ${groupName}, **please verify you have at least ${amount} ${asset}.**`;
      }

      const message = `🔐 **Verification Required**

${verifyMessage}

**Option 1:** 🌐 Web Verification
👉 [Click here to verify](${url.toString()})

**Option 2:** 📱 Verify in Telegram
Type /verify to complete verification right here`;

      await sendDM(dmChatId, message);
      await log(chatId, 'info', 'joined', tgId, {});
      
    } catch (error) {
      console.error('Error handling join request:', error);
      await log(chatId, 'error', 'joined', tgId, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return bot;
}