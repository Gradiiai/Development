import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { performanceMonitor } from '@/lib/logger';

// Hook for debouncing values to prevent excessive API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttling function calls
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRan = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - (now - lastRan.current));
      }
    }) as T,
    [callback, delay]
  );
}

// Hook for memoizing expensive calculations
export function useExpensiveCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList,
  operationName?: string
): T {
  return useMemo(() => {
    if (operationName) {
      return performanceMonitor.measure(operationName, calculation);
    }
    return calculation();
  }, dependencies);
}

// Hook for optimized event handlers
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, dependencies);
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options, hasIntersected]);

  return { isIntersecting, hasIntersected };
}

// Hook for managing async operations with cleanup
export function useAsyncOperation<T>() {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: false, error: null });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (asyncFn: (signal: AbortSignal) => Promise<T>) => {
    // Cancel previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setState({ data: null, loading: true, error: null });

    try {
      const result = await asyncFn(signal);
      if (!signal.aborted) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (error) {
      if (!signal.aborted) {
        setState({ data: null, loading: false, error: error as Error });
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { ...state, execute, cancel };
}

// Hook for local storage with SSR safety - now uses Redis backend
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Import Redis storage hook dynamically to avoid SSR issues
  const { useRedisStorage } = require('../hooks/useRedisStorage');
  
  // Use Redis storage with a reasonable TTL
  const [value, setValue, isLoading] = useRedisStorage(key, initialValue, {
    ttl: 7 * 24 * 60 * 60, // 7 days TTL
  });

  // Return loading state as the initial value while Redis is loading
  return [isLoading ? initialValue : value, setValue];
}

// Hook for window size with debouncing
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({ width: undefined, height: undefined });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}