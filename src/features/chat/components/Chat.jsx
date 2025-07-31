import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '../../auth/services/authService'
import { messageService } from '../services/messageService'
import { typingService } from '../services/typingService'
import { imageService } from '../services/imageService'
import { subscribeToPush, isPushSupported, getNotificationPermission } from '../../../services/pushService'
import { sendMessageNotification } from '../../../services/notificationService'
import { performanceMonitor, measure } from '../../../lib/performance'
import ImageUpload from './ImageUpload'

// Import shadcn/ui components
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '../../../components/ui/sheet'
import { 
  Menu, 
  Search, 
  Settings, 
  LogOut, 
  MessageCircle, 
  Send, 
  User,
  Loader2
} from 'lucide-react'

export default function Chat({ user, onLogout }) {
  // State management for chat functionality
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Menu state for user dropdown
  const [showUserMenu, setShowUserMenu] = useState(false)
  // Push notification state
  const [_pushSupported, setPushSupported] = useState(false)
  const [_notificationPermission, setNotificationPermission] = useState('default')
  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState([])
  
  // Ref for scrolling to bottom of messages
  const messagesEndRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])
  

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async () => {
    try {
      const data = await authService.getUserProfile(user.id)
      if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [user.id])

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [user, fetchUserProfile])

  // Setup push notifications
  useEffect(() => {
    const setupPushNotifications = async () => {
      // Check if push notifications are supported
      const supported = isPushSupported()
      setPushSupported(supported)
      
      if (supported) {
        // Get current permission status
        const permission = getNotificationPermission()
        setNotificationPermission(permission)
        
        // Auto-subscribe if permission is already granted
        if (permission === 'granted') {
          try {
            await subscribeToPush(user.id)
            console.log('Successfully subscribed to push notifications')
          } catch (error) {
            if (error.message.includes('VAPID keys')) {
              console.log('Push notifications not configured yet (VAPID keys missing)')
            } else {
              console.error('Error auto-subscribing to push notifications:', error)
            }
          }
        }
      }
    }

    setupPushNotifications()
  }, [user.id])

  // State to prevent multiple simultaneous fetches
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)

  // Optimized message fetching with performance tracking (moved up to avoid hoisting issues)
  const fetchMessages = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingMessages) {
      if (import.meta.env.DEV) {
        console.log('Skipping message fetch - already in progress')
      }
      return
    }

    setIsFetchingMessages(true)
    
    try {
      return await measure.time('fetchMessages', async () => {
        // Try primary method first (with username)
        const data = await messageService.fetchMessagesWithUsername()
        
        performanceMonitor.trackMessageFetch('messagesWithUsername', data?.length || 0)
        
        if (import.meta.env.DEV) {
          console.log('Messages fetched:', data?.length, 'messages')
        }
        
        setMessages(data || [])
        return data
      })
    } catch (error) {
      console.error('Error fetching messages with username:', error)
      
      // Fallback to basic messages only if the primary method fails
      try {
        return await measure.time('fetchMessages-fallback', async () => {
          const fallbackData = await messageService.fetchMessages()
          
          performanceMonitor.trackMessageFetch('messages-fallback', fallbackData?.length || 0)
          
          if (import.meta.env.DEV) {
            console.log('Fallback messages fetched:', fallbackData?.length, 'messages')
          }
          
          setMessages(fallbackData || [])
          return fallbackData
        })
      } catch (fallbackError) {
        console.error('Both message fetching methods failed:', fallbackError)
        // Set empty array to prevent infinite loading states
        setMessages([])
        return []
      }
    } finally {
      setIsFetchingMessages(false)
    }
  }, [isFetchingMessages])

  // Optimized single message fetching with performance tracking
  const fetchNewMessage = useCallback(async (messageId) => {
    try {
      await measure.time('fetchNewMessage', async () => {
        const data = await messageService.fetchNewMessage(messageId)
        
        performanceMonitor.trackMessageFetch('newMessage', 1)
        
        if (data) {
          setMessages(prev => {
            // Update existing message or add new one
            const existingIndex = prev.findIndex(msg => msg.id === messageId)
            if (existingIndex >= 0) {
              // Update existing message with complete data
              const updated = [...prev]
              updated[existingIndex] = data
              return updated
            } else {
              // Add new message
              return [...prev, data]
            }
          })
        }
      })
    } catch (error) {
      console.error('Error fetching new message:', error)
    }
  }, [])

  // Memoized callback for real-time message updates
  const handleMessageUpdate = useCallback((payload) => {
    if (import.meta.env.DEV) {
      console.log('Real-time message payload:', payload)
    }
    
    if (payload.eventType === 'INSERT' || payload.type === 'INSERT') {
      // Optimize: Add message directly instead of re-fetching
      const newMessage = {
        ...payload.new,
        // Add basic username fallback (will be updated by full fetch if needed)
        username: payload.new.user_id === user.id ? (userProfile?.username || user.email) : 'Unknown User'
      }
      
      setMessages(prev => {
        // Prevent duplicates
        const exists = prev.some(msg => msg.id === newMessage.id)
        if (exists) return prev
        return [...prev, newMessage]
      })
      
      // Fetch complete message data in background for username accuracy
      fetchNewMessage(payload.new.id).catch(console.error)
    }
  }, [user.id, user.email, userProfile?.username, fetchNewMessage])

  // Memoized callback for typing indicator updates
  const handleTypingUpdate = useCallback(async (payload) => {
    if (import.meta.env.DEV) {
      console.log('🔔 Typing indicator payload received:', payload)
    }
    
    try {
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Optimize: Update typing users more efficiently
      const typingData = await typingService.getTypingUsers()
      const otherTypingUsers = typingData.filter(u => u.user_id !== user.id)
      
      console.log(`👥 Current user: ${user.id}`)
      console.log(`📝 All typing users:`, typingData)
      console.log(`🎯 Other typing users:`, otherTypingUsers)
      console.log(`📊 Typing users count: ${otherTypingUsers.length}`)
      
      setTypingUsers(otherTypingUsers)
    } catch (error) {
      console.error('❌ Error updating typing users:', error)
    }
  }, [user.id])

  // Optimized initialization and subscription management
  useEffect(() => {
    let mounted = true
    let messageChannel = null
    let typingChannel = null

    // Initialize data and subscriptions
    const initializeChat = async () => {
      try {
        // Fetch initial messages
        await fetchMessages()
        
        if (!mounted) return

        // Subscribe to real-time messages with optimized callback and performance tracking
        messageChannel = messageService.subscribeToMessages(handleMessageUpdate)
        performanceMonitor.trackSubscription('messages', 'create')

        // Subscribe to typing indicators with optimized callback and performance tracking
        typingChannel = typingService.subscribeToTypingIndicators(handleTypingUpdate)
        performanceMonitor.trackSubscription('typing_indicators', 'create')

        // Get initial typing users
        const typingData = await typingService.getTypingUsers()
        if (mounted) {
          const otherTypingUsers = typingData.filter(u => u.user_id !== user.id)
          setTypingUsers(otherTypingUsers)
        }
      } catch (error) {
        console.error('Error initializing chat:', error)
      }
    }

    initializeChat()

    // Cleanup function with proper channel management and performance tracking
    return () => {
      mounted = false
      
      // Unsubscribe from channels with performance tracking
      if (messageChannel) {
        messageChannel.unsubscribe()
        performanceMonitor.trackSubscription('messages', 'destroy')
      }
      if (typingChannel) {
        typingChannel.unsubscribe()
        performanceMonitor.trackSubscription('typing_indicators', 'destroy')
      }
      
      // Clean up typing status
      typingService.cleanup(user.id)
      
      // Log performance summary when chat component unmounts
      if (import.meta.env.DEV) {
        setTimeout(() => performanceMonitor.logSummary(), 1000)
      }
    }
  }, [user.id, handleMessageUpdate, handleTypingUpdate, fetchMessages])

  // Memoized scroll function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])


  // Scroll to bottom when new messages arrive (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timeoutId)
  }, [messages, scrollToBottom])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    
    try {
      console.log('Sending message:', newMessage.trim(), 'for user:', user.id)
      const sentMessage = await messageService.sendMessage(newMessage.trim(), user.id)
      console.log('Message sent successfully:', sentMessage)
      setNewMessage('')
      
      // Stop typing indicator when message is sent
      typingService.stopTyping(user.id)
      
      // Send push notification to other users (don't wait for it)
      if (sentMessage?.id) {
        sendMessageNotification(sentMessage.id, user.id).catch(error => {
          console.warn('Push notification failed:', error)
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handlers moved to inline usage to avoid unused variable errors

  const handleBackToChat = () => {
    setShowSettings(false)
  }
  
  // Navigation handlers
  const handleSettingsClick = () => {
    setShowUserMenu(false)
    setShowSettings(true)
  }
  
  const handleLogoutClick = async () => {
    setShowUserMenu(false)
    try {
      await authService.signOut()
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Format message timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Settings page component
  if (showSettings) {
    return (
      <SettingsPage 
        user={user} 
        userProfile={userProfile}
        onBack={handleBackToChat}
        onProfileUpdate={fetchUserProfile}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Navigation Bar */}
      <Card className="rounded-none border-b bg-red-900 text-white fixed top-0 left-0 right-0 z-50 p-1">
        <CardContent className="flex items-center justify-between px-4 py-0">
          {/* Hamburger menu button */}
          <Sheet open={showUserMenu} onOpenChange={setShowUserMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-white dark:bg-gray-900">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Navigation and account options
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* User info */}
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(userProfile?.username || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userProfile?.username || user.email.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                {/* Menu items */}
                <div className="space-y-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full flex items-center justify-start p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleSettingsClick();
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full flex items-center justify-start p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md transition-colors cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleLogoutClick();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Username display */}
          <span className="text-sm font-medium">
            {userProfile?.username || user.email.split('@')[0]}
          </span>
        </CardContent>
      </Card>

      {/* Main Chat Content - with top padding to account for fixed header */}
      <div className="flex flex-col h-full pt-16">
        {/* Chat Messages Area - with padding for fixed header and input */}
        <ScrollArea className="flex-1 px-4 py-10 pb-28">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.user_id === user.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    <Card className={`p-3 border-none ${isOwnMessage ? 'bg-message-outgoing text-message-outgoing-foreground' : 'bg-gray-900 text-white'}`}>
                      {/* Username for other users */}
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1 text-primary">
                          {message.username || 'Unknown User'}
                        </p>
                      )}
                      
                      {/* Message content - text or image */}
                      {message.message_type === 'image' && message.image_url ? (
                        <div className="space-y-2">
                          <img 
                            src={message.image_url} 
                            alt="Shared image"
                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '300px' }}
                            onClick={() => window.open(message.image_url, '_blank')}
                          />
                          {message.content && (
                            <p className="text-sm break-words">
                              {message.content}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm break-words">
                          {message.content}
                        </p>
                      )}
                      
                      {/* Timestamp */}
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                      </p>
                    </Card>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicators - Subtle dots animation */}
        {(typingUsers.length > 0 || import.meta.env.DEV) && (
          <div className="fixed bottom-20 left-4 right-4 z-50 pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700 w-fit">
              <div className="flex items-center space-x-2">
                {typingUsers.length > 0 ? (
                  <>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {typingUsers.length === 1 
                        ? typingUsers[0].username || 'Someone'
                        : typingUsers.length === 2
                        ? `${typingUsers[0].username || 'Someone'} and ${typingUsers[1].username || 'someone'}`
                        : `${typingUsers[0].username || 'Someone'} and ${typingUsers.length - 1} others`
                      }
                    </span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </>
                ) : import.meta.env.DEV ? (
                  <>
                    <span className="text-xs text-gray-500">DEV: Typing test</span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Message Input Area - Fixed to bottom */}
        <Card className="rounded-none border-t bg-red-900 text-white fixed bottom-0 left-0 right-0 z-40">
          <CardContent className="p-4 py-1">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              {/* Message input field */}
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    // Trigger typing indicator
                    if (e.target.value.trim()) {
                      typingService.startTyping(user.id)
                      if (import.meta.env.DEV) {
                        console.log('Started typing for user:', user.id)
                      }
                    } else {
                      // Stop typing when input is empty
                      typingService.stopTyping(user.id)
                      if (import.meta.env.DEV) {
                        console.log('Stopped typing for user:', user.id)
                      }
                    }
                  }}
                  onBlur={() => {
                    // Stop typing when user leaves input field
                    typingService.stopTyping(user.id)
                  }}
                  disabled={loading}
                  className="pr-10 bg-black text-white placeholder:text-gray-400"
                />
                {/* <MessageCircle className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /> */}
              </div>
              
              {/* Image upload button */}
              <ImageUpload 
                userId={user.id} 
                onImageSent={() => {
                  // Scroll to bottom after image sent
                  setTimeout(scrollToBottom, 100)
                }} 
              />
              
              {/* Send button */}
              <Button
                type="submit"
                size="icon"
                disabled={loading || !newMessage.trim()}
                className="rounded-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Settings Component - allows users to update their profile and install app
// Uses a mix of Material UI and LiftKit components
function SettingsPage({ user, userProfile, onBack, onProfileUpdate }) {
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
    
    // Debug info
    
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
        const { unsubscribeFromPush } = await import('../../../services/pushService')
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
    <div className="flex flex-col h-screen">
      {/* Settings Header */}
      <Card className="rounded-none border-b bg-primary text-primary-foreground">
        <CardContent className="flex items-center p-4">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-primary-foreground hover:bg-primary-foreground/20 mr-4"
          >
            ← Back to Chat
          </Button>
          <h1 className="text-xl font-semibold flex-1">
            Settings
          </h1>
        </CardContent>
      </Card>

      {/* Settings Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              {/* Title */}
              <h2 className="text-2xl font-semibold mb-6">
                Account Settings
              </h2>
          
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-center">
                    <span className="mr-2">❌</span>
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-500/15 text-green-700 text-sm p-3 rounded-md border border-green-500/20 flex items-center">
                    <span className="mr-2">✅</span>
                    {success}
                  </div>
                )}

                {/* Username Input */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Choose a unique username for your profile</p>
                </div>

                {/* Update Button */}
                <Button
                  type="submit"
                  disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
                  className="w-full"
                >
                  {loading ? 'Updating...' : success ? '✅ Updated!' : 'Update Username'}
                </Button>
              </form>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Push Notifications Section */}
              <h3 className="text-lg font-semibold mb-4">
                Push Notifications
              </h3>
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      New Message Notifications
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {!pushSupported 
                        ? "Push notifications are not supported on this device"
                        : notificationPermission === 'granted'
                          ? "You'll receive notifications for new messages"
                          : notificationPermission === 'denied'
                            ? "Notifications are blocked. Enable them in your browser settings"
                            : "Enable notifications to get alerts for new messages"
                      }
                    </p>
                  </div>
                  {pushSupported && notificationPermission !== 'denied' && (
                    <Button
                      onClick={handleToggleNotifications}
                      disabled={notificationLoading}
                      variant={notificationPermission === 'granted' ? 'destructive' : 'default'}
                      className="ml-4"
                    >
                      {notificationLoading 
                        ? 'Loading...' 
                        : notificationPermission === 'granted' 
                          ? 'Disable' 
                          : 'Enable'
                      }
                    </Button>
                  )}
                </div>
              </Card>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Install App Section */}
              <h3 className="text-lg font-semibold mb-4">
                Progressive Web App
              </h3>
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      Install as App
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {isInstallable 
                        ? /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
                          ? "Install ClaudeChat as an app on your iOS device using Safari's Share menu"
                          : "Install ClaudeChat on your device for a native app experience"
                        : (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true
                          ? "App is already installed"
                          : "Install option will appear when available."
                      }
                    </p>
                  </div>
                  {isInstallable && (
                    <Button
                      onClick={handleInstallApp}
                      className="ml-4"
                    >
                      Install App
                    </Button>
                  )}
                </div>
              </Card>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Account Information */}
              <h3 className="text-lg font-semibold mb-4">
                Account Information
              </h3>
              <div className="space-y-4">
                <Card className="p-4">
                  <p className="font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </Card>
                <Card className="p-4">
                  <p className="font-medium mb-1">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </Card>
                {userProfile && (
                  <Card className="p-4">
                    <p className="font-medium mb-1">Current Username</p>
                    <p className="text-sm text-muted-foreground">{userProfile.username}</p>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}