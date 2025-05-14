import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'DELETE';
  table: string;
  record: {
    id: string;
    [key: string]: any;
  };
  old_record: {
    id: string;
    [key: string]: any;
  };
  schema: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    // Validate webhook payload
    if (
      payload.type !== 'DELETE' ||
      payload.table !== 'profiles' ||
      payload.schema !== 'public' ||
      !payload.old_record?.id
    ) {
      console.error('Invalid webhook payload:', payload);
      return new Response(
        JSON.stringify({
          message: 'Invalid webhook payload',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const userId = payload.old_record.id;
    console.log(`Processing deletion for user: ${userId}`);

    try {
      // Delete user from auth.users
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error(`Failed to delete auth user ${userId}:`, deleteError);
        return new Response(
          JSON.stringify({
            message: 'Failed to delete auth user',
            error: deleteError.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      console.log(`Successfully deleted auth user ${userId}`);
      return new Response(
        JSON.stringify({
          message: 'User successfully deleted',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error(`Error deleting auth user ${userId}:`, error);
      return new Response(
        JSON.stringify({
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});