/**
 * Development Performance Dashboard
 * Only visible in development mode - monitors app performance metrics
 */

import { useState, useEffect } from 'react'
import { performanceMonitor } from '../lib/performance'
import { Card, CardContent } from './ui/card'

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only run in development
    if (!import.meta.env.DEV) {
      return
    }

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      const summary = performanceMonitor.getSummary()
      setMetrics(summary)
    }, 5000)

    // Initial load
    const summary = performanceMonitor.getSummary()
    setMetrics(summary)

    return () => clearInterval(interval)
  }, [])

  // Only show in development
  if (!import.meta.env.DEV) {
    return null
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm z-50 hover:bg-blue-700"
        title="Show Performance Dashboard"
      >
        📊 Perf
      </button>
    )
  }

  const getHealthStatus = () => {
    if (!metrics) return 'loading'
    
    const issues = []
    if (metrics.authCalls > 20) issues.push('High auth calls')
    if (metrics.avgAuthCallFrequency < 2000 && metrics.avgAuthCallFrequency > 0) issues.push('Rapid auth calls')
    if (metrics.activeSubscriptions > 3) issues.push('Many subscriptions')
    if (metrics.messageFetches > 15) issues.push('Excessive fetches')
    
    return issues.length === 0 ? 'good' : 'warning'
  }

  const healthStatus = getHealthStatus()

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-2">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-sm">🚀 Performance Monitor</h3>
          <div className="flex gap-2">
            <button
              onClick={() => performanceMonitor.logSummary()}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              title="Log Summary to Console"
            >
              Log
            </button>
            <button
              onClick={() => performanceMonitor.reset()}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              title="Reset Metrics"
            >
              Reset
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Hide Dashboard"
            >
              ✕
            </button>
          </div>
        </div>

        {metrics && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Health Status:</span>
              <span className={`font-medium ${
                healthStatus === 'good' ? 'text-green-600' : 
                healthStatus === 'warning' ? 'text-orange-600' : 
                'text-gray-500'
              }`}>
                {healthStatus === 'good' ? '✅ Good' : 
                 healthStatus === 'warning' ? '⚠️ Issues' : 
                 '⏳ Loading'}
              </span>
            </div>

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Auth Calls:</span>
                <span className={metrics.authCalls > 20 ? 'text-red-600 font-medium' : ''}>
                  {metrics.authCalls}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Avg Call Freq:</span>
                <span className={
                  metrics.avgAuthCallFrequency < 2000 && metrics.avgAuthCallFrequency > 0 
                    ? 'text-red-600 font-medium' : ''
                }>
                  {metrics.avgAuthCallFrequency > 0 ? `${metrics.avgAuthCallFrequency}ms` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Active Subscriptions:</span>
                <span className={metrics.activeSubscriptions > 3 ? 'text-red-600 font-medium' : ''}>
                  {metrics.activeSubscriptions}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Message Fetches:</span>
                <span className={metrics.messageFetches > 15 ? 'text-red-600 font-medium' : ''}>
                  {metrics.messageFetches}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Render Count:</span>
                <span>{metrics.renderCount}</span>
              </div>
            </div>

            {metrics.subscriptionList.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-gray-600 mb-1">Active Channels:</div>
                <div className="text-xs text-gray-500">
                  {metrics.subscriptionList.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 pt-2 border-t text-xs text-gray-500">
          <div>💡 Use <code>window.perf</code> in console for more tools</div>
        </div>
      </CardContent>
    </Card>
  )
}