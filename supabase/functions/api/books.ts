import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const category = url.searchParams.get('category');
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0');
    const maxPrice = url.searchParams.get('maxPrice');

    // Build query
    let query = supabase
      .from('book_summaries')
      .select('*')
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (minPrice > 0) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});