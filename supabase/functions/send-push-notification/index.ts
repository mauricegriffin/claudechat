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
    // Log headers for debugging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Parse request body
    const { messageId, senderId } = await req.json()
    console.log('Request body:', { messageId, senderId })
    
    // Check environment variables first
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      VAPID_PUBLIC_KEY: !!Deno.env.get('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY: !!Deno.env.get('VAPID_PRIVATE_KEY'),
      VAPID_EMAIL: !!Deno.env.get('VAPID_EMAIL')
    }
    console.log('Environment variables check:', envCheck)
    
    // Return environment status for debugging
    if (messageId === 'env-check') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Environment check', 
          env: envCheck,
          vapidKeyStart: Deno.env.get('VAPID_PUBLIC_KEY')?.substring(0, 20)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Early test - return success immediately to test if we can reach this point
    if (messageId === 'test-early-return') {
      return new Response(
        JSON.stringify({ success: true, message: 'Early return test successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!messageId || !senderId) {
      return new Response(
        JSON.stringify({ error: 'messageId and senderId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client with service role key
    console.log('Initializing Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlStart: supabaseUrl?.substring(0, 30)
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get message details including conversation_id
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('content, conversation_id')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('Error fetching message:', messageError)
      return new Response(
        JSON.stringify({ error: 'Message not found', details: messageError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // Get sender username separately
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', senderId)
      .single()

    // Get conversation participants (excluding sender)
    console.log(`Fetching participants for conversation ${message.conversation_id}, excluding sender ${senderId}`)
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .neq('user_id', senderId)

    if (participantsError) {
      console.error('Error fetching conversation participants:', participantsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversation participants' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No participants found in conversation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get push subscriptions for conversation participants only
    const participantIds = participants.map(p => p.user_id)
    console.log(`Found ${participants.length} participants (excluding sender):`, participantIds)
    console.log(`Sender ${senderId} should NOT be in this list`)
    
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', participantIds)

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

    console.log('VAPID configuration:', {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey,
      publicKeyStart: vapidPublicKey?.substring(0, 20),
      email: vapidEmail
    })

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
    const senderName = senderProfile?.username || 'Someone'
    const messagePreview = message.content.length > 100 
      ? message.content.substring(0, 100) + '...' 
      : message.content

    const payload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: messagePreview,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png', // Use the same icon as badge since we don't have a separate badge
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

    console.log(`Push notifications sent to conversation ${message.conversation_id}: ${successful} successful, ${failed} failed out of ${participantIds.length} participants`)
    console.log(`Notifications were sent to users:`, participantIds)
    console.log(`Sender ${senderId} should NOT have received a notification`)

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