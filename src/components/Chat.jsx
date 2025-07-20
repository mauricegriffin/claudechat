import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// Import LiftKit components where available
// LiftKit provides Material 3 design components with golden ratio proportions
import Container from '@/components/container'
import Card from '@/components/card'
import Button from '@/components/button'
import IconButton from '@/components/icon-button'
import TextInput from '@/components/text-input'
import Text from '@/components/text'
import Row from '@/components/row'

// Using LiftKit components exclusively for consistent design system

export default function Chat({ user, onLogout }) {
  // State management for chat functionality
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Menu state for user dropdown - simplified for LiftKit
  const [showUserMenu, setShowUserMenu] = useState(false)
  
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
      } else if (data) {
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

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
    
    // Subscribe to real-time messages using Supabase channels
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Fetch the new message with username
          fetchNewMessage(payload.new.id)
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:',
      status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch a single new message with username
  const fetchNewMessage = async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('messages_with_username')
        .select('*')
        .eq('id', messageId)
        .single()

      if (!error && data) {
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
      const { data, error } = await supabase
        .from('messages_with_username')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          user_id: user.id
        })

      if (error) throw error
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handlers moved to inline usage to avoid unused variable errors

  const handleBackToChat = () => {
    setShowSettings(false)
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
    // Main chat container with full viewport height
    <div className="chat-container">
      {/* Navigation Bar using LiftKit */}
      <Card 
        material="glass"
        materialProps={{
          thickness: "normal",
          tint: "primary",
          tintOpacity: 0.8,
          light: true
        }}
      >
        <Row padding="sm" alignItems="center" justifyContent="space-between">
          {/* Hamburger menu button */}
          <IconButton
            icon="menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            variant="text"
            size="md"
            aria-label="Open navigation menu"
            className="hamburger-menu-button"
            style={{
              color: 'white',
              backgroundColor: 'transparent',
              border: 'none'
            }}
          />
          
          {/* Username display */}
          <Text fontClass="caption" color="on-primary">
            {userProfile?.username || user.email.split('@')[0]}
          </Text>
        </Row>
      </Card>

      {/* Overlay */}
      {showUserMenu && (
        <div className="sidebar-overlay" onClick={() => setShowUserMenu(false)} />
      )}
      
      {/* Sidebar - always rendered but translated off-screen */}
      <div 
        className={`sidebar-navigation ${showUserMenu ? 'open' : ''}`}
      >
        <div 
          style={{
            height: '100%', 
            backgroundColor: 'var(--lk-surface)', 
            padding: '1rem'
          }}
        >
              {/* Header */}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h2 style={{color: 'var(--lk-on-surface)', margin: 0}}>Menu</h2>

                  <IconButton key="search" 
                  icon="search" variant="text" color="white" onClick={() => setShowUserMenu(false)} />

                  
              </div>
              
              {/* User info */}
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
                <div className="user-avatar" style={{backgroundColor: 'var(--lk-primary)'}}>
                  <span style={{color: 'var(--lk-on-primary)'}}>
                    {(userProfile?.username || user.email)[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style={{color: 'var(--lk-on-surface)'}}>
                    {userProfile?.username || user.email.split('@')[0]}
                  </div>
                  <div style={{color: 'var(--lk-on-surface-variant)', fontSize: '0.875rem'}}>
                    {user.email}
                  </div>
                </div>
              </div>
              
              {/* Menu items */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(true);
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left',
                    color: 'var(--lk-on-surface)'
                  }}
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    onLogout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left',
                    color: 'var(--lk-error)'
                  }}
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="chat-messages">
        {messages.map((message) => {
          const isOwnMessage = message.user_id === user.id
          return (
            <div
              key={message.id}
              className={`message-wrapper ${isOwnMessage ? 'own-message' : 'other-message'}`}
            >
              <Card
                material={isOwnMessage ? "surface" : "surface"}
                className="message-bubble"
                style={isOwnMessage ? {
                  backgroundColor: '#2d1570' // Even darker purple
                } : {
                  backgroundColor: 'ontertiary' // Even darker purple
                }}
              >
                {/* Username for other users */}
                {!isOwnMessage && (
                  <Text fontClass="label" color="primary">
                    {message.username || 'Unknown User'}
                  </Text>
                )}
                
                {/* Message content */}
                <Text 
                  fontClass="body"
                  color={isOwnMessage ? "on-primary" : "white"}
                >
                  {message.content}
                </Text>
                
                {/* Timestamp */}
                <Text 
                  fontClass="caption"
                  color={isOwnMessage ? "on-primary" : "white"}
                  style={{opacity: 0.7}}
                >
                  {formatTime(message.created_at)}
                </Text>
              </Card>
            </div>
          )
        })}
        <div ref={messagesEndRef} className="messages-end-marker" />
      </div>

      {/* Message Input Area using LiftKit components */}
      <Card 
        material="glass"
        materialProps={{
          thickness: "thick",
          tint: "surface",
          tintOpacity: 0.9,
          light: true
        }}
        className="chat-input"
      >
        <Container maxWidth="4xl">
          <form onSubmit={handleSendMessage}>
            <Row gap="sm" alignItems="center" padding="sm">
              {/* Message input field using LiftKit TextInput */}
              <div style={{flex: 1}}>
                <TextInput
                  name="Message"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  labelPosition="hidden"
                  endIcon="message-circle"
                  disabled={loading}
                />
              </div>
              
              {/* Send button using LiftKit IconButton for icon-only design */}
              <IconButton
                type="submit"
                variant="fill"
                color="primary"
                icon={loading ? "loader-2" : "send"}
                disabled={loading || !newMessage.trim()}
                size="lg"
                style={{minWidth: '56px', height: '56px', borderRadius: '28px'}}
                aria-label="Send message"
              />
            </Row>
          </form>
        </Container>
      </Card>
    </div>
  )
}

