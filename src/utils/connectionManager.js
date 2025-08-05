// Connection manager to prevent ERR_INSUFFICIENT_RESOURCES
import { supabase } from '../supabaseClient'

class ConnectionManager {
  constructor() {
    this.subscriptions = new Map()
    this.cleanupTimers = new Map()
    this.maxSubscriptions = 10 // Limit concurrent subscriptions
  }

  // Add subscription with automatic cleanup
  addSubscription(key, subscription) {
    // Clean up old subscription if exists
    this.removeSubscription(key)
    
    // Check subscription limit
    if (this.subscriptions.size >= this.maxSubscriptions) {
      console.warn('Max subscriptions reached, cleaning up oldest')
      const oldestKey = this.subscriptions.keys().next().value
      this.removeSubscription(oldestKey)
    }
    
    this.subscriptions.set(key, subscription)
    
    // Set cleanup timer (5 minutes)
    const timer = setTimeout(() => {
      this.removeSubscription(key)
    }, 5 * 60 * 1000)
    
    this.cleanupTimers.set(key, timer)
  }

  // Remove subscription
  removeSubscription(key) {
    const subscription = this.subscriptions.get(key)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
    
    const timer = this.cleanupTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(key)
    }
  }

  // Clean up all subscriptions
  cleanup() {
    for (const [key, subscription] of this.subscriptions) {
      subscription.unsubscribe()
    }
    this.subscriptions.clear()
    
    for (const [key, timer] of this.cleanupTimers) {
      clearTimeout(timer)
    }
    this.cleanupTimers.clear()
  }

  // Get active subscription count
  getActiveCount() {
    return this.subscriptions.size
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager()

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  connectionManager.cleanup()
})