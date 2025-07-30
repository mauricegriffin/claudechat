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
    // Optimized storage with better performance
    storage: window.localStorage,
    // Automatic token refresh with optimized timing
    autoRefreshToken: true,
    // Session persistence optimized
    persistSession: true,
    // Detect auth changes in other tabs (necessary for multi-tab sync)
    detectSessionInUrl: true,
    // PKCE flow for security (default)
    flowType: 'pkce',
    // Disable debug in production, reduce in development
    debug: import.meta.env.DEV ? false : false,
    // Optimize token refresh timing (default 60s before expiry)
    refreshAheadDuration: 120
  },
  realtime: {
    // Optimize real-time performance
    params: {
      eventsPerSecond: 10
    }
  },
  // Add global performance options
  global: {
    headers: {
      'X-Client-Info': 'claudechat-web'
    }
  }
})

// Debug connection
console.log('Supabase client initialized with:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  environment: import.meta.env.VITE_ENVIRONMENT || 'unknown'
}) 