import { supabase } from '@/supabaseClient'
import { safeAsync } from '@/shared/utils/errorHandler'

export const authService = {
  async signUp(email, password, metadata = {}) {
    return safeAsync(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      if (error) throw error
      
      // Handle edge case where user is created but not returned
      if (!data.user) {
        throw new Error('Account created but user data not available. Please try logging in.')
      }
      
      return data
    }, 'Failed to create account')
  },

  async signIn(email, password) {
    return safeAsync(async () => {
      console.log('Attempting login for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Login error:', error)
        throw error
      }
      
      if (!data.user) {
        console.error('No user data returned')
        throw new Error('Login failed. Please check your credentials.')
      }
      
      console.log('Login successful for user:', data.user.id)
      return data
    }, 'Failed to sign in')
  },

  async signInWithGoogle() {
    // Use the current origin which should work for both dev and prod
    const redirectTo = `${window.location.origin}/`
    
    console.log('OAuth redirect URL:', redirectTo)
    console.log('Current auth config:', { 
      url: window.location.origin,
      flowType: 'pkce' // Using PKCE flow for better security
    })
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
        // PKCE flow is enabled by default for better security
        skipBrowserRedirect: false
      }
    })
    
    if (error) {
      console.error('OAuth error:', error)
      throw error
    }
    
    console.log('OAuth data:', data)
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  async updateUsername(username) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        username: username,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Cache to prevent excessive requests
  _profileCache: new Map(),
  _profileCacheExpiry: new Map(),
  
  async getUserProfile(userId) {
    try {
      // Check cache first (5 minute expiry)
      const now = Date.now()
      const cached = this._profileCache.get(userId)
      const expiry = this._profileCacheExpiry.get(userId)
      
      if (cached && expiry && now < expiry) {
        return cached
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      // If any error, return cached result or null
      if (error) {
        console.debug('Profile not found, will use defaults')
        const result = cached || null
        // Cache null results for 1 minute to prevent repeated failed requests
        this._profileCache.set(userId, result)
        this._profileCacheExpiry.set(userId, now + 60000) // 1 minute
        return result
      }
      
      // Cache successful result for 5 minutes
      this._profileCache.set(userId, data)
      this._profileCacheExpiry.set(userId, now + 300000) // 5 minutes
      
      return data
    } catch (error) {
      // Return cached result if available, otherwise null
      const cached = this._profileCache.get(userId)
      return cached || null
    }
  },

  async updateUserProfile(userId, username) {
    try {
      // First try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()

      // If update failed because no row exists, insert new profile
      if (updateError || !updateData || updateData.length === 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            username: username.trim(),
            updated_at: new Date().toISOString()
          })
          .select()
        
        if (insertError) throw insertError
        
        // Invalidate cache for this user
        this._profileCache.delete(userId)
        this._profileCacheExpiry.delete(userId)
        
        return insertData?.[0]
      }
      
      if (updateError) throw updateError
      
      // Invalidate cache for this user
      this._profileCache.delete(userId)
      this._profileCacheExpiry.delete(userId)
      
      return updateData?.[0]
    } catch (error) {
      console.warn('updateUserProfile failed, user_profiles table may not exist:', error.message)
      // Return a mock profile object if table doesn't exist
      return {
        user_id: userId,
        username: username.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}