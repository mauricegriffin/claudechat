import { supabase } from '@/supabaseClient'

export const messageService = {
  // Simplified message fetching
  async fetchConversationMessages(conversationId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching messages:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Error in fetchConversationMessages:', error)
      return []
    }
  },

  // Simplified message sending with retry logic
  async sendConversationMessage(conversationId, content, userId, retryCount = 0) {
    try {
      // Ensure we have all required fields
      if (!conversationId || !content || !userId) {
        throw new Error('Missing required fields')
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content.trim(),
          user_id: userId,
          message_type: 'text',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Retry logic for network errors
      if (retryCount < 2 && (
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.code === 'NETWORK_ERROR'
      )) {
        console.log(`Retrying message send (attempt ${retryCount + 1})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.sendConversationMessage(conversationId, content, userId, retryCount + 1)
      }
      
      throw error
    }
  },

  // Simple subscription
  subscribeToConversationMessages(conversationId, callback) {
    return supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message:', payload)
          callback(payload)
        }
      )
      .subscribe()
  },

  // Fetch single message for real-time updates
  async fetchNewMessage(messageId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()
      
      if (error) {
        console.warn('Error fetching new message:', error)
        throw error
      }
      
      // Add username fallback
      return {
        ...data,
        username: data.user_id?.substring(0, 8) || 'Unknown User'
      }
    } catch (error) {
      console.error('Error in fetchNewMessage:', error)
      throw error
    }
  },

  // Stub methods for compatibility
  async getUnreadCount() { return 0 },
  async markConversationAsRead() { return },
  
  // Legacy methods
  async fetchMessages() {
    return this.fetchConversationMessages('00000000-0000-0000-0000-000000000001')
  },
  
  async sendMessage(content, userId) {
    return this.sendConversationMessage('00000000-0000-0000-0000-000000000001', content, userId)
  }
}