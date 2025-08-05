import { supabase } from '../supabaseClient'

export const conversationService = {
  // Get user's conversations with last message preview and participant info
  async getUserConversations(userId) {
    try {
      console.log('ConversationService: Fetching conversations for user:', userId)
      
      // First try the simple query to see if user has access to conversations
      const { data: simpleData, error: simpleError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations(*)
        `)
        .eq('user_id', userId)
      
      if (simpleError) {
        console.error('ConversationService: Error with simple query:', simpleError)
        
        // If user has no conversations, try to add them to Everyone group
        console.log('ConversationService: Attempting to add user to Everyone group')
        await this.ensureUserInEveryoneGroup(userId)
        
        // Retry simple query
        const { data: retryData, error: retryError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations(*)
          `)
          .eq('user_id', userId)
        
        if (retryError) {
          console.error('ConversationService: Retry failed:', retryError)
          return []
        }
        
        console.log('ConversationService: Retry successful:', retryData)
        const retryConversations = (retryData || []).map(item => item.conversations).filter(Boolean)
        
        // Enhance direct conversations with participant information
        const enhancedRetryConversations = await Promise.all(
          retryConversations.map(async (conversation) => {
            if (conversation.type === 'direct') {
              try {
                // Get the other participant in this direct conversation
                const { data: participant, error: participantError } = await supabase
                  .from('conversation_participants')
                  .select('user_id')
                  .eq('conversation_id', conversation.id)
                  .neq('user_id', userId)
                  .single()
                
                if (participantError) {
                  console.warn('Error fetching participant:', participantError)
                  return conversation
                }
                
                if (participant) {
                  // Get the username from user_profiles separately
                  const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('username')
                    .eq('user_id', participant.user_id)
                    .maybeSingle()
                  
                  if (profileError) {
                    console.warn('Error fetching user profile:', profileError)
                  }
                  
                  return {
                    ...conversation,
                    participant_id: participant.user_id,
                    participant_name: profile?.username || `User ${participant.user_id.substring(0, 8)}`
                  }
                }
              } catch (error) {
                console.warn('Error enhancing conversation:', error)
              }
            }
            
            return conversation
          })
        )
        
        return enhancedRetryConversations
      }
      
      console.log('ConversationService: Simple query successful:', simpleData)
      const conversations = (simpleData || []).map(item => item.conversations).filter(Boolean)
      
      // Enhance direct conversations with participant information
      const enhancedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          if (conversation.type === 'direct') {
            try {
              // Get the other participant in this direct conversation
              const { data: participant, error: participantError } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conversation.id)
                .neq('user_id', userId)
                .single()
              
              if (participantError) {
                console.warn('Error fetching participant:', participantError)
                return conversation
              }
              
              if (participant) {
                // Get the username from user_profiles separately
                const { data: profile, error: profileError } = await supabase
                  .from('user_profiles')
                  .select('username')
                  .eq('user_id', participant.user_id)
                  .maybeSingle()
                
                if (profileError) {
                  console.warn('Error fetching user profile:', profileError)
                }
                
                return {
                  ...conversation,
                  participant_id: participant.user_id,
                  participant_name: profile?.username || `User ${participant.user_id.substring(0, 8)}`
                }
              }
            } catch (error) {
              console.warn('Error enhancing conversation:', error)
            }
          }
          
          return conversation
        })
      )
      
      return enhancedConversations
    } catch (error) {
      console.error('Error fetching user conversations:', error)
      throw error
    }
  },

  // Auto-create direct conversation between two users
  async getOrCreateDirectConversation(user1Id, user2Id) {
    try {
      // First, check if conversation already exists
      const { data: existingConversations, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants(user_id)
        `)
        .eq('type', 'direct')
        .eq('participant_count', 2)

      if (fetchError) throw fetchError

      // Find existing direct conversation between these users
      const existingConversation = existingConversations?.find(conv => {
        const participants = conv.conversation_participants.map(p => p.user_id)
        return participants.includes(user1Id) && participants.includes(user2Id)
      })

      if (existingConversation) {
        return existingConversation
      }

      // Create new direct conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          participant_count: 2,
          created_by: user1Id,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      if (convError) throw convError

      // Add both participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user1Id },
          { conversation_id: newConversation.id, user_id: user2Id }
        ])

      if (participantError) throw participantError

      return newConversation
    } catch (error) {
      console.error('Error creating/getting direct conversation:', error)
      throw error
    }
  },

  // Get conversation messages with user info
  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles(username)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Return in ascending order for display
      return (data || []).reverse()
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      throw error
    }
  },

  // Send message to conversation
  async sendMessage(conversationId, content, userId, messageType = 'text', imageUrl = null) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          user_id: userId,
          message_type: messageType,
          image_url: imageUrl
        })
        .select(`
          *,
          user_profiles(username)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  },

  // Subscribe to conversation messages
  subscribeToConversationMessages(conversationId, callback) {
    try {
      const subscription = supabase
        .channel(`conversation-${conversationId}`)
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

      return subscription
    } catch (error) {
      console.error('Error subscribing to conversation messages:', error)
      return null
    }
  },

  // Get unread message counts for user's conversations
  async getUnreadCounts(userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations(
            messages(id, created_at)
          )
        `)
        .eq('user_id', userId)

      if (error) throw error

      const unreadCounts = {}
      
      data?.forEach(participant => {
        const conversationId = participant.conversation_id
        const lastReadAt = new Date(participant.last_read_at)
        const messages = participant.conversations?.messages || []
        
        const unreadCount = messages.filter(msg => 
          new Date(msg.created_at) > lastReadAt
        ).length
        
        unreadCounts[conversationId] = unreadCount
      })

      return unreadCounts
    } catch (error) {
      console.error('Error fetching unread counts:', error)
      return {}
    }
  },

  // Mark messages as read in conversation
  async markAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ 
          last_read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  },

  // Get Everyone group conversation ID
  getEveryoneConversationId() {
    return '00000000-0000-0000-0000-000000000001'
  },

  // Check if user is participant in conversation
  async isParticipant(conversationId, userId) {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Error checking participation:', error)
      return false
    }
  },

  // Helper method to ensure user is in Everyone group
  async ensureUserInEveryoneGroup(userId) {
    try {
      console.log('ConversationService: Adding user to Everyone group:', userId)
      
      // First check if user already exists in Everyone group
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', '00000000-0000-0000-0000-000000000001')
        .eq('user_id', userId)
        .single()

      if (existing) {
        console.log('ConversationService: User already in Everyone group')
        return
      }

      // Add user to Everyone group
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: '00000000-0000-0000-0000-000000000001',
          user_id: userId
        })

      if (error) throw error
      
      console.log('ConversationService: Successfully added user to Everyone group')
      
      // Update participant count
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          participant_count: supabase.sql`participant_count + 1` 
        })
        .eq('id', '00000000-0000-0000-0000-000000000001')

      if (updateError) {
        console.warn('ConversationService: Could not update participant count:', updateError)
      }
    } catch (error) {
      console.error('ConversationService: Error adding user to Everyone group:', error)
      throw error
    }
  }
}