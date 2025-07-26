import { supabase } from '../supabaseClient'

/**
 * Send push notification for a new message
 * This calls the Supabase Edge Function to handle the notification sending
 */
export const sendMessageNotification = async (messageId, senderId) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        messageId,
        senderId
      }
    })

    if (error) {
      console.error('Error sending push notification:', error)
      throw error
    }

    console.log('Push notification sent successfully:', data)
    return data
  } catch (error) {
    console.error('Failed to send push notification:', error)
    // Don't throw here - we don't want message sending to fail because of notification issues
    return null
  }
}

/**
 * Test push notification (for debugging)
 */
export const sendTestNotification = async (userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-test-notification', {
      body: {
        userId,
        title: 'Test Notification',
        body: 'This is a test push notification from ClaudeChat'
      }
    })

    if (error) {
      console.error('Error sending test notification:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to send test notification:', error)
    throw error
  }
}

export default {
  sendMessageNotification,
  sendTestNotification
}