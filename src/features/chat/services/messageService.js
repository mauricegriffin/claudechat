import { supabase } from '@/supabaseClient'

export const messageService = {
  // Legacy: Fetch all messages (for Everyone group before migration)
  async fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Legacy: Fetch messages with username (for Everyone group before migration)
  async fetchMessagesWithUsername() {
    const { data, error } = await supabase
      .from('messages_with_username')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.warn('Error fetching messages with username, trying fallback:', error)
      // If the view doesn't exist yet (before migration), try basic table
      return this.fetchMessages()
    }
    return data || []
  },

  // NEW: Fetch messages for a specific conversation
  async fetchConversationMessages(conversationId, limit = 50, offset = 0) {
    try {
      // Simple query without joins to avoid errors
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (error) {
        console.error('Error fetching messages:', error)
        return []
      }
      
      // Return with placeholder usernames (will fix with user profiles later)
      const messagesWithUsername = (messages || []).map(message => ({
        ...message,
        username: message.user_id?.substring(0, 8) || 'Unknown'
      }))
      
      return messagesWithUsername.reverse()
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      return []
    }
  },

  // Legacy: Fetch single message (updated for conversation support)
  async fetchNewMessage(messageId) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user_profiles(username)
      `)
      .eq('id', messageId)
      .single()
    
    if (error) {
      console.warn('Error fetching new message:', error)
      throw error
    }
    
    // Add username fallback
    return {
      ...data,
      username: data.user_profiles?.username || 'Unknown User'
    }
  },

  // Legacy: Send message (updated to require conversation_id)
  async sendMessage(content, userId, conversationId = null) {
    // If no conversationId provided, use Everyone group (backward compatibility)
    const targetConversationId = conversationId || '00000000-0000-0000-0000-000000000001'
    
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content: content,
          user_id: userId,
          conversation_id: targetConversationId,
        },
      ])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // NEW: Send message with full conversation support
  async sendConversationMessage(conversationId, content, userId, messageType = 'text', imageUrl = null) {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          content: content,
          user_id: userId,
          message_type: messageType,
          image_url: imageUrl,
        },
      ])
      .select(`
        *,
        user_profiles(username)
      `)
      .single()
    
    if (error) throw error
    
    // Add username fallback
    return {
      ...data,
      username: data.user_profiles?.username || 'Unknown User'
    }
  },

  // NEW: Subscribe to messages for specific conversation
  subscribeToConversationMessages(conversationId, callback) {
    return supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        callback
      )
      .subscribe()
  },

  // Legacy: Subscribe to all messages (for Everyone group)
  subscribeToMessages(callback) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        callback
      )
      .subscribe()
  },

  // NEW: Subscribe to unread counts
  subscribeToUnreadCounts(userId, callback) {
    return supabase
      .channel(`unread-counts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        callback
      )
      .subscribe()
  },

  // Legacy: Delete all messages
  async deleteAllMessages() {
    const { error } = await supabase
      .from('messages')
      .delete()
      .neq('id', 0)
    
    if (error) throw error
  },

  // NEW: Get unread message count for conversation
  async getUnreadCount(conversationId, userId) {
    try {
      // Get user's last read timestamp for this conversation
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single()

      if (participantError) throw participantError

      if (!participant) return 0

      // Count messages in conversation created after last read time
      const { count, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .gt('created_at', participant.last_read_at)

      if (countError) throw countError

      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  },

  // NEW: Mark conversation as read
  async markConversationAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ 
          last_read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error marking conversation as read:', error)
        // Don't throw - just log the error
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error)
      // Don't throw - just log the error
    }
  }
}