import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { isEqual } from 'lodash'; // Import isEqual for deep comparison

// Define valid table names to ensure type safety with Supabase client
type TableNames = keyof Database['public']['Tables'];

// Debounce function to limit the frequency of API calls
const debounce = (fn: Function, ms = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

interface UseRealTimeSyncOptions {
  orderBy?: string;
  additionalFilters?: {
    column: string;
    operator: string;
    value: any;
  }[];
}

/**
 * Hook for real-time synchronization with a Supabase table
 */
export function useRealTimeSync<T extends Record<string, any>>(
  tableName: TableNames,
  filterColumn: string,
  filterValue: string | null,
  options: UseRealTimeSyncOptions | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isRefreshing = useRef(false);
  const lastRefreshTimestamp = useRef(0);
  const previousData = useRef<T | null>(null); // Store previous data for comparison

  const fetchData = async () => {
    // Prevent concurrent calls and rate limit (minimum 2 seconds between refreshes)
    const now = Date.now();
    if (isRefreshing.current || (now - lastRefreshTimestamp.current < 2000)) {
      return;
    }

    isRefreshing.current = true;
    lastRefreshTimestamp.current = now;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from(tableName)
        .select('*') as any;

      query = query.eq(filterColumn, filterValue);
      
      // Apply additional filters if provided
      if (options?.additionalFilters) {
        options.additionalFilters.forEach(filter => {
          switch (filter.operator) {
            case 'eq':
              query = query.eq(filter.column, filter.value);
              break;
            case 'neq':
              query = query.neq(filter.column, filter.value);
              break;
            case 'gt':
              query = query.gt(filter.column, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.column, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.column, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.column, filter.value);
              break;
            case 'is':
              query = query.is(filter.column, filter.value);
              break;
            default:
              break;
          }
        });
      }
      
      // Apply ordering if provided
      if (options?.orderBy) {
        query = query.order(options.orderBy);
      }
      
      const { data: fetchedData, error: fetchError } = await query.single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Only update state if data has actually changed
      const newData = fetchedData as unknown as T;
      if (!isEqual(previousData.current, newData)) {
        previousData.current = newData;
        setData(newData);
      }
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  };

  // Create a debounced version of fetchData
  const debouncedFetchData = debounce(fetchData, 1000);

  useEffect(() => {
    if (!filterValue) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchData();

    // Create a unique channel name with timestamp to avoid conflicts
    const channelName = `${tableName}-changes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `${filterColumn}=eq.${filterValue}`
      }, (payload) => {
        console.log('Real-time update received:', payload);
        if (payload.eventType === 'DELETE') {
          previousData.current = null;
          setData(null);
        } else {
          // Only update if data has changed
          const newData = payload.new as unknown as T;
          if (!isEqual(previousData.current, newData)) {
            previousData.current = newData;
            setData(newData);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, filterColumn, filterValue, options]);

  // Expose a refresh function with rate limiting
  const refresh = () => {
    const now = Date.now();
    if (now - lastRefreshTimestamp.current < 2000) {
      return; // Don't refresh if less than 2 seconds since last refresh
    }
    
    debouncedFetchData();
  };

  return { data, loading, error, refresh };
}

/**
 * Hook for real-time collection synchronization with a Supabase table
 */
export function useRealTimeCollection<T extends Record<string, any>>(
  tableName: TableNames,
  filterColumn: string,
  filterValue: string | null,
  orderBy: string | null = null
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isRefreshing = useRef(false);
  const lastRefreshTimestamp = useRef(0);
  const requestCounter = useRef(0);
  const lastSuccessfulData = useRef<T[]>([]);
  const consecutiveEmptyResults = useRef(0);
  
  // Function to refresh data manually with throttling
  const refresh = async () => {
    if (!filterValue) {
      setLoading(false);
      return;
    }

    // Extreme rate limiting - only refresh every 5-10 seconds to prevent resource exhaustion
    const now = Date.now();
    if (isRefreshing.current || (now - lastRefreshTimestamp.current < 5000)) {
      return;
    }
    
    const requestId = ++requestCounter.current;
    isRefreshing.current = true;
    
    // Only show loading on initial load, never during refreshes
    if (loading && data.length === 0) {
      setLoading(true);
    }
    
    lastRefreshTimestamp.current = now;
    
    try {
      let query = supabase
        .from(tableName)
        .select('*') as any;

      query = query.eq(filterColumn, filterValue);
      
      if (orderBy) {
        query = query.order(orderBy);
      }
      
      const { data: fetchedData, error: fetchError } = await query;
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Only update if this is still the latest request
      if (requestId === requestCounter.current) {
        const typedData = fetchedData as unknown as T[];
        
        // If we received actual data, save it and update state
        if (typedData.length > 0) {
          lastSuccessfulData.current = typedData;
          consecutiveEmptyResults.current = 0;
          
          // Only update if data actually changed - prevents needless renders
          const dataChanged = JSON.stringify(typedData) !== JSON.stringify(data);
          if (dataChanged) {
            // Merge with existing data to preserve student positions
            if (tableName === 'session_participants') {
              setData(prevData => {
                // Create a map of existing data by user_id
                const existingDataMap = new Map(
                  prevData.map(item => [(item as any).user_id, item])
                );
                
                // Always use the new data for session participants
                typedData.forEach(newItem => {
                  existingDataMap.set((newItem as any).user_id, newItem);
                });
                
                // Convert map back to array
                return Array.from(existingDataMap.values());
              });
            } else {
              setData(typedData);
            }
          }
        } else {
          // If we get empty results, only increment counter but don't change UI
          consecutiveEmptyResults.current++;
          
          if (consecutiveEmptyResults.current > 3) {
            // If we've had multiple consecutive empty results, maybe the data is legitimately empty
            console.log(`${consecutiveEmptyResults.current} consecutive empty results - data may actually be empty`);
            
            // If we've had 5+ consecutive empty results and still have UI data, 
            // we should probably clear it as the data might truly be gone
            if (consecutiveEmptyResults.current > 5 && data.length > 0) {
              setData([]);
            }
          } else {
            console.log(`Ignoring empty result (attempt ${consecutiveEmptyResults.current})`);
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching ${tableName} collection:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Don't clear data on error, especially resource errors
    } finally {
      if (loading) {
        setLoading(false);
      }
      isRefreshing.current = false;
    }
  };

  // Use a longer debounce to further reduce API calls
  const debouncedRefresh = debounce(refresh, 2000);

  useEffect(() => {
    if (!filterValue) {
      setLoading(false);
      return;
    }

    // Initial fetch
    refresh();
    
    // Create a unique channel name with timestamp to avoid conflicts
    const channelName = `${tableName}-collection-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `${filterColumn}=eq.${filterValue}`
        },
        (payload) => {
          if (tableName === 'session_participants') {
            // For session participants, handle updates immediately
            if (payload.eventType === 'UPDATE') {
              setData(prevData => {
                return prevData.map(item => {
                  if ((item as any).user_id === (payload.new as any).user_id) {
                    // Always apply updates for session participants
                    return { ...item, ...payload.new };
                  }
                  return item;
                });
              });
            } else {
              // For other events, use the debounced refresh
              debouncedRefresh();
            }
          } else {
            // For other tables, use the default behavior
            debouncedRefresh();
          }
        }
      )
      .subscribe();

    // Set up a very conservative polling interval
    const pollingInterval = setInterval(() => {
      // Only poll if we're not already refreshing and it's been at least 10 seconds
      const now = Date.now();
      if (!isRefreshing.current && (now - lastRefreshTimestamp.current >= 10000)) {
        refresh();
      }
    }, 15000); // Poll every 15 seconds at most

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [tableName, filterColumn, filterValue, orderBy]);

  return { data, loading, error, refresh: debouncedRefresh };
}
