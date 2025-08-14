import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './features/auth/components/Login'
import Signup from './features/auth/components/Signup'
import Chat from './features/chat/components/Chat'
import UserList from './components/UserList'
import UpdateNotification from './components/UpdateNotification'
import { ConnectionProvider } from './providers/ConnectionProvider'
import { authService } from './features/auth/services/authService'
import { subscribeToPush, isPushSupported, getNotificationPermission } from './services/pushService'

// Material UI imports
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Paper,
  Box,
  Button,
  Typography,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Fab,
  useMediaQuery,
} from '@mui/material'
import {
  Person as PersonIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material'

// Custom Material Design 3 theme
import { lightTheme, darkTheme } from './theme/materialTheme'

function App() {
  // User authentication state
  const [user, setUser] = useState(null)
  // Toggle between login and signup views
  const [authView, setAuthView] = useState('login')
  // Loading state while checking authentication
  const [loading, setLoading] = useState(true)
  // New navigation state
  const [currentView, setCurrentView] = useState('userList') // 'userList' | 'chat' | 'settings'
  const [currentConversation, setCurrentConversation] = useState(null)
  const [conversationPartner, setConversationPartner] = useState(null)
  // User profile state for settings
  const [userProfile, setUserProfile] = useState(null)
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check system preference first
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  
  // Detect system theme preference changes
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  
  useEffect(() => {
    // Save theme preference to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])
  
  // Theme toggle handler
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

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

  // Settings navigation handlers
  const handleSettingsOpen = () => {
    setCurrentView('settings')
  }

  const handleSettingsBack = () => {
    setCurrentView('userList')
  }

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await authService.getUserProfile(user.id)
      if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [user?.id])

  // Fetch user profile when user changes
  useEffect(() => {
    if (user) {
      // Ensure user profile exists with email
      authService.ensureUserProfileWithEmail(user.id).then(() => {
        fetchUserProfile()
      })
    }
  }, [user, fetchUserProfile])

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
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="bodyMedium" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    )
  }

  // Authenticated view - show appropriate interface based on current view
  if (user) {
    if (currentView === 'chat' && currentConversation) {
      return (
        <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
          <CssBaseline />
          <ConnectionProvider>
            <UpdateNotification />
            <Chat 
              user={user} 
              conversation={currentConversation}
              conversationPartner={conversationPartner}
              onBack={handleBackToUserList}
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
              onThemeToggle={toggleTheme}
            />
          </ConnectionProvider>
        </ThemeProvider>
      )
    }
    
    if (currentView === 'settings') {
      return (
        <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
          <CssBaseline />
          <ConnectionProvider>
            <UpdateNotification />
            <SettingsPage 
              user={user} 
              userProfile={userProfile}
              onBack={handleSettingsBack}
              onProfileUpdate={fetchUserProfile}
              isDarkMode={isDarkMode}
              onThemeToggle={toggleTheme}
            />
          </ConnectionProvider>
        </ThemeProvider>
      )
    }
    
    // Default view is UserList
    return (
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <CssBaseline />
        <ConnectionProvider>
          <UpdateNotification />
          <UserList 
            user={user}
            onConversationSelect={handleConversationSelect}
            onLogout={handleLogout}
            onSettings={handleSettingsOpen}
            isDarkMode={isDarkMode}
            onThemeToggle={toggleTheme}
          />
        </ConnectionProvider>
      </ThemeProvider>
    )
  }

  // Authentication views - login or signup
  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
        {/* Theme toggle FAB for auth screens */}
        <Fab
          size="small"
          onClick={toggleTheme}
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </Fab>

        <Container maxWidth="sm" sx={{ pt: 4, pb: 4 }}>
          {authView === 'login' ? (
            <Box>
              <Login onLogin={handleLogin} isDarkMode={isDarkMode} />
              
              {/* Switch to signup link */}
              <Box sx={{ textAlign: 'center', mt: 2, pb: 4 }}>
                <Button
                  onClick={() => setAuthView('signup')}
                  variant="text"
                  color="primary"
                  sx={{ textTransform: 'none' }}
                >
                  Don't have an account? Sign up
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Signup onSignup={handleSignup} isDarkMode={isDarkMode} />
              
              {/* Switch to login link */}
              <Box sx={{ textAlign: 'center', mt: 2, pb: 4 }}>
                <Button
                  onClick={() => setAuthView('login')}
                  variant="text"
                  color="primary"
                  sx={{ textTransform: 'none' }}
                >
                  Already have an account? Sign in
                </Button>
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App

// Settings Component - allows users to update their profile and install app
function SettingsPage({ user, userProfile, onBack, onProfileUpdate, isDarkMode, onThemeToggle }) {
  // Local state for settings form
  const [newUsername, setNewUsername] = useState(userProfile?.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  
  // Push notification settings
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission())
  const [pushSupported] = useState(isPushSupported())
  const [notificationLoading, setNotificationLoading] = useState(false)
  
  // Check if app is installable
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Check if app is already installed
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = window.navigator.standalone === true
    
    if (isStandalone || isIOSStandalone) {
      setIsInstallable(false)
    }
    
    // Check for iOS Safari (can show manual install instructions)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
    
    // Show install option for iOS Safari even without beforeinstallprompt
    if (isIOSSafari && !isIOSStandalone) {
      setIsInstallable(true)
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])
  
  const handleInstallApp = async () => {
    // Check if this is iOS Safari (no beforeinstallprompt available)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
    
    if (isIOSSafari && !deferredPrompt) {
      // Show iOS install instructions
      alert('To install ClaudeChat on iOS:\n\n1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to install the app')
      return
    }
    
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstallable(false)
      setSuccess('App installed successfully!')
    }
    
    setDeferredPrompt(null)
  }
  
  // Handle push notification enable/disable
  const handleToggleNotifications = async () => {
    // Check if iOS and not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isStandalone = window.navigator.standalone === true
    
    if (isIOS && !isStandalone) {
      setError('On iOS, install the app first: tap Share → Add to Home Screen')
      return
    }
    
    if (!pushSupported) {
      setError('Push notifications are not supported on this device')
      return
    }

    setNotificationLoading(true)
    setError('')
    setSuccess('')

    try {
      if (notificationPermission === 'granted') {
        // User wants to disable notifications
        const { unsubscribeFromPush } = await import('./services/pushService')
        await unsubscribeFromPush(user.id)
        setNotificationPermission('default')
        setSuccess('Push notifications disabled')
      } else {
        // User wants to enable notifications
        await subscribeToPush(user.id)
        setNotificationPermission('granted')
        setSuccess('Push notifications enabled successfully!')
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      console.error('Error toggling notifications:', error)
      setError(error.message || 'Failed to update notification settings')
    } finally {
      setNotificationLoading(false)
    }
  }

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    
    if (!newUsername.trim() || newUsername === userProfile?.username) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await authService.updateUserProfile(user.id, newUsername)
      setSuccess('Username updated successfully!')
      onProfileUpdate() // Refresh profile data
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      console.error('Error updating username:', error)
      setError(error.message || 'Failed to update username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Settings Header */}
      <Paper 
        elevation={0} 
        square 
        sx={{ 
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
          {/* Back button */}
          <Button
            variant="text"
            onClick={onBack}
            sx={{ 
              color: 'primary.contrastText', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              mr: 2,
              textTransform: 'none'
            }}
          >
            ← Back to Chats
          </Button>
          
          {/* Theme toggle */}
          <IconButton
            onClick={onThemeToggle}
            sx={{ 
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              mr: 2
            }}
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          
          <Typography variant="titleLarge" sx={{ flex: 1 }}>
            Settings
          </Typography>
        </Box>
      </Paper>

      {/* Settings Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="md" sx={{ py: 3 }}>
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              {/* Title */}
              <Typography variant="headlineSmall" sx={{ mb: 3 }}>
                Account Settings
              </Typography>
          
              <Box component="form" onSubmit={handleUpdateUsername} sx={{ '& > *': { mb: 2 } }}>
                {/* Error/Success Messages */}
                {error && (
                  <Paper 
                    elevation={0}
                    sx={{ 
                      bgcolor: 'error.light', 
                      color: 'error.contrastText', 
                      p: 2, 
                      border: 1,
                      borderColor: 'error.main',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="bodySmall" sx={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 8 }}>❌</span>
                      {error}
                    </Typography>
                  </Paper>
                )}
                
                {success && (
                  <Paper 
                    elevation={0}
                    sx={{ 
                      bgcolor: '#e8f5e8', 
                      color: '#2e7d32', 
                      p: 2, 
                      border: 1,
                      borderColor: '#4caf50',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="bodySmall" sx={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: 8 }}>✅</span>
                      {success}
                    </Typography>
                  </Paper>
                )}

                {/* Username Input */}
                <Box>
                  <Typography variant="labelLarge" component="label" htmlFor="username" sx={{ mb: 1, display: 'block' }}>
                    Username
                  </Typography>
                  <TextField
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={loading}
                    fullWidth
                    variant="outlined"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        ),
                      },
                    }}
                  />
                  <Typography variant="bodySmall" color="text.secondary" sx={{ mt: 0.5 }}>
                    Choose a unique username for your profile
                  </Typography>
                </Box>

                {/* Update Button */}
                <Button
                  type="submit"
                  disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Updating...' : success ? '✅ Updated!' : 'Update Username'}
                </Button>
              </Box>

              {/* Divider */}
              <Box sx={{ height: 1, bgcolor: 'divider', my: 3 }} />

              {/* Push Notifications Section */}
              <Typography variant="titleMedium" sx={{ mb: 2 }}>
                Push Notifications
              </Typography>
              <Card sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>
                      New Message Notifications
                    </Typography>
                    <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1 }}>
                      {!pushSupported 
                        ? "Push notifications are not supported on this device"
                        : notificationPermission === 'granted'
                          ? "You'll receive notifications for new messages"
                          : notificationPermission === 'denied'
                            ? "Notifications are blocked. Enable them in your browser settings"
                            : "Enable notifications to get alerts for new messages"
                      }
                    </Typography>
                  </Box>
                  {pushSupported && notificationPermission !== 'denied' && (
                    <Button
                      onClick={handleToggleNotifications}
                      disabled={notificationLoading}
                      variant={notificationPermission === 'granted' ? 'outlined' : 'contained'}
                      color={notificationPermission === 'granted' ? 'error' : 'primary'}
                      sx={{ ml: 2 }}
                    >
                      {notificationLoading 
                        ? 'Loading...' 
                        : notificationPermission === 'granted' 
                          ? 'Disable' 
                          : 'Enable'
                      }
                    </Button>
                  )}
                </Box>
              </Card>

              {/* Divider */}
              <Box sx={{ height: 1, bgcolor: 'divider', my: 3 }} />

              {/* Install App Section */}
              <Typography variant="titleMedium" sx={{ mb: 2 }}>
                Progressive Web App
              </Typography>
              <Card sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>
                      Install as App
                    </Typography>
                    <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1 }}>
                      {isInstallable 
                        ? /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
                          ? "Install ClaudeChat as an app on your iOS device using Safari's Share menu"
                          : "Install ClaudeChat on your device for a native app experience"
                        : (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true
                          ? "App is already installed"
                          : "Install option will appear when available."
                      }
                    </Typography>
                  </Box>
                  {isInstallable && (
                    <Button
                      onClick={handleInstallApp}
                      variant="contained"
                      sx={{ ml: 2 }}
                    >
                      Install App
                    </Button>
                  )}
                </Box>
              </Card>

              {/* Divider */}
              <Box sx={{ height: 1, bgcolor: 'divider', my: 3 }} />

              {/* Account Information */}
              <Typography variant="titleMedium" sx={{ mb: 2 }}>
                Account Information
              </Typography>
              <Box sx={{ '& > *': { mb: 2 } }}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>Email</Typography>
                  <Typography variant="bodyMedium" color="text.secondary">{user.email}</Typography>
                </Card>
                <Card sx={{ p: 2 }}>
                  <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>User ID</Typography>
                  <Typography variant="bodyMedium" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{user.id}</Typography>
                </Card>
                {userProfile && (
                  <Card sx={{ p: 2 }}>
                    <Typography variant="bodyLarge" sx={{ fontWeight: 500, mb: 0.5 }}>Current Username</Typography>
                    <Typography variant="bodyMedium" color="text.secondary">{userProfile.username}</Typography>
                  </Card>
                )}
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </Box>
  )
}