import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook to handle cleanup of async operations and timers
 * Prevents memory leaks and "Can't perform a React state update on an unmounted component" warnings
 */
export function useCleanup() {
  const mountedRef = useRef(true)
  const timeoutRefs = useRef([])
  const intervalRefs = useRef([])
  
  useEffect(() => {
    return () => {
      mountedRef.current = false
      
      // Clear all timeouts
      timeoutRefs.current.forEach(window.clearTimeout)
      timeoutRefs.current = []
      
      // Clear all intervals
      intervalRefs.current.forEach(window.clearInterval)
      intervalRefs.current = []
    }
  }, [])
  
  const isMounted = useCallback(() => mountedRef.current, [])
  
  const setTimeout = useCallback((callback, delay) => {
    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        callback()
      }
    }, delay)
    
    timeoutRefs.current.push(timeoutId)
    return timeoutId
  }, [])
  
  const setInterval = useCallback((callback, delay) => {
    const intervalId = window.setInterval(() => {
      if (mountedRef.current) {
        callback()
      }
    }, delay)
    
    intervalRefs.current.push(intervalId)
    return intervalId
  }, [])
  
  const clearTimeout = useCallback((timeoutId) => {
    window.clearTimeout(timeoutId)
    timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId)
  }, [])
  
  const clearInterval = useCallback((intervalId) => {
    window.clearInterval(intervalId)
    intervalRefs.current = intervalRefs.current.filter(id => id !== intervalId)
  }, [])
  
  return {
    isMounted,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval
  }
}

/**
 * Hook to safely handle async operations
 * Prevents state updates on unmounted components
 */
export function useSafeAsync() {
  const mountedRef = useRef(true)
  
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  const safeAsync = useCallback(async (asyncFunction) => {
    const result = await asyncFunction()
    if (mountedRef.current) {
      return result
    }
    return null
  }, [])
  
  return safeAsync
}