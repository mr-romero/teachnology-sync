
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define a literal type for allowed tables to improve type safety
type TableName = 'presentations' | 'slides' | 'presentation_sessions' | 'session_participants' | 'student_answers';

// Simple debounce function to prevent too many refresh calls
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

export function useRealTimeSync<T>(
  table: TableName,
  column: string,
  value: string,
  initialData: T | null = null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshInProgress = useRef(false);

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
      if (refreshInProgress.current) return;
      refreshInProgress.current = true;
      
      try {
        // Use maybeSingle() instead of single() to avoid the error when no rows are found
        const { data: result, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq(column, value)
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        
        // Only set data if it exists
        if (result) {
          setData(result as T);
        } else {
          console.warn(`No data found for ${table} with ${column} = ${value}`);
          setData(null);
        }
      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
        refreshInProgress.current = false;
      }
    };
    
    fetchData();
    
    // Create unique channel name for this subscription
    const channelName = `sync-${table}-${column}-${value}-${Date.now()}`;
    
    // Subscribe to changes with explicit typing on the channel
    const channel = supabase
      .channel(channelName)
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
            // Fix: Use a simpler approach to avoid excessive type depth
            setData(payload.new as unknown as T);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, column, value]);

  const refresh = async () => {
    if (refreshInProgress.current) return;
    
    refreshInProgress.current = true;
    setLoading(true);
    
    try {
      const { data: result, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq(column, value)
        .maybeSingle();
        
      if (fetchError) throw fetchError;
      
      if (result) {
        setData(result as T);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error(`Error refreshing ${table}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
      refreshInProgress.current = false;
    }
  };

  // Use debounced version of refresh to prevent excessive API calls
  const debouncedRefresh = debounce(refresh, 500);

  return { data, loading, error, refresh: debouncedRefresh };
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
  const refreshInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  
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
      // Rate limiting - don't fetch if less than 1 second has passed since last fetch
      const now = Date.now();
      if (refreshInProgress.current || (now - lastFetchTime.current < 1000)) {
        return;
      }
      
      refreshInProgress.current = true;
      lastFetchTime.current = now;
      
      try {
        // Use explicit typing for the query
        const query = supabase
          .from(table)
          .select('*')
          .eq(column, value);
        
        // Add ordering if specified
        const finalQuery = orderColumn 
          ? query.order(orderColumn, { ascending }) 
          : query;
        
        const { data: result, error: fetchError } = await finalQuery;
        
        if (fetchError) throw fetchError;
        
        setData(result as T[]);
      } catch (err) {
        console.error(`Error fetching ${table} collection:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
        refreshInProgress.current = false;
      }
    };
    
    fetchData();
    
    // Create unique channel name for this subscription
    const channelName = `${table}-${column}-${value}-${Date.now()}`;
    
    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${column}=eq.${value}`
        },
        () => {
          // Instead of immediately fetching, schedule a fetch with debounce
          debouncedFetchData();
        }
      )
      .subscribe();
      
    // Debounced version of fetchData to avoid too many concurrent requests
    const debouncedFetchData = debounce(fetchData, 1000);
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, column, value, orderColumn, ascending]);
  
  const refresh = async () => {
    // Rate limiting - don't fetch if less than 1 second has passed since last fetch
    const now = Date.now();
    if (refreshInProgress.current || (now - lastFetchTime.current < 1000)) {
      return;
    }
    
    refreshInProgress.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    
    try {
      const query = supabase
        .from(table)
        .select('*')
        .eq(column, value);
      
      const finalQuery = orderColumn 
        ? query.order(orderColumn, { ascending }) 
        : query;
      
      const { data: result, error: fetchError } = await finalQuery;
      
      if (fetchError) throw fetchError;
      
      setData(result as T[]);
    } catch (err) {
      console.error(`Error refreshing ${table} collection:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
      refreshInProgress.current = false;
    }
  };

  // Debounced version of refresh
  const debouncedRefresh = debounce(refresh, 1000);

  return { data, loading, error, refresh: debouncedRefresh };
}
