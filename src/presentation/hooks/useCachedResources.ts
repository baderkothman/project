import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

export function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        // Pre-load fonts
        await Font.loadAsync({
          'Inter-Regular': require('@expo-google-fonts/inter/Inter_400Regular.ttf'),
          'Inter-Medium': require('@expo-google-fonts/inter/Inter_500Medium.ttf'),
          'Inter-Bold': require('@expo-google-fonts/inter/Inter_700Bold.ttf'),
        });

        // Pre-load images
        await Asset.loadAsync([
          require('../../../assets/images/icon.png'),
          require('../../../assets/images/favicon.png'),
        ]);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoadingComplete(true);
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  return isLoadingComplete;
}
