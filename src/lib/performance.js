/**
 * Performance Monitoring Utilities for ClaudeChat
 * Tracks key performance metrics and identifies bottlenecks
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      authCalls: 0,
      subscriptions: new Set(),
      messageFetches: 0,
      renderCount: 0,
      lastAuthCall: null,
      sessionCallFrequency: []
    }
    
    // Only enable in development
    this.enabled = import.meta.env.DEV
    
    if (this.enabled) {
      console.log('🚀 Performance monitoring enabled')
    }
  }

  // Track auth session calls
  trackAuthCall(type = 'session') {
    if (!this.enabled) return
    
    const now = Date.now()
    this.metrics.authCalls++
    
    if (this.metrics.lastAuthCall) {
      const timeSinceLastCall = now - this.metrics.lastAuthCall
      this.metrics.sessionCallFrequency.push(timeSinceLastCall)
      
      // Keep only last 10 calls for frequency analysis
      if (this.metrics.sessionCallFrequency.length > 10) {
        this.metrics.sessionCallFrequency.shift()
      }
      
      // Warn if calls are too frequent (< 500ms apart, excluding initialization)
      if (timeSinceLastCall < 500 && this.metrics.authCalls > 3) {
        console.warn('🚨 High frequency auth calls detected:', {
          timeSinceLastCall,
          totalCalls: this.metrics.authCalls,
          type
        })
      }
    }
    
    this.metrics.lastAuthCall = now
  }

  // Track real-time subscriptions
  trackSubscription(channelName, action = 'create') {
    if (!this.enabled) return
    
    if (action === 'create') {
      this.metrics.subscriptions.add(channelName)
      console.log('📡 Subscription created:', channelName, `(Total: ${this.metrics.subscriptions.size})`)
    } else if (action === 'destroy') {
      this.metrics.subscriptions.delete(channelName)
      console.log('📡 Subscription destroyed:', channelName, `(Total: ${this.metrics.subscriptions.size})`)
    }
    
    // Warn if too many subscriptions
    if (this.metrics.subscriptions.size > 5) {
      console.warn('🚨 High subscription count detected:', {
        activeSubscriptions: Array.from(this.metrics.subscriptions),
        count: this.metrics.subscriptions.size
      })
    }
  }

  // Track message fetching operations
  trackMessageFetch(type = 'messages', count = 0) {
    if (!this.enabled) return
    
    this.metrics.messageFetches++
    console.log('💬 Message fetch:', {
      type,
      count,
      totalFetches: this.metrics.messageFetches
    })
    
    // Warn if excessive fetching
    if (this.metrics.messageFetches > 10) {
      console.warn('🚨 High message fetch count detected:', {
        totalFetches: this.metrics.messageFetches,
        type
      })
    }
  }

  // Track component renders
  trackRender(componentName) {
    if (!this.enabled) return
    
    this.metrics.renderCount++
    
    // Only log if renders are excessive
    if (this.metrics.renderCount > 20) {
      console.warn('🚨 High render count detected:', {
        component: componentName,
        totalRenders: this.metrics.renderCount
      })
    }
  }

  // Get performance summary
  getSummary() {
    if (!this.enabled) return null
    
    const avgCallFrequency = this.metrics.sessionCallFrequency.length > 0
      ? this.metrics.sessionCallFrequency.reduce((a, b) => a + b, 0) / this.metrics.sessionCallFrequency.length
      : 0

    return {
      authCalls: this.metrics.authCalls,
      avgAuthCallFrequency: Math.round(avgCallFrequency),
      activeSubscriptions: this.metrics.subscriptions.size,
      messageFetches: this.metrics.messageFetches,
      renderCount: this.metrics.renderCount,
      subscriptionList: Array.from(this.metrics.subscriptions)
    }
  }

  // Log performance summary
  logSummary() {
    if (!this.enabled) return
    
    const summary = this.getSummary()
    console.log('📊 Performance Summary:', summary)
    
    // Performance health check
    const issues = []
    
    if (summary.authCalls > 20) {
      issues.push(`High auth calls: ${summary.authCalls}`)
    }
    
    if (summary.avgAuthCallFrequency < 2000 && summary.avgAuthCallFrequency > 0) {
      issues.push(`Auth calls too frequent: ${summary.avgAuthCallFrequency}ms avg`)
    }
    
    if (summary.activeSubscriptions > 3) {
      issues.push(`Too many subscriptions: ${summary.activeSubscriptions}`)
    }
    
    if (summary.messageFetches > 15) {
      issues.push(`Excessive message fetches: ${summary.messageFetches}`)
    }
    
    if (issues.length > 0) {
      console.warn('🚨 Performance Issues Detected:', issues)
    } else {
      console.log('✅ Performance looks good!')
    }
  }

  // Reset metrics
  reset() {
    if (!this.enabled) return
    
    this.metrics = {
      authCalls: 0,
      subscriptions: new Set(),
      messageFetches: 0,
      renderCount: 0,
      lastAuthCall: null,
      sessionCallFrequency: []
    }
    console.log('🔄 Performance metrics reset')
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Performance measurement utilities
export const measure = {
  // Measure function execution time
  async time(name, fn) {
    if (!import.meta.env.DEV) {
      return await fn()
    }
    
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    
    console.log(`⏱️ ${name}: ${Math.round(end - start)}ms`)
    return result
  },

  // Mark performance events
  mark(eventName) {
    if (!import.meta.env.DEV) return
    
    if (performance.mark) {
      performance.mark(eventName)
      console.log(`🎯 Performance mark: ${eventName}`)
    }
  }
}

// Development helper to expose performance tools
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.perf = {
    monitor: performanceMonitor,
    summary: () => performanceMonitor.logSummary(),
    reset: () => performanceMonitor.reset()
  }
  
  console.log('🛠️ Performance tools available: window.perf')
}