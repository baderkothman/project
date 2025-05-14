import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing environment variables');
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserResponse {
  success: boolean;
  message: string;
  error?: string;
}

async function deleteUserFully(userId: string): Promise<DeleteUserResponse> {
  console.log(`Starting deletion process for user: ${userId}`);

  try {
    // Step 1: Delete user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to delete user profile:', profileError);
      return {
        success: false,
        message: 'Failed to delete user profile',
        error: profileError.message,
      };
    }

    console.log('Successfully deleted user profile');

    // Step 2: Delete user from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Failed to delete auth user:', authError);
      return {
        success: false,
        message: 'Profile deleted but failed to delete auth user',
        error: authError.message,
      };
    }

    console.log('Successfully deleted auth user');

    return {
      success: true,
      message: 'User successfully deleted from both profile and auth',
    };
  } catch (error) {
    console.error('Unexpected error during user deletion:', error);
    return {
      success: false,
      message: 'Unexpected error during deletion',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'userId is required',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 400,
        }
      );
    }

    const result = await deleteUserFully(userId);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: result.success ? 200 : 500,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});