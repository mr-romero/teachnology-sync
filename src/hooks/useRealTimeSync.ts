
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

// Define valid table names to ensure type safety with Supabase client
type TableNames = keyof Database['public']['Tables'];

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

  useEffect(() => {
    if (!filterValue) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from(tableName)
          .select('*')
          .eq(filterColumn, filterValue);
        
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
        
        // Safe type conversion with explicit cast
        setData(fetchedData as unknown as T);
      } catch (err) {
        console.error(`Error fetching ${tableName}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `${filterColumn}=eq.${filterValue}`
      }, (payload) => {
        console.log('Real-time update received:', payload);
        if (payload.eventType === 'DELETE') {
          setData(null);
        } else {
          // Safe type conversion
          setData(payload.new as unknown as T);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, filterColumn, filterValue, options]);

  return { data, loading, error };
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

  // Function to refresh data manually
  const refresh = async () => {
    if (!filterValue) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from(tableName)
        .select('*')
        .eq(filterColumn, filterValue);
      
      if (orderBy) {
        query = query.order(orderBy);
      }
      
      const { data: fetchedData, error: fetchError } = await query;
      
      if (fetchError) {
        throw fetchError;
      }
      
      // Safe type conversion
      setData(fetchedData as unknown as T[]);
    } catch (err) {
      console.error(`Error fetching ${tableName} collection:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    if (!filterValue) return;

    // Subscribe to changes
    const channel = supabase
      .channel(`${tableName}-collection-changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `${filterColumn}=eq.${filterValue}`
      }, () => {
        // When any change occurs, refresh the data
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, filterColumn, filterValue, orderBy]);

  return { data, loading, error, refresh };
}
