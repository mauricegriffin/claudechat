import { supabase } from '../supabaseClient'

export const userService = {
  // Cache to prevent excessive requests
  _usersCache: null,
  _usersCacheExpiry: null,
  
  // Get all users with their profiles
  async getAllUsers() {
    try {
      // Check cache first (2 minute expiry)
      const now = Date.now()
      if (this._usersCache && this._usersCacheExpiry && now < this._usersCacheExpiry) {
        return this._usersCache
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_id
        `)
        .order('username', { ascending: true })

      if (error) throw error

      // For now, just return users with profiles
      // TODO: Implement server-side user fetching or use different approach
      console.log('UserService: Found users with profiles:', data?.length || 0)
      
      // Map to consistent format
      const allUsers = (data || []).map(profile => ({
        id: profile.user_id,
        email: profile.email || profile.username + '@example.com', // Use real email if available
        username: profile.username,
        created_at: profile.created_at,
        user_id: profile.user_id
      }))

      const sortedUsers = allUsers.sort((a, b) => {
        const nameA = a.username || a.email.split('@')[0]
        const nameB = b.username || b.email.split('@')[0]
        return nameA.localeCompare(nameB)
      })
      
      // Cache the result for 2 minutes
      this._usersCache = sortedUsers
      this._usersCacheExpiry = Date.now() + 120000 // 2 minutes
      
      return sortedUsers
    } catch (error) {
      console.error('Error fetching all users:', error)
      
      // Fallback to just profile data if auth admin fails
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('username', { ascending: true })
        
        if (profileError) throw profileError
        
        const fallbackUsers = profileData?.map(profile => ({
          id: profile.user_id,
          email: profile.email || 'email@example.com', // Use real email if available
          username: profile.username,
          created_at: profile.created_at,
          user_id: profile.user_id
        })) || []

        // Cache fallback result for 1 minute
        this._usersCache = fallbackUsers
        this._usersCacheExpiry = Date.now() + 60000 // 1 minute
        
        return fallbackUsers
      } catch (fallbackError) {
        console.error('Fallback user fetch failed:', fallbackError)
        return []
      }
    }
  },

  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  },

  // Get multiple user profiles by IDs
  async getUserProfiles(userIds) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user profiles:', error)
      return []
    }
  },

  // Search users by username or email
  async searchUsers(query, excludeUserId = null) {
    try {
      let queryBuilder = supabase
        .from('user_profiles')
        .select('*')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .order('username', { ascending: true })
        .limit(20)

      if (excludeUserId) {
        queryBuilder = queryBuilder.neq('user_id', excludeUserId)
      }

      const { data, error } = await queryBuilder

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  },

  // Get users who are not in a specific conversation
  async getUsersNotInConversation(conversationId, excludeUserId = null) {
    try {
      // Get all users
      const allUsers = await this.getAllUsers()
      
      // Get participants in the conversation
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)

      if (error) throw error

      const participantIds = new Set(participants?.map(p => p.user_id) || [])
      
      // Filter out participants and excluded user
      return allUsers.filter(user => 
        !participantIds.has(user.id) && 
        (excludeUserId ? user.id !== excludeUserId : true)
      )
    } catch (error) {
      console.error('Error getting users not in conversation:', error)
      return []
    }
  },

  // Get online users (placeholder for future presence system)
  async getOnlineUsers() {
    try {
      // This would integrate with a presence system
      // For now, return empty set as we haven't implemented presence yet
      return new Set()
    } catch (error) {
      console.error('Error fetching online users:', error)
      return new Set()
    }
  },

  // Subscribe to user presence changes (placeholder)
  subscribeToUserPresence() {
    // This would subscribe to presence changes
    // For now, return a dummy subscription
    return {
      unsubscribe: () => {}
    }
  },

  // Get user statistics
  async getUserStats(userId) {
    try {
      const [conversationCount, messageCount] = await Promise.all([
        // Count conversations user is part of
        supabase
          .from('conversation_participants')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        
        // Count messages user has sent
        supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
      ])

      return {
        conversationCount: conversationCount.count || 0,
        messageCount: messageCount.count || 0
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        conversationCount: 0,
        messageCount: 0
      }
    }
  },

  // Format user display name
  formatUserDisplayName(user) {
    if (!user) return 'Unknown User'
    return user.username || user.email?.split('@')[0] || 'Unknown User'
  },

  // Get user avatar initials
  getUserInitials(user) {
    if (!user) return '?'
    const displayName = this.formatUserDisplayName(user)
    return displayName[0]?.toUpperCase() || '?'
  },

  // Check if user exists
  async userExists(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Error checking if user exists:', error)
      return false
    }
  }
}