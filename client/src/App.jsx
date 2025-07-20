import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Signup from './components/Signup'
import Chat from './components/Chat'
// Import LiftKit components for layout and UI
// LiftKit provides a complete design system based on Material 3 and golden ratio
import Container from '@/components/container'
import Button from '@/components/button'
import Text from '@/components/text'
// Import LiftKit Theme components for color customization
import ThemeProvider from '@/components/theme'

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
  // LiftKit provides utility classes for common layout patterns
  if (loading) {
    return (
      <ThemeProvider>
        <div className="flex items-center justify-center min-h-screen bg-surface">
          {/* Text component with typography scale */}
          {/* color prop uses Material 3 color roles */}
          <Text fontClass="body" color="on-surface-variant">
            Loading...
          </Text>
        </div>
      </ThemeProvider>
    )
  }

  // Authenticated view - show chat interface
  if (user) {
    return (
      <ThemeProvider>
        <Chat user={user} onLogout={handleLogout} />
      </ThemeProvider>
    )
  }

  // Authentication views - login or signup
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface">
        {authView === 'login' ? (
          <div>
            {/* Login component already uses LiftKit */}
            <Login onLogin={handleLogin} />
            
            {/* Switch to signup link */}
            {/* LiftKit utility classes for spacing and alignment */}
            <div className="text-center mt-4 pb-8">
              {/* Button with text variant for link-like appearance */}
              {/* LiftKit buttons support three variants: fill, outline, text */}
              <Button
                onClick={() => setAuthView('signup')}
                variant="text"
                color="primary"
                label="Don't have an account? Sign up"
                // Text buttons often work well without explicit sizing
                size="md"
              />
            </div>
          </div>
        ) : (
          <div>
            {/* Signup component already uses LiftKit */}
            <Signup onSignup={handleSignup} />
            
            {/* Switch to login link */}
            <div className="text-center mt-4 pb-8">
              <Button
                onClick={() => setAuthView('login')}
                variant="text"
                color="primary"
                label="Already have an account? Sign in"
                size="md"
              />
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App