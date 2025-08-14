import { useState, useEffect, useCallback } from 'react'
import { userService } from '../services/userService'
import { conversationService } from '../services/conversationService'
import { messageService } from '../features/chat/services/messageService'
import { authService } from '../features/auth/services/authService'

// Import shadcn/ui components
import { Card, CardContent } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { 
  Search, 
  MessageCircle, 
  Users, 
  Settings, 
  LogOut,
  Loader2
} from 'lucide-react'

export default function UserList({ user, onConversationSelect, onLogout, onSettings }) {
  const [conversations, setConversations] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [onlineUsers] = useState(new Set()) // TODO: Implement presence system
  const [unreadCounts, setUnreadCounts] = useState({})

  // Load conversations and users
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      console.log('UserList: Loading data for user:', user.id)
      
      const [conversationsData, usersData] = await Promise.all([
        conversationService.getUserConversations(user.id),
        userService.getAllUsers()
      ])
      
      console.log('UserList: Conversations data:', conversationsData)
      console.log('UserList: Users data:', usersData)
      
      setConversations(conversationsData || [])
      setAllUsers(usersData?.filter(u => u.id !== user.id) || [])

      // Load unread counts for each conversation
      if (conversationsData?.length > 0) {
        const unreadCountsData = {}
        await Promise.all(
          conversationsData.map(async (conv) => {
            try {
              const count = await messageService.getUnreadCount(conv.id, user.id)
              unreadCountsData[conv.id] = count
            } catch (error) {
              console.warn('Error getting unread count for conversation:', conv.id, error)
              unreadCountsData[conv.id] = 0
            }
          })
        )
        setUnreadCounts(unreadCountsData)
      }
    } catch (error) {
      console.error('Error loading user list data:', error)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reload unread counts only
  const reloadUnreadCounts = useCallback(async () => {
    if (conversations?.length > 0) {
      const unreadCountsData = {}
      await Promise.all(
        conversations.map(async (conv) => {
          try {
            const count = await messageService.getUnreadCount(conv.id, user.id)
            unreadCountsData[conv.id] = count
          } catch (error) {
            console.warn('Error getting unread count for conversation:', conv.id, error)
            unreadCountsData[conv.id] = 0
          }
        })
      )
      setUnreadCounts(unreadCountsData)
    }
  }, [conversations, user.id])

  // Subscribe to message updates for unread counts
  useEffect(() => {
    const subscription = messageService.subscribeToUnreadCounts(user.id, () => {
      // Only reload unread counts, not all data
      reloadUnreadCounts()
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [user.id, reloadUnreadCounts])

  // Filter users based on search
  const filteredUsers = allUsers.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate Everyone group from direct conversations
  const everyoneConversation = conversations.find(c => c.type === 'group' && c.name === 'Everyone')
  const directConversations = conversations.filter(c => c.type === 'direct')

  const handleUserSelect = async (selectedUser) => {
    try {
      setLoading(true)
      const conversation = await conversationService.getOrCreateDirectConversation(
        user.id, 
        selectedUser.id
      )
      onConversationSelect(conversation, selectedUser)
    } catch (error) {
      console.error('Error creating conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutClick = async () => {
    try {
      await authService.signOut()
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-900" />
          <p className="text-gray-400">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <Card className="rounded-none border-b bg-red-900 text-white">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold">Chats</h1>
          <div className="flex space-x-2">
            <Button 
              onClick={onSettings} 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button 
              onClick={handleLogoutClick} 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {/* Everyone Group - Always First */}
        {everyoneConversation && (
          <ConversationItem
            key={everyoneConversation.id}
            conversation={everyoneConversation}
            unreadCount={unreadCounts[everyoneConversation.id] || 0}
            onClick={() => onConversationSelect(everyoneConversation, null)}
            isGroup={true}
            allUsers={allUsers}
          />
        )}

        {/* Existing Direct Conversations */}
        {directConversations.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            unreadCount={unreadCounts[conversation.id] || 0}
            onClick={() => {
              const otherUser = allUsers.find(u => u.id === conversation.participant_id)
              onConversationSelect(conversation, otherUser)
            }}
            isGroup={false}
            allUsers={allUsers}
          />
        ))}

        {/* Available Users (Not Yet Conversing) */}
        {filteredUsers.length > directConversations.length && (
          <>
            <div className="px-4 py-3 text-sm font-medium text-gray-400 border-b border-gray-800 bg-gray-900/50">
              Start New Conversation
            </div>
            
            {filteredUsers
              .filter(u => !directConversations.some(c => c.participant_id === u.id))
              .map(availableUser => (
                <UserItem
                  key={availableUser.id}
                  user={availableUser}
                  isOnline={onlineUsers.has(availableUser.id)}
                  onClick={() => handleUserSelect(availableUser)}
                />
              ))
            }
          </>
        )}

        {/* Empty State */}
        {conversations.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">No conversations yet</h3>
            <p className="text-gray-400 text-center">
              Start a conversation by selecting a user from the list above
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// Conversation Item Component (WhatsApp style)
function ConversationItem({ conversation, unreadCount, onClick, isGroup, allUsers }) {
  const lastMessage = conversation.messages?.[0]
  
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const getDisplayName = () => {
    if (isGroup) return 'Everyone'
    return conversation.participant_name || conversation.name || 'Direct Message'
  }

  const getParticipantEmail = () => {
    if (isGroup) return null
    // Find the participant in allUsers to get their email
    const participant = allUsers.find(u => u.id === conversation.participant_id)
    const email = participant?.email
    // Don't show placeholder emails
    if (email && !email.includes('@example.com')) {
      return email
    }
    return null
  }

  const getLastMessagePreview = () => {
    if (!lastMessage) return 'No messages yet'
    
    if (lastMessage.message_type === 'image') {
      return '📷 Image'
    }
    
    return lastMessage.content || 'Message'
  }

  return (
    <div 
      onClick={onClick}
      className="flex items-center p-4 hover:bg-white/10 cursor-pointer border-b border-gray-800 transition-colors group"
    >
      <Avatar className="mr-3 flex-shrink-0">
        <AvatarFallback className={isGroup ? "bg-red-900 text-white" : "bg-gray-600 text-white"}>
          {isGroup ? (
            <Users className="h-5 w-5" />
          ) : (
            getDisplayName()[0]?.toUpperCase() || '?'
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-white group-hover:text-gray-100">
              {getDisplayName()}
              {!isGroup && getParticipantEmail() && (
                <span className="text-xs text-gray-500 font-normal ml-2">
                  {getParticipantEmail()}
                </span>
              )}
            </h3>
          </div>
          {lastMessage && (
            <span className="text-xs text-gray-400 group-hover:text-gray-300 ml-2 flex-shrink-0">
              {formatTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 group-hover:text-gray-300 truncate flex-1">
            {getLastMessagePreview()}
          </p>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 px-2 py-1 text-xs flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// User Item Component (for new conversations)
function UserItem({ user, isOnline, onClick }) {
  const displayName = userService.formatUserDisplayName(user)
  const initials = userService.getUserInitials(user)

  return (
    <div 
      onClick={onClick}
      className="flex items-center p-4 hover:bg-white/10 cursor-pointer border-b border-gray-800 transition-colors group"
    >
      <div className="relative mr-3">
        <Avatar>
          <AvatarFallback className="bg-gray-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-white group-hover:text-gray-100 truncate">
          {displayName}
          {user.email && !user.email.includes('@example.com') && (
            <span className="text-xs text-gray-500 font-normal ml-2">
              {user.email}
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-400 group-hover:text-gray-300">
          {isOnline ? 'Online' : 'Tap to message'}
        </p>
      </div>
      
      <MessageCircle className="h-4 w-4 text-gray-400 group-hover:text-gray-300 flex-shrink-0" />
    </div>
  )
}