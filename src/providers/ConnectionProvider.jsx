import { createContext, useContext, useEffect, useRef } from 'react'

// Context for connection management
const ConnectionContext = createContext(null)

export function ConnectionProvider({ children }) {
  const subscriptions = useRef(new Map())
  const timers = useRef(new Map())

  // Add subscription with automatic cleanup
  const addSubscription = (key, subscription) => {
    // Clean up existing subscription
    removeSubscription(key)
    
    subscriptions.current.set(key, subscription)
    
    // Auto-cleanup after 5 minutes
    const timer = setTimeout(() => {
      removeSubscription(key)
    }, 5 * 60 * 1000)
    
    timers.current.set(key, timer)
  }

  // Remove subscription
  const removeSubscription = (key) => {
    const sub = subscriptions.current.get(key)
    if (sub) {
      sub.unsubscribe()
      subscriptions.current.delete(key)
    }
    
    const timer = timers.current.get(key)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(key)
    }
  }

  // Cleanup all subscriptions
  const cleanup = () => {
    subscriptions.current.forEach((sub) => sub.unsubscribe())
    subscriptions.current.clear()
    
    timers.current.forEach((timer) => clearTimeout(timer))
    timers.current.clear()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Cleanup on page unload
  useEffect(() => {
    const handleUnload = () => cleanup()
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const value = {
    addSubscription,
    removeSubscription,
    cleanup
  }

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider')
  }
  return context
}