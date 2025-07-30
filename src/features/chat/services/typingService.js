import { supabase } from '@/supabaseClient'

export const typingService = {
  // Debounce timer reference
  debounceTimer: null,
  
  // Update typing status
  async updateTypingStatus(userId, isTyping = true) {
    try {
      if (import.meta.env.DEV) {
        console.log('Updating typing status:', { userId, isTyping })
      }
      
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
      
      if (import.meta.env.DEV) {
        console.log('Typing status updated successfully:', { userId, isTyping })
      }
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
      // Try the view first
      const { data, error } = await supabase
        .from('typing_indicators_with_username')
        .select('*')
      
      if (error) {
        console.warn('View query failed, trying direct table query:', error)
        
        // Fallback to direct table query with join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('typing_indicators')
          .select(`
            id,
            user_id,
            is_typing,
            last_typed_at,
            created_at,
            user_profiles!inner(username)
          `)
          .eq('is_typing', true)
          .gte('last_typed_at', new Date(Date.now() - 5000).toISOString()) // Last 5 seconds
        
        if (fallbackError) throw fallbackError
        
        // Transform the data to match expected format
        return (fallbackData || []).map(item => ({
          ...item,
          username: item.user_profiles?.username || 'Unknown User'
        }))
      }
      
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