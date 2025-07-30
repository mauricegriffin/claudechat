import { supabase } from '@/supabaseClient'

export const typingService = {
  // Debounce timer reference
  debounceTimer: null,
  
  // Update typing status
  async updateTypingStatus(userId, isTyping = true) {
    try {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          user_id: userId,
          is_typing: isTyping,
          last_typed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) throw error
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  },

  // Start typing with debounce
  startTyping(userId) {
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    
    // Update typing status immediately
    this.updateTypingStatus(userId, true)
    
    // Set timer to stop typing after 3 seconds of inactivity
    this.debounceTimer = setTimeout(() => {
      this.stopTyping(userId)
    }, 3000)
  },

  // Stop typing
  async stopTyping(userId) {
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    
    await this.updateTypingStatus(userId, false)
  },

  // Fetch current typing users
  async getTypingUsers() {
    try {
      const { data, error } = await supabase
        .from('typing_indicators_with_username')
        .select('*')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching typing users:', error)
      return []
    }
  },

  // Subscribe to typing indicators
  subscribeToTypingIndicators(callback) {
    return supabase
      .channel('typing_indicators')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators'
        },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()
  },

  // Clean up on component unmount
  cleanup(userId) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    // Mark user as not typing when they leave
    this.stopTyping(userId)
  }
}