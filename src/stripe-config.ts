export const STRIPE_PRODUCTS = {
  plan1: {
    priceId: 'price_1RLU43DIUy62knTTF1fi5B8b',
    name: 'Basic Plan',
    description: 'Add free browsing, offline access, exclusive access for clubs, generating quotes',
    mode: 'subscription' as const,
    price: 4.99,
  },
  plan2: {
    priceId: 'price_1RLUHKDIUy62knTTlok3mIr8',
    name: 'Pro Plan',
    description: 'Add free browsing, offline access, exclusive access for clubs, generating quotes',
    mode: 'subscription' as const,
    price: 13.99,
  },
  plan3: {
    priceId: 'price_1RLUHtDIUy62knTTaQDRkEhD',
    name: 'Enterprise Plan',
    description: 'Add free browsing, offline access, exclusive access for clubs, generating quotes',
    mode: 'subscription' as const,
    price: 44.99,
  },
} as const;