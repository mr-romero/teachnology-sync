
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealTimeSync<T>(
  table: string,
  column: string,
  value: string,
  initialData: T | null = null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If there's no value, don't do anything
    if (!value) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch
    const fetchData = async () => {
      try {
        const { data: result, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq(column, value)
          .single();
        
        if (fetchError) throw fetchError;
        
        setData(result as T);
      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${column}=eq.${value}`
        },
        (payload) => {
          console.log(`Real-time update for ${table}:`, payload);
          if (payload.eventType === 'DELETE') {
            setData(null);
          } else {
            setData(payload.new as T);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, column, value]);

  return { data, loading, error };
}

export function useRealTimeCollection<T>(
  table: string,
  column: string,
  value: string,
  orderColumn?: string,
  ascending: boolean = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If there's no value, don't do anything
    if (!value) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch
    const fetchData = async () => {
      try {
        let query = supabase
          .from(table)
          .select('*')
          .eq(column, value);
        
        if (orderColumn) {
          query = query.order(orderColumn, { ascending });
        }
        
        const { data: result, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;
        
        setData(result as T[]);
      } catch (err) {
        console.error(`Error fetching ${table} collection:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${column}=eq.${value}`
        },
        async (payload) => {
          console.log(`Real-time update for ${table} collection:`, payload);
          
          // Refetch the entire collection to ensure proper ordering
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, column, value, orderColumn, ascending]);

  return { data, loading, error, refresh: () => setLoading(true) };
}
