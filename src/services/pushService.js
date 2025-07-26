import { supabase } from '../supabaseClient'

// VAPID public key - you'll need to replace this with your generated key
const VAPID_PUBLIC_KEY = 'BM7PR_1-M0l1aq-VIcIruPYwKfbwuRtCXSiy4zFNBaWdd0wRTxgOGhXOC5eR6a31IQtYEndgh9EgUrqR28eOnu0'

/**
 * Convert VAPID public key from URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  const permission = await Notification.requestPermission()
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }
  
  return permission
}

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (userId) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  // Request permission if not already granted
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Permission not granted')
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // Save subscription to database
    const subscriptionData = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: navigator.userAgent
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id,endpoint',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error saving push subscription:', error)
      throw error
    }

    console.log('Push subscription saved successfully:', data)
    return subscription

  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (userId) => {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe()
      
      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
      
      if (error) {
        console.error('Error removing push subscription from database:', error)
        throw error
      }
    }
    
    return true
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    throw error
  }
}

/**
 * Check if user is currently subscribed to push notifications
 */
export const isSubscribedToPush = async () => {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch (error) {
    console.error('Error checking push subscription status:', error)
    return false
  }
}

/**
 * Get current push subscription
 */
export const getCurrentPushSubscription = async () => {
  if (!isPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (error) {
    console.error('Error getting current push subscription:', error)
    return null
  }
}

/**
 * Clean up old/invalid subscriptions for a user
 */
export const cleanupPushSubscriptions = async (userId) => {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .lt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days old
    
    if (error) {
      console.error('Error cleaning up old push subscriptions:', error)
    }
  } catch (error) {
    console.error('Error in cleanup:', error)
  }
}

export default {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  getCurrentPushSubscription,
  cleanupPushSubscriptions
}