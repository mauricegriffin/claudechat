import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './features/auth/components/Login'
import Signup from './features/auth/components/Signup'
import Chat from './features/chat/components/Chat'
import UpdateNotification from './components/UpdateNotification'
import PerformanceDashboard from './components/PerformanceDashboard'
import { performanceMonitor } from './lib/performance'
// Import shadcn/ui components
import { Button } from './components/ui/button'

function App() {
  // User authentication state
  const [user, setUser] = useState(null)
  // Toggle between login and signup views
  const [authView, setAuthView] = useState('login')
  // Loading state while checking authentication
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    
    // Optimized session initialization with performance tracking
    const initializeAuth = async () => {
      try {
        performanceMonitor.trackAuthCall('getSession')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth session error:', error)
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    // Initialize auth state
    initializeAuth()

    // Subscribe to auth state changes with optimized handler and performance tracking
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
        // Skip tracking for initial session to avoid frequency warnings
        if (event !== 'INITIAL_SESSION') {
          performanceMonitor.trackAuthCall(`authStateChange:${event}`)
        }
        
        // Optimize auth state updates - only update if user actually changed
        const newUser = session?.user ?? null
        const currentUserId = user?.id
        const newUserId = newUser?.id
        
        if (currentUserId !== newUserId) {
          setUser(newUser)
        }
        setLoading(false)
        
        // Optimized logging (only in development)
        if (import.meta.env.DEV) {
          console.log('Auth state change:', event, user?.id)
          
          if (event === 'SIGNED_IN' && user) {
            console.log('User signed in:', user.email)
          } else if (event === 'SIGNED_OUT') {
            console.log('User signed out')
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('Token refreshed')
          }
        }
      }
    )

    // Cleanup function
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLogin = (user) => {
    setUser(user)
  }

  const handleSignup = (user) => {
    setUser(user)
  }

  const handleLogout = () => {
    setUser(null)
  }

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">
          Loading...
        </p>
      </div>
    )
  }

  // Authenticated view - show chat interface
  if (user) {
    return (
      <>
        <UpdateNotification />
        <Chat user={user} onLogout={handleLogout} />
        <PerformanceDashboard />
      </>
    )
  }

  // Authentication views - login or signup
  return (
    <div className="min-h-screen bg-background">
      {authView === 'login' ? (
        <div>
          <Login onLogin={handleLogin} />
          
          {/* Switch to signup link */}
          <div className="text-center mt-4 pb-8">
            <Button
              onClick={() => setAuthView('signup')}
              variant="ghost"
              className="text-primary"
            >
              Don't have an account? Sign up
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Signup onSignup={handleSignup} />
          
          {/* Switch to login link */}
          <div className="text-center mt-4 pb-8">
            <Button
              onClick={() => setAuthView('login')}
              variant="ghost"
              className="text-primary"
            >
              Already have an account? Sign in
            </Button>
          </div>
        </div>
      )}
      <PerformanceDashboard />
    </div>
  )
}

export default App