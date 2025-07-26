import { createClient } from '@supabase/supabase-js'

// Fix for masked environment variables in Netlify
const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Check if values are masked (asterisks) and use fallback
const supabaseUrl = (rawUrl && !rawUrl.includes('*')) ? rawUrl : 'https://ecjwszfrantxpvuzfvwl.supabase.co'
const supabaseAnonKey = (rawKey && !rawKey.includes('*')) ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjandzemZyYW50eHB2dXpmdndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTkwNzAsImV4cCI6MjA2ODQ3NTA3MH0.lHcBb_UjUwQKpWxXgkHAN0g5_l0uDUNKmVvxxrrxQf8'

// Debug info (can be removed once everything is working)
if (rawUrl?.includes('*') || !rawUrl) {
  console.log('🔧 Using fallback Supabase credentials due to masked environment variables')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
  })
  throw new Error(`Missing Supabase environment variables. URL: ${supabaseUrl ? 'SET' : 'MISSING'}, Key: ${supabaseAnonKey ? 'SET' : 'MISSING'}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for persistent sessions across browser sessions
    storage: window.localStorage,
    // Automatically refresh tokens before expiry
    autoRefreshToken: true,
    // Keep sessions active and detect changes
    persistSession: true,
    // Detect auth changes in other tabs/windows
    detectSessionInUrl: true,
    // Set longer session timeout (24 hours)
    flowType: 'pkce'
  }
}) 