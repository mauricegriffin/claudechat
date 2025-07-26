import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './features/auth/components/Login'
import Signup from './features/auth/components/Signup'
import Chat from './features/chat/components/Chat'
import UpdateNotification from './components/UpdateNotification'
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
    // Check for existing session on mount
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Subscribe to auth state changes
    // This ensures the app updates when user logs in/out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Refresh session on token expiry to keep user logged in
        if (event === 'TOKEN_REFRESHED') {
          // Token refreshed successfully - no action needed
        }
      }
    )

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
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
    </div>
  )
}

export default App