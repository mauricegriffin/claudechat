import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Debug environment variables
console.log('Environment check:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  DEV: import.meta.env.DEV,
  supabaseUrl: supabaseUrl,
  supabaseUrlLength: supabaseUrl?.length,
  supabaseUrlValid: supabaseUrl ? /^https?:\/\/.+/.test(supabaseUrl) : false,
  supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
})

// Test URL construction directly
try {
  if (supabaseUrl) {
    new URL(supabaseUrl)
    console.log('✅ URL construction test passed')
  }
} catch (error) {
  console.error('❌ URL construction test failed:', error.message)
  console.log('Raw URL chars:', Array.from(supabaseUrl || '').map((char, i) => `${i}: "${char}" (${char.charCodeAt(0)})`))
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