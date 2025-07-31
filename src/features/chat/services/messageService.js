import { supabase } from '@/supabaseClient'

export const messageService = {
  async fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

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

  async fetchNewMessage(messageId) {
    const { data, error } = await supabase
      .from('messages_with_username')
      .select('*')
      .eq('id', messageId)
      .single()
    
    if (error) {
      console.warn('Error fetching new message from view, trying basic table:', error)
      // Fallback to basic messages table
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single()
      
      if (fallbackError) throw fallbackError
      return fallbackData
    }
    return data
  },

  async sendMessage(content, userId) {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content: content,
          user_id: userId,
        },
      ])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteAllMessages() {
    const { error } = await supabase
      .from('messages')
      .delete()
      .neq('id', 0)
    
    if (error) throw error
  },

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
  }
}