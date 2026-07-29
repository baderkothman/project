import { useState, useEffect } from 'react';
import { Platform, Image } from 'react-native';

const imageCache = new Map<string, string>();

export function useImageCache(uri: string) {
  const [cachedUri, setCachedUri] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setCachedUri(uri);
      return;
    }

    const cached = imageCache.get(uri);
    if (cached) {
      setCachedUri(cached);
      return;
    }

    Image.prefetch(uri)
      .then(() => {
        imageCache.set(uri, uri);
        setCachedUri(uri);
      })
      .catch(console.error);
  }, [uri]);

  return cachedUri;
}