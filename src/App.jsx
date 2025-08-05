import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './features/auth/components/Login'
import Signup from './features/auth/components/Signup'
import Chat from './features/chat/components/Chat'
import UserList from './components/UserList'
import UpdateNotification from './components/UpdateNotification'
import { ConnectionProvider } from './providers/ConnectionProvider'
// Import shadcn/ui components
import { Button } from './components/ui/button'

function App() {
  // User authentication state
  const [user, setUser] = useState(null)
  // Toggle between login and signup views
  const [authView, setAuthView] = useState('login')
  // Loading state while checking authentication
  const [loading, setLoading] = useState(true)
  // New navigation state
  const [currentView, setCurrentView] = useState('userList') // 'userList' | 'chat'
  const [currentConversation, setCurrentConversation] = useState(null)
  const [conversationPartner, setConversationPartner] = useState(null)

  useEffect(() => {
    let mounted = true
    
    // Optimized session initialization
    const initializeAuth = async () => {
      try {
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

    // Subscribe to auth state changes with optimized handler
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        
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
  }, [user])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // If we're in chat view and user hits back, go to user list
      if (currentView === 'chat') {
        setCurrentView('userList')
        setCurrentConversation(null)
        setConversationPartner(null)
      }
    }

    window.addEventListener('popstate', handlePopState)

    // Set initial state
    if (currentView === 'userList') {
      window.history.replaceState({ view: 'userList' }, '', '#')
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [currentView])

  const handleLogin = (user) => {
    setUser(user)
  }

  const handleSignup = (user) => {
    setUser(user)
  }

  const handleLogout = () => {
    setUser(null)
    // Reset navigation state on logout
    setCurrentView('userList')
    setCurrentConversation(null)
    setConversationPartner(null)
  }

  // New navigation handlers
  const handleConversationSelect = (conversation, partner) => {
    setCurrentConversation(conversation)
    setConversationPartner(partner)
    setCurrentView('chat')
    // Push state to browser history
    window.history.pushState({ view: 'chat' }, '', '#chat')
  }

  const handleBackToUserList = () => {
    // Use browser back if we have history
    if (window.history.length > 1 && currentView === 'chat') {
      window.history.back()
    } else {
      // Fallback to direct navigation
      setCurrentView('userList')
      setCurrentConversation(null)
      setConversationPartner(null)
    }
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

  // Authenticated view - show appropriate interface based on current view
  if (user) {
    if (currentView === 'chat' && currentConversation) {
      return (
        <ConnectionProvider>
          <UpdateNotification />
          <Chat 
            user={user} 
            conversation={currentConversation}
            conversationPartner={conversationPartner}
            onBack={handleBackToUserList}
            onLogout={handleLogout} 
          />
        </ConnectionProvider>
      )
    }
    
    // Default view is UserList
    return (
      <ConnectionProvider>
        <UpdateNotification />
        <UserList 
          user={user}
          onConversationSelect={handleConversationSelect}
          onLogout={handleLogout}
          onSettings={() => {/* TODO: Implement settings */}}
        />
      </ConnectionProvider>
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