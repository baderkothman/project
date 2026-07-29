import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import { STRIPE_PRODUCTS } from '@/src/shared/config/stripe-products';
import { API_URL } from '@/src/shared/config/environment';

interface UseStripeOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useStripe(options: UseStripeOptions = {}) {
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);

  const createCheckoutSession = async (priceId: string, mode: 'payment' | 'subscription') => {
    if (isGuest) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        await Linking.openURL(url);
      }

      options.onSuccess?.();
    } catch (err) {
      console.error('Error creating checkout session:', err);
      options.onError?.(err instanceof Error ? err : new Error('Failed to create checkout session'));
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (planId: keyof typeof STRIPE_PRODUCTS) => {
    const plan = STRIPE_PRODUCTS[planId];
    await createCheckoutSession(plan.priceId, plan.mode);
  };

  return {
    subscribe,
    loading,
  };
}
