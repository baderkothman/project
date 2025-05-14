import { useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

interface UseInfiniteScrollOptions {
  pageSize?: number;
  initialData?: any[];
}

export function useInfiniteScroll<T>(
  supabase: SupabaseClient,
  table: string,
  options: UseInfiniteScrollOptions = {}
) {
  const { pageSize = 10, initialData = [] } = options;
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: newData, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .range(from, to)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (newData) {
        setData(prev => [...prev, ...newData]);
        setHasMore(newData.length === pageSize);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, loading, hasMore, supabase, table]);

  const refresh = useCallback(async () => {
    setPage(0);
    setData([]);
    setHasMore(true);
    await loadMore();
  }, [loadMore]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}