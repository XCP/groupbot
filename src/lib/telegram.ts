const BOT = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT}`;

async function tgm(method: string, body: unknown) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`TG ${method} failed: ${j.description}`);
  return j.result;
}

export async function sendDM(chatId: string | number, text: string) {
  try {
    return await tgm('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    // Re-throw with more context if it's a DM failure
    if (error instanceof Error && error.message.includes("Forbidden: bot can't initiate conversation")) {
      const dmError = new Error('DM_BLOCKED: User has disabled DMs from bots');
      (dmError as any).originalError = error;
      throw dmError;
    }
    throw error;
  }
}

export async function sendGroupMessage(chatId: string | number, text: string, replyToMessageId?: number) {
  return tgm('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_to_message_id: replyToMessageId
  });
}

export async function approveJoin(chatId: string | number, userId: string | number) {
  try {
    return await tgm('approveChatJoinRequest', {
      chat_id: chatId,
      user_id: userId
    });
  } catch (error) {
    // HIDE_REQUESTER_MISSING means the request was already processed or expired
    // This is not critical - user may have been approved manually or request expired
    if (error instanceof Error && error.message.includes('HIDE_REQUESTER_MISSING')) {
      console.log('Join request already processed or expired for user:', userId);
      return null;
    }
    throw error;
  }
}

export async function declineJoin(chatId: string | number, userId: string | number) {
  try {
    return await tgm('declineChatJoinRequest', {
      chat_id: chatId,
      user_id: userId
    });
  } catch (error) {
    // HIDE_REQUESTER_MISSING means the request was already processed or expired
    if (error instanceof Error && error.message.includes('HIDE_REQUESTER_MISSING')) {
      console.log('Join request already processed or expired for user:', userId);
      return null;
    }
    throw error;
  }
}

export async function restrictMember(chatId: string | number, userId: string | number) {
  const perms = {
    can_send_messages: false,
    can_send_audios: false,
    can_send_documents: false,
    can_send_photos: false,
    can_send_videos: false,
    can_send_video_notes: false,
    can_send_voice_notes: false,
    can_send_polls: false,
    can_add_web_page_previews: false,
    can_change_info: false,
    can_invite_users: false,
    can_pin_messages: false
  };
  return tgm('restrictChatMember', {
    chat_id: chatId,
    user_id: userId,
    permissions: perms
  });
}

export async function unrestrictMember(chatId: string | number, userId: string | number) {
  try {
    // First, get the chat to see its default permissions
    const chat = await getChat(chatId);

    // Check if chat has default permissions set (only available for groups/supergroups)
    if (chat?.permissions) {
      console.log('Using group default permissions for unrestrict');
      // Use the group's default permissions
      return tgm('restrictChatMember', {
        chat_id: chatId,
        user_id: userId,
        permissions: chat.permissions
      });
    } else {
      console.log('No default permissions found, using standard unrestrict');
      // Fallback: remove all restrictions (makes them a normal member with default perms)
      // This essentially "unrestricts" by removing their entry from the restriction list
      return tgm('restrictChatMember', {
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false,
          can_manage_topics: false
        }
      });
    }
  } catch (error) {
    console.error('Failed to get chat permissions, using defaults:', error);
    // If we can't get chat info, just remove restrictions with conservative defaults
    return tgm('restrictChatMember', {
      chat_id: chatId,
      user_id: userId,
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false
      }
    });
  }
}

export async function softKick(chatId: string | number, userId: string | number) {
  return tgm('unbanChatMember', { 
    chat_id: chatId, 
    user_id: userId 
  });
}

export async function getChat(chatId: string | number) {
  try {
    return await tgm('getChat', { chat_id: chatId });
  } catch (error) {
    console.error('Failed to get chat info:', error);
    return null;
  }
}

export async function getChatInviteLinks(chatId: string | number) {
  try {
    // Get all invite links for the chat
    const result = await tgm('exportChatInviteLink', { chat_id: chatId });
    return result;
  } catch (error) {
    console.error('Failed to get invite links:', error);
    return null;
  }
}

export async function checkGroupHasApprovalRequired(chatId: string | number): Promise<boolean> {
  try {
    const chat = await getChat(chatId);
    if (!chat) return false;
    
    // Check if group has join_by_request enabled (for groups with this setting)
    if (chat.join_by_request) return true;
    
    // Check if group requires join to send messages (another indicator)
    if (chat.join_to_send_messages) return true;
    
    // For private groups, always need approval
    if (chat.type === 'private') return true;
    
    return false;
  } catch (error) {
    console.error('Failed to check group approval:', error);
    return false;
  }
}

export async function checkGroupIsForumEnabled(chatId: string | number): Promise<boolean> {
  try {
    const chat = await getChat(chatId);
    if (!chat) return false;
    
    // Check if group is a forum (has topics enabled)
    return chat.is_forum === true;
  } catch (error) {
    console.error('Failed to check forum status:', error);
    return false;
  }
}

export async function getChatMemberCount(chatId: string | number) {
  try {
    return await tgm('getChatMemberCount', { chat_id: chatId });
  } catch (error) {
    console.error('Failed to get member count:', error);
    return null;
  }
}

export async function getChatPhoto(chatId: string | number): Promise<string | null> {
  try {
    const chat = await getChat(chatId);
    if (!chat?.photo?.small_file_id) return null;
    
    // Get file path from Telegram
    const file = await tgm('getFile', { file_id: chat.photo.small_file_id });
    if (!file?.file_path) return null;
    
    // Return direct URL to Telegram's CDN
    return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  } catch (error) {
    console.error('Failed to get chat photo:', error);
    return null;
  }
}

export async function getChatMember(chatId: string | number, userId: string | number) {
  try {
    return await tgm('getChatMember', { chat_id: chatId, user_id: userId });
  } catch (error) {
    console.error('Failed to get chat member:', error);
    return null;
  }
}

export async function isAdmin(chatId: string | number, userId: string | number): Promise<boolean> {
  const member = await getChatMember(chatId, userId);
  if (!member) return false;
  return member.status === 'administrator' || member.status === 'creator';
}

export async function getUser(userId: string | number) {
  try {
    // Note: This only works if the bot has interacted with the user before
    // For privacy reasons, Telegram doesn't allow bots to get arbitrary user info
    const member = await tgm('getChat', { chat_id: userId });
    return member;
  } catch (error) {
    console.error('Failed to get user info:', error);
    return null;
  }
}