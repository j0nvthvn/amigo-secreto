import { errorText } from '@amigo/shared/errors';
import { ApiError } from '@amigo/shared/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Mensaje en español para cualquier error de la API o de red. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return errorText(error);
}

/** Carga datos cada vez que la pantalla gana el foco. */
export function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, refreshing, reload };
}
