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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      if (!data.user) {
        throw new Error('Login failed. Please check your credentials.')
      }
      
      return data
    }, 'Failed to sign in')
  },

  async signInWithGoogle() {
    // Determine the correct redirect URL based on environment
    const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1'
    
    // Use the current origin which should work for both dev and prod
    const redirectTo = `${window.location.origin}/`
    
    console.log('OAuth redirect URL:', redirectTo)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    if (error) throw error
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

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateUserProfile(userId, username) {
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
      return insertData?.[0]
    }
    
    if (updateError) throw updateError
    return updateData?.[0]
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}