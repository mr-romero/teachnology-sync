
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Define a literal type for allowed tables to improve type safety
type TableName = 'presentations' | 'slides' | 'presentation_sessions' | 'session_participants' | 'student_answers';

export function useRealTimeSync<T>(
  table: TableName,
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
        // Simplify typing by using type assertion after the query
        const response = await supabase
          .from(table)
          .select('*')
          .eq(column, value)
          .single();
        
        if (response.error) throw response.error;
        
        setData(response.data as T);
      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Subscribe to changes with explicit typing on the channel
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
            // Type assertion to T since we know the structure from the database
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
  table: TableName,
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
        // Simplify the query builder type inference
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