// Settings Component - allows users to update their profile
// Uses a mix of Material UI and LiftKit components
function SettingsPage({ user, userProfile, onBack, onProfileUpdate }) {
  // Local state for settings form
  const [newUsername, setNewUsername] = useState(userProfile?.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    console.log('Form submitted with username:', newUsername)
    
    if (!newUsername.trim() || newUsername === userProfile?.username) {
      console.log('Form validation failed:', { newUsername: newUsername.trim(), currentUsername: userProfile?.username })
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Attempting to update username for user:', user.id)
      
      // First try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: newUsername.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()

      let data, error;
      
      // If update failed because no row exists, insert new profile
      if (updateError || !updateData || updateData.length === 0) {
        console.log('No existing profile found, creating new one...')
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            username: newUsername.trim(),
            updated_at: new Date().toISOString()
          })
          .select()
        
        data = insertData;
        error = insertError;
      } else {
        data = updateData;
        error = updateError;
      }

      console.log('Supabase response:', { data, error })

      if (error) throw error

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
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      {/* Settings Header using LiftKit Card */}
      <Card 
        material="primary"
        borderRadius="none"
        shadow="md"
      >
        <Row padding="md" alignItems="center">
          {/* Back button using LiftKit */}
          <Button
            variant="text"
            color="on-primary"
            label="← Back to Chat"
            onClick={onBack}
            marginRight="md"
          />
          <Text fontClass="title1" color="on-primary" style={{flex: 1}}>
            Settings
          </Text>
        </Row>
      </Card>

      {/* Settings Content */}
      <Container 
        style={{flex: 1, overflowY: 'auto', width: '100%'}} 
        maxWidth="2xl" 
        padding="md"
      >
        <Card material="surface-container-high" padding="lg">
          {/* Title using LiftKit Text */}
          <Text fontClass="heading" marginBottom="lg">
            Account Settings
          </Text>
          
          <form onSubmit={handleUpdateUsername}>
            {/* Error/Success Messages */}
            {error && (
              <Card 
                material="error-container"
                padding="md"
                marginBottom="md"
                style={{borderLeft: '4px solid rgb(239 68 68)'}}
              >
                <Row alignItems="center" gap="sm">
                  <span style={{fontSize: '1.25rem', color: 'rgb(220 38 38)'}}>❌</span>
                  <Text fontClass="body" color="on-error-container" fontWeight="semibold">
                    {error}
                  </Text>
                </Row>
              </Card>
            )}
            
            {success && (
              <Card 
                material="success-container"
                padding="md"
                marginBottom="md"
                style={{borderLeft: '4px solid rgb(34 197 94)'}}
              >
                <Row alignItems="center" gap="sm">
                  <span style={{fontSize: '1.25rem', color: 'rgb(22 163 74)'}}>✅</span>
                  <Text fontClass="body" color="on-success-container" fontWeight="semibold">
                    {success}
                  </Text>
                </Row>
              </Card>
            )}

            {/* Username Input using LiftKit */}
            <div style={{marginBottom: '1.5rem'}}>
              <TextInput
                name="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                helpText="Choose a unique username for your profile"
                disabled={loading}
                labelPosition="on-input"
                endIcon="user"
              />
            </div>

            {/* Update Button using LiftKit */}
            <Button
              type="submit"
              variant="fill"
              color={success ? "success" : "primary"}
              label={
                loading ? 'Updating...' : 
                success ? '✅ Updated!' : 
                'Update Username'
              }
              disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
              size="lg"
              style={{width: '100%'}}
              onClick={handleUpdateUsername}
            />
          </form>

          {/* Divider using LiftKit styling */}
          <div style={{height: '1px', backgroundColor: 'var(--lk-outline)', margin: '1.5rem 0'}} />

          {/* Account Information using LiftKit components */}
          <Text fontClass="title1" marginBottom="md">
            Account Information
          </Text>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <Card material="surface-container" padding="md" borderRadius="lg">
              <Text fontClass="label" fontWeight="semibold" marginBottom="xs">
                Email
              </Text>
              <Text fontClass="body" color="on-surface-variant">
                {user.email}
              </Text>
            </Card>
            <Card material="surface-container" padding="md" borderRadius="lg">
              <Text fontClass="label" fontWeight="semibold" marginBottom="xs">
                User ID
              </Text>
              <Text fontClass="body" color="on-surface-variant" style={{fontFamily: 'monospace', fontSize: '0.875rem'}}>
                {user.id}
              </Text>
            </Card>
            {userProfile && (
              <Card material="surface-container" padding="md" borderRadius="lg">
                <Text fontClass="label" fontWeight="semibold" marginBottom="xs">
                  Current Username
                </Text>
                <Text fontClass="body" color="on-surface-variant">
                  {userProfile.username}
                </Text>
              </Card>
            )}
          </div>
        </Card>
      </Container>
    </div>
  )
}