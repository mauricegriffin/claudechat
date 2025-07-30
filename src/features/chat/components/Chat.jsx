import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '../../auth/services/authService'
import { messageService } from '../services/messageService'
import { typingService } from '../services/typingService'
import { subscribeToPush, isPushSupported, getNotificationPermission } from '../../../services/pushService'
import { sendMessageNotification } from '../../../services/notificationService'

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
  const [pushSupported, setPushSupported] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')
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

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
    
    // Subscribe to real-time messages
    const messageChannel = messageService.subscribeToMessages((payload) => {
      console.log('Real-time payload received:', payload)
      if (payload.type === 'INSERT' || payload.eventType === 'INSERT') {
        // Fetch the new message with username
        console.log('Fetching new message:', payload.new.id)
        fetchNewMessage(payload.new.id)
      }
    })

    // Subscribe to typing indicators
    const typingChannel = typingService.subscribeToTypingIndicators(async (payload) => {
      console.log('Typing indicator payload:', payload)
      // Refresh typing users list
      const typingData = await typingService.getTypingUsers()
      // Filter out current user from typing list
      const otherTypingUsers = typingData.filter(u => u.user_id !== user.id)
      setTypingUsers(otherTypingUsers)
    })

    // Get initial typing users
    typingService.getTypingUsers().then(data => {
      const otherTypingUsers = data.filter(u => u.user_id !== user.id)
      setTypingUsers(otherTypingUsers)
    })

    return () => {
      messageChannel.unsubscribe()
      typingChannel.unsubscribe()
      // Clean up typing status when component unmounts
      typingService.cleanup(user.id)
    }
  }, [user.id])

  // Fetch a single new message with username
  const fetchNewMessage = async (messageId) => {
    try {
      const data = await messageService.fetchNewMessage(messageId)
      if (data) {
        setMessages(prev => [...prev, data])
      }
    } catch (error) {
      console.error('Error fetching new message:', error)
    }
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages...')
      const data = await messageService.fetchMessagesWithUsername()
      console.log('Messages fetched:', data)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Try fallback to basic messages table if view fails
      try {
        console.log('Trying fallback to basic messages...')
        const fallbackData = await messageService.fetchMessages()
        console.log('Fallback messages:', fallbackData)
        setMessages(fallbackData)
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
      }
    }
  }

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
                      
                      {/* Message content */}
                      <p className="text-sm break-words">
                        {message.content}
                      </p>
                      
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

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-30">
            <Card className="bg-gray-100 dark:bg-gray-800 border-none shadow-sm p-2">
              <p className="text-xs text-muted-foreground italic">
                {typingUsers.length === 1 
                  ? `${typingUsers[0].username || 'Someone'} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].username || 'Someone'} and ${typingUsers[1].username || 'someone'} are typing...`
                  : `${typingUsers[0].username || 'Someone'} and ${typingUsers.length - 1} others are typing...`
                }
              </p>
            </Card>
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