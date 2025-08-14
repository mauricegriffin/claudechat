import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '../../auth/services/authService'
import { messageService } from '../services/messageServiceSimple'
import { typingService } from '../services/typingServiceFixed'
import { subscribeToPush, isPushSupported, getNotificationPermission } from '../../../services/pushService'
import { sendMessageNotification } from '../../../services/notificationService'
import ImageUpload from './ImageUpload'

// Material UI imports
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Paper,
  Container,
  TextField,
  Fab,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  CircularProgress,
  useTheme,
  alpha,
  Slide,
  Zoom,
} from '@mui/material'

import {
  ArrowBack as ArrowBackIcon,
  Menu as MenuIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'

export default function Chat({ user, conversation, conversationPartner, onBack, onLogout, isDarkMode, onThemeToggle }) {
  // Material UI theme
  const theme = useTheme()
  
  // State management for chat functionality
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Menu state for drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Push notification state
  const [_pushSupported, setPushSupported] = useState(false)
  const [_notificationPermission, setNotificationPermission] = useState('default')
  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState([])
  
  // Refs
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  
  // Handle drawer close on outside click
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }
  

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

  // Fetch messages for current conversation
  const fetchMessages = useCallback(async () => {
    if (!conversation?.id) return

    // Prevent multiple simultaneous fetches
    if (isFetchingMessages) {
      if (import.meta.env.DEV) {
        console.log('Skipping message fetch - already in progress')
      }
      return
    }

    setIsFetchingMessages(true)
    
    try {
      // Use conversation-specific message fetching
      const data = await messageService.fetchConversationMessages(conversation.id)
      
      if (import.meta.env.DEV) {
        console.log('Conversation messages fetched:', data?.length, 'messages for conversation:', conversation.id)
      }
      
      setMessages(data || [])
      
      // Mark conversation as read when messages are loaded
      await messageService.markConversationAsRead(conversation.id, user.id)
      
      return data
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      // Set empty array to prevent infinite loading states
      setMessages([])
      return []
    } finally {
      setIsFetchingMessages(false)
    }
  }, [conversation?.id, user.id, isFetchingMessages])

  // Optimized single message fetching
  const fetchNewMessage = useCallback(async (messageId) => {
    try {
      const data = await messageService.fetchNewMessage(messageId)
      
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

        // Subscribe to conversation-specific real-time messages
        messageChannel = messageService.subscribeToConversationMessages(
          conversation.id, 
          handleMessageUpdate
        )

        // Subscribe to conversation-specific typing indicators
        // Temporarily disabled due to missing table
        // typingChannel = typingService.subscribeToConversationTyping(
        //   conversation.id, 
        //   handleTypingUpdate
        // )

        // Get initial typing users
        // Temporarily disabled due to missing table
        // const typingData = await typingService.getTypingUsers()
        // if (mounted) {
        //   const otherTypingUsers = typingData.filter(u => u.user_id !== user.id)
        //   setTypingUsers(otherTypingUsers)
        // }
      } catch (error) {
        console.error('Error initializing chat:', error)
      }
    }

    initializeChat()

    // Cleanup function with proper channel management
    return () => {
      mounted = false
      
      // Unsubscribe from channels
      if (messageChannel) {
        messageChannel.unsubscribe()
      }
      if (typingChannel) {
        typingChannel.unsubscribe()
      }
      
      // Clean up typing status
      // typingService.cleanup(user.id)
    }
  }, [conversation?.id, user.id, handleMessageUpdate, handleTypingUpdate])

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
    if (!newMessage.trim() || !conversation?.id) return

    setLoading(true)
    
    try {
      console.log('Sending message:', newMessage.trim(), 'to conversation:', conversation.id)
      const sentMessage = await messageService.sendConversationMessage(
        conversation.id,
        newMessage.trim(), 
        user.id
      )
      console.log('Message sent successfully:', sentMessage)
      setNewMessage('')
      
      // Stop typing indicator when message is sent
      // typingService.stopTyping(user.id)
      
      // Send push notification to other users (don't wait for it)
      if (sentMessage?.id) {
        sendMessageNotification(sentMessage.id, user.id, conversation.id).catch(error => {
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
    setDrawerOpen(false)
    setShowSettings(true)
  }
  
  const handleLogoutClick = async () => {
    setDrawerOpen(false)
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

  // Get conversation display name
  const getConversationName = () => {
    if (conversation?.type === 'group') {
      return conversation.name || 'Group Chat'
    }
    if (conversationPartner) {
      return conversationPartner.username || conversationPartner.email?.split('@')[0] || 'Direct Message'
    }
    return 'Direct Message'
  }

  // Get conversation subtitle
  const getConversationSubtitle = () => {
    if (conversation?.type === 'group') {
      return `${conversation.participant_count || 0} members`
    }
    return 'Direct message'
  }

  // Settings page component
  if (showSettings) {
    return (
      <SettingsPage 
        user={user} 
        userProfile={userProfile}
        onBack={handleBackToChat}
        onProfileUpdate={fetchUserProfile}
        isDarkMode={isDarkMode}
        onThemeToggle={onThemeToggle}
      />
    )
  }

  // Drawer content
  const drawerContent = (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="titleMedium" sx={{ mb: 1 }}>
          Menu
        </Typography>
        <Typography variant="bodySmall" color="text.secondary">
          Navigation and account options
        </Typography>
      </Box>
      
      {/* User profile section */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {(userProfile?.username || user.email)[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="bodyLarge" sx={{ fontWeight: 500 }} noWrap>
              {userProfile?.username || user.email.split('@')[0]}
            </Typography>
            <Typography variant="bodySmall" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Menu items */}
      <List sx={{ flex: 1, pt: 1 }}>
        <ListItem 
          button 
          onClick={handleSettingsClick}
          sx={{ 
            borderRadius: 1,
            mx: 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
        
        <ListItem 
          button 
          onClick={handleLogoutClick}
          sx={{ 
            borderRadius: 1,
            mx: 1,
            color: 'error.main',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.1)
            }
          }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          {/* Back button */}
          <IconButton
            edge="start"
            onClick={onBack}
            sx={{ 
              mr: 1,
              color: 'inherit',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.contrastText, 0.1)
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          {/* Conversation avatar */}
          <Avatar 
            sx={{ 
              mr: 2, 
              width: 40, 
              height: 40,
              bgcolor: alpha(theme.palette.primary.contrastText, 0.2),
              color: 'primary.contrastText'
            }}
          >
            {conversation?.type === 'group' ? (
              <GroupsIcon />
            ) : (
              (conversationPartner?.username?.[0] || conversationPartner?.email?.[0] || '?').toUpperCase()
            )}
          </Avatar>
          
          {/* Conversation info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="titleMedium" 
              color="inherit" 
              noWrap
              sx={{ fontWeight: 500 }}
            >
              {getConversationName()}
            </Typography>
            <Typography 
              variant="bodySmall" 
              color="inherit" 
              noWrap
              sx={{ opacity: 0.7, lineHeight: 1.2 }}
            >
              {getConversationSubtitle()}
            </Typography>
          </Box>
          
          {/* Menu button */}
          <IconButton
            onClick={handleDrawerToggle}
            sx={{ 
              color: 'inherit',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.contrastText, 0.1)
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true, // Better performance on mobile
        }}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Messages Container */}
      <Box 
        ref={messagesContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          px: { xs: 1, sm: 2 },
          py: 2,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ '& > *': { mb: 1 } }}>
          {messages.map((message) => {
            const isOwnMessage = message.user_id === user.id
            return (
              <Slide
                key={message.id}
                direction="up"
                in={true}
                timeout={300}
                unmountOnExit
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 1
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      maxWidth: '75%',
                      p: 1.5,
                      bgcolor: isOwnMessage 
                        ? theme.custom?.chat?.outgoingContainer || 'primary.light'
                        : theme.custom?.chat?.incomingContainer || 'surface.container.main',
                      color: isOwnMessage 
                        ? '#FFFFFF'  // Always white text for outgoing messages
                        : theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary,
                      borderRadius: isOwnMessage 
                        ? '16px 16px 4px 16px' 
                        : '16px 16px 16px 4px',
                      backgroundImage: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start'
                    }}
                  >
                    {/* Username - only show for incoming messages */}
                    {!isOwnMessage && (
                      <Typography 
                        variant="labelSmall" 
                        sx={{ 
                          fontWeight: 600, 
                          mb: 0.5,
                          color: theme.palette.mode === 'dark' ? '#90CAF9' : 'primary.main',
                          opacity: 1
                        }}
                      >
                        {message.username || 'Unknown User'}
                      </Typography>
                    )}
                    
                    {/* Message content - text or image */}
                    {message.message_type === 'image' && message.image_url ? (
                      <Box>
                        <Box
                          component="img"
                          src={message.image_url}
                          alt="Shared image"
                          onClick={() => window.open(message.image_url, '_blank')}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            '&:hover': {
                              opacity: 0.9
                            }
                          }}
                        />
                        {message.content && message.content !== 'Image' && (
                          <Typography 
                            variant="bodyMedium" 
                            sx={{ 
                              mt: 1,
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {message.content}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography 
                        variant="bodyMedium" 
                        sx={{ 
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          mb: 0.5
                        }}
                      >
                        {message.content}
                      </Typography>
                    )}
                    
                    {/* Timestamp */}
                    <Typography 
                      variant="labelSmall" 
                      sx={{ 
                        mt: 0.5,
                        opacity: theme.palette.mode === 'dark' ? 0.5 : 0.4,
                        fontSize: '0.75rem',
                        textAlign: 'left'
                      }}
                    >
                      {formatTime(message.created_at)}
                    </Typography>
                  </Paper>
                </Box>
              </Slide>
            )
          })}
          <div ref={messagesEndRef} />
        </Box>
      </Box>

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <Zoom in={true}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 80,
              left: 16,
              right: 16,
              display: 'flex',
              justifyContent: 'flex-start',
              pointerEvents: 'none'
            }}
          >
            <Chip
              size="small"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="labelSmall">
                    {typingUsers.length === 1 
                      ? `${typingUsers[0].username || 'Someone'} is typing`
                      : typingUsers.length === 2
                      ? `${typingUsers[0].username || 'Someone'} and ${typingUsers[1].username || 'someone'} are typing`
                      : `${typingUsers[0].username || 'Someone'} and ${typingUsers.length - 1} others are typing`
                    }
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {[0, 1, 2].map((index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          bgcolor: 'text.secondary',
                          animation: 'bounce 1.4s infinite ease-in-out both',
                          animationDelay: `${index * 0.16}s`,
                          '@keyframes bounce': {
                            '0%, 80%, 100%': {
                              transform: 'scale(0)'
                            },
                            '40%': {
                              transform: 'scale(1)'
                            }
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              }
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(8px)',
                border: 1,
                borderColor: 'divider'
              }}
            />
          </Box>
        </Zoom>
      )}

      {/* Message Input Area */}
      <Paper 
        elevation={3}
        square
        sx={{ 
          borderTop: 1, 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          backgroundImage: 'none'
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box 
            component="form" 
            onSubmit={handleSendMessage}
            sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}
          >
            {/* Message input field */}
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                // Typing indicators disabled temporarily
                // Will re-enable after fixing database issues
              }}
              onBlur={() => {
                // Stop typing when user leaves input field
                // typingService.stopTyping(user.id)
              }}
              disabled={loading}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  '& fieldset': {
                    borderColor: alpha(theme.palette.text.primary, 0.23)
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(theme.palette.text.primary, 0.4)
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: 2
                  }
                }
              }}
              slotProps={{
                input: {
                  sx: { 
                    py: 1.5,
                    pr: 1
                  }
                }
              }}
            />
            
            {/* Image upload component */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <MaterialImageUpload 
                userId={user.id}
                conversationId={conversation?.id}
                onImageSent={() => {
                  setTimeout(scrollToBottom, 100)
                }}
                loading={loading}
              />
            </Box>
            
            {/* Send button */}
            <Fab
              size="small"
              color="primary"
              type="submit"
              disabled={loading || !newMessage.trim()}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </Fab>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

// Material UI version of ImageUpload component
function MaterialImageUpload({ userId, conversationId, onImageSent, loading: parentLoading }) {
  const [uploading, setUploading] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const theme = useTheme()
  
  // Enable after migration is complete
  const isEnabled = true
  
  // Check if device has camera capabilities
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setHasCamera(videoDevices.length > 0)
        } else {
          setHasCamera(/Mobi|Android/i.test(navigator.userAgent))
        }
      } catch (error) {
        console.log('Camera check failed, assuming camera available on mobile:', error)
        setHasCamera(/Mobi|Android/i.test(navigator.userAgent))
      }
    }
    
    checkCamera()
  }, [])
  
  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !conversationId) return
    
    setUploading(true)
    
    try {
      const { imageService } = await import('../services/imageService')
      const imageUrl = await imageService.uploadImage(file, userId)
      await imageService.sendImageMessageToConversation(imageUrl, userId, conversationId)
      
      onImageSent?.()
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      alert(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleCameraCapture = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !conversationId) return
    
    setUploading(true)
    
    try {
      const { imageService } = await import('../services/imageService')
      const imageUrl = await imageService.uploadImage(file, userId)
      await imageService.sendImageMessageToConversation(imageUrl, userId, conversationId)
      
      onImageSent?.()
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Camera capture failed:', error)
      alert(error.message || 'Failed to capture image')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
        disabled={uploading || parentLoading}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
        disabled={uploading || parentLoading}
      />
      
      {/* Gallery/file picker button */}
      <IconButton
        size="small"
        onClick={() => isEnabled && fileInputRef.current?.click()}
        disabled={uploading || !isEnabled || parentLoading}
        title={isEnabled ? "Choose image from gallery" : "Image upload disabled - run database migration first"}
        sx={{
          color: 'primary.main',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1)
          },
          '&.Mui-disabled': {
            color: 'action.disabled'
          }
        }}
      >
        {uploading ? (
          <CircularProgress size={20} />
        ) : (
          <Box component="span" sx={{ fontSize: 20 }}>📷</Box>
        )}
      </IconButton>
      
      {/* Camera capture button - only show if camera is available */}
      {hasCamera && (
        <IconButton
          size="small"
          onClick={() => isEnabled && cameraInputRef.current?.click()}
          disabled={uploading || !isEnabled || parentLoading}
          title={isEnabled ? "Take photo with camera" : "Camera disabled - run database migration first"}
          sx={{
            color: 'primary.main',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1)
            },
            '&.Mui-disabled': {
              color: 'action.disabled'
            }
          }}
        >
          {uploading ? (
            <CircularProgress size={20} />
          ) : (
            <Box component="span" sx={{ fontSize: 20 }}>🎥</Box>
          )}
        </IconButton>
      )}
    </>
  )
}

// Settings Component - allows users to update their profile and install app
function SettingsPage({ user, userProfile, onBack, onProfileUpdate, isDarkMode, onThemeToggle }) {
  const theme = useTheme()
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Settings Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={onBack}
            sx={{ 
              mr: 2,
              color: 'inherit',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.contrastText, 0.1)
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="titleLarge" sx={{ flex: 1, fontWeight: 500 }}>
            Settings
          </Typography>
          
          {/* Theme toggle in header */}
          <IconButton
            onClick={onThemeToggle}
            sx={{ 
              color: 'inherit',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.contrastText, 0.1)
              }
            }}
          >
            {isDarkMode ? '🌞' : '🌙'}
          </IconButton>
        </Toolbar>
      </AppBar>

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
                      bgcolor: alpha(theme.palette.error.main, 0.1), 
                      color: 'error.main', 
                      p: 2, 
                      border: 1,
                      borderColor: alpha(theme.palette.error.main, 0.3),
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
                      bgcolor: alpha('#4caf50', 0.1), 
                      color: '#2e7d32', 
                      p: 2, 
                      border: 1,
                      borderColor: alpha('#4caf50', 0.3),
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
              <Divider sx={{ my: 3 }} />

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
              <Divider sx={{ my: 3 }} />

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
              <Divider sx={{ my: 3 }} />

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