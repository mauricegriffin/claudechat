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
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      // If table doesn't exist or no record found, return null
      if (error && (error.code === 'PGRST116' || error.code === '42P01')) {
        return null
      }
      
      if (error) throw error
      return data
    } catch (error) {
      console.warn('getUserProfile failed, user_profiles table may not exist:', error.message)
      return null
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
        return insertData?.[0]
      }
      
      if (updateError) throw updateError
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