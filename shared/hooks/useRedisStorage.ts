import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import debounce from 'lodash/debounce';

// Hook for Redis storage with user-scoped keys
export function useRedisStorage<T>(
  key: string,
  initialValue: T,
  options: {
    ttl?: number; // TTL in seconds
    global?: boolean; // If true, don't scope to user
  } = {}
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const { data: session } = useSession();
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  const { ttl = 24 * 60 * 60, global = false } = options; // Default 24 hours TTL

  // Create user-scoped key
  const redisKey = global ? key : `user:${session?.user?.id || 'anonymous'}:${key}`;

  // Load value from Redis on mount
  useEffect(() => {
    if (!session && !global) {
      setIsLoading(false);
      return;
    }

    const loadValue = async () => {
      try {
        const response = await fetch('/api/storage/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: redisKey }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.value !== null) {
            setValue(data.value);
          }
        }
      } catch (error) {
        console.warn(`Error loading Redis key "${redisKey}":`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [redisKey, session, global]);

  // Debounced function to save value to Redis
  const saveToRedisRef = useRef(
    debounce(async (key: string, valueToStore: any) => {
      try {
        await fetch('/api/storage/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: valueToStore, ttl }),
        });
      } catch (error) {
        console.warn(`Error setting Redis key "${key}":`, error);
      }
    }, 500)
  );

  // Cleanup on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      saveToRedisRef.current.cancel();
    };
  }, []);

  const setRedisValue = useCallback(
    async (newValue: T | ((val: T) => T)) => {
      const computedValue = newValue instanceof Function ? newValue(value) : newValue;

      // Skip write if value hasn't changed (shallow/deep equality check)
      try {
        if (typeof computedValue === 'object') {
          if (JSON.stringify(computedValue) === JSON.stringify(value)) {
            return;
          }
        } else if (computedValue === value) {
          return;
        }
      } catch {
        // If stringify fails, proceed with write
      }

      setValue(computedValue);
      // Debounced save
      saveToRedisRef.current(redisKey, computedValue);
    },
    [redisKey, value, ttl]
  );

  return [value, setRedisValue, isLoading];
}

// Hook for temporary storage (shorter TTL)
export function useTemporaryStorage<T>(
  key: string,
  initialValue: T,
  ttlMinutes: number = 60
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  return useRedisStorage(key, initialValue, {
    ttl: ttlMinutes * 60,
  });
}

// Hook for global storage (not user-scoped)
export function useGlobalStorage<T>(
  key: string,
  initialValue: T,
  ttlHours: number = 24
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  return useRedisStorage(key, initialValue, {
    ttl: ttlHours * 60 * 60,
    global: true,
  });
}