import { supabase } from '@/supabaseClient'

// Simplified typing service to prevent resource exhaustion
class TypingService {
  constructor() {
    this.typingTimeout = null
    this.lastUpdate = 0
    this.updateThrottle = 2000 // Only update every 2 seconds
    this.isTyping = false
  }

  // Update typing status with throttling
  async updateTypingStatus(userId, conversationId, isTyping) {
    const now = Date.now()
    
    // Throttle updates
    if (now - this.lastUpdate < this.updateThrottle && isTyping === this.isTyping) {
      return
    }
    
    this.lastUpdate = now
    this.isTyping = isTyping
    
    try {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          user_id: userId,
          conversation_id: conversationId,
          is_typing: isTyping,
          last_typed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error && error.message.includes('typing_indicators')) {
        // Table doesn't exist yet, silently fail
        console.debug('Typing indicators table not available')
        return
      }
      
      if (error) throw error
    } catch (error) {
      // Silently fail to prevent UI disruption
      console.debug('Typing update skipped:', error.message)
    }
  }

  // Start typing with auto-stop
  startTyping(userId, conversationId) {
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }
    
    // Update status
    this.updateTypingStatus(userId, conversationId, true)
    
    // Auto-stop after 3 seconds
    this.typingTimeout = setTimeout(() => {
      this.updateTypingStatus(userId, conversationId, false)
    }, 3000)
  }

  // Stop typing
  stopTyping(userId, conversationId) {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }
    
    this.updateTypingStatus(userId, conversationId, false)
  }

  // Get typing users for a conversation (with error handling)
  async getTypingUsers(conversationId, currentUserId) {
    try {
      const { data, error } = await supabase
        .from('active_typing_users')
        .select('user_id, username')
        .eq('conversation_id', conversationId)
        .neq('user_id', currentUserId)
      
      if (error && error.message.includes('active_typing_users')) {
        // View doesn't exist yet
        return []
      }
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.debug('Could not fetch typing users:', error.message)
      return []
    }
  }

  // Clean up
  cleanup() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }
  }
}

// Export singleton instance
export const typingService = new TypingService()

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  typingService.cleanup()
})