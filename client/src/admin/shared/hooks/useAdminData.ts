/**
 * Custom hooks for admin data fetching
 * Uses React Query pattern without the library
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api/adminApi';

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic data fetching hook
 */
function useQuery<T>(
  queryFn: () => Promise<any>,
  dependencies: any[] = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats(): UseQueryResult<{
  activeUsers: number;
  totalUsers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  totalRefundAmount: number;
}> {
  return useQuery(async () => {
    const result = await adminApi.getDashboardStats();
    return result.stats;
  });
}

/**
 * Hook for registration trends
 */
export function useRegistrationTrends(): UseQueryResult<Array<{
  month: string;
  count: number;
  label: string;
}>> {
  return useQuery(async () => {
    const result = await adminApi.getRegistrationTrends();
    return result.trends;
  });
}

/**
 * Hook for subscription trends
 */
export function useSubscriptionTrends(): UseQueryResult<Array<{
  month: string;
  count: number;
  label: string;
}>> {
  return useQuery(async () => {
    const result = await adminApi.getSubscriptionTrends();
    return result.trends;
  });
}

/**
 * Hook for users list
 */
export function useUsers(limit = 50, offset = 0) {
  return useQuery(
    async () => {
      const result = await adminApi.getUsers(limit, offset);
      return {
        users: result.users,
        total: result.total,
        hasMore: result.hasMore,
      };
    },
    [limit, offset]
  );
}

/**
 * Hook for single user
 */
export function useUser(id: number | null) {
  return useQuery(
    async () => {
      if (!id) return null;
      const result = await adminApi.getUser(id);
      return result.user;
    },
    [id]
  );
}

/**
 * Hook for transactions
 */
export function useTransactions(limit = 50, offset = 0) {
  return useQuery(
    async () => {
      const result = await adminApi.getTransactions(limit, offset);
      return {
        transactions: result.transactions,
        total: result.total,
        hasMore: result.hasMore,
      };
    },
    [limit, offset]
  );
}

/**
 * Hook for refunds
 */
export function useRefunds(limit = 50, offset = 0) {
  return useQuery(
    async () => {
      const result = await adminApi.getRefunds(limit, offset);
      return result.refunds;
    },
    [limit, offset]
  );
}

/**
 * Hook for mutations (create, update, delete)
 */
export function useMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>
): {
  mutate: (variables: V) => Promise<T>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (variables: V): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(variables);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

/**
 * Hook for updating user
 */
export function useUpdateUser() {
  return useMutation(
    async ({ id, updates }: { id: number; updates: any }) => {
      return await adminApi.updateUser(id, updates);
    }
  );
}


/**
 * Hook for processing refund
 */
export function useProcessRefund() {
  return useMutation(async (id: number) => {
    return await adminApi.processRefund(id);
  });
}
