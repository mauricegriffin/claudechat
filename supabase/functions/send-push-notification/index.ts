import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import web-push for Deno
import webpush from "npm:web-push@3.6.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { messageId, senderId } = await req.json()
    
    if (!messageId || !senderId) {
      return new Response(
        JSON.stringify({ error: 'messageId and senderId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get message details with sender username
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        content,
        user_profiles!inner(username)
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('Error fetching message:', messageError)
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get all push subscriptions except for the sender
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .neq('user_id', senderId)

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure VAPID settings
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'noreply@claudechat.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured')
      return new Response(
        JSON.stringify({ error: 'Push notification service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    webpush.setVapidDetails(
      `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Prepare notification payload
    const senderName = message.user_profiles?.username || 'Someone'
    const messagePreview = message.content.length > 100 
      ? message.content.substring(0, 100) + '...' 
      : message.content

    const payload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: messagePreview,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'new-message',
      timestamp: Date.now(),
      data: { 
        url: '/',
        messageId,
        senderId,
        senderName
      }
    })

    // Send notifications to all subscriptions
    const notificationPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
        return { success: true, subscription: sub.id }
      } catch (error) {
        console.error(`Failed to send notification to subscription ${sub.id}:`, error)
        
        // If the subscription is invalid, remove it from the database
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          
          console.log(`Removed invalid subscription ${sub.id}`)
        }
        
        return { success: false, subscription: sub.id, error: error.message }
      }
    })

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises)
    
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length
    
    const failed = results.length - successful

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed: failed,
        total: subscriptions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})