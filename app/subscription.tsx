import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Check, ArrowLeft } from 'lucide-react-native';
import { useStripe } from '@/hooks/useStripe';
import React from 'react';

export const STRIPE_PRODUCTS = {
  plan2_monthly: {
    name: 'Monthly Plan',
    price: 4.99,
    billingPeriod: 'per month',
  },
  plan2_quarterly: {
    name: '3-Month Plan',
    price: 13.99,
    billingPeriod: 'every 3 months',
  },
  plan3: {
    name: 'Yearly Plan',
    price: 44.99,
    billingPeriod: 'per year',
  }
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { subscribe, loading } = useStripe();

  const PLAN_ID_MAP: Record<keyof typeof STRIPE_PRODUCTS, "plan1" | "plan2" | "plan3"> = {
      plan2_monthly: "plan1",
      plan2_quarterly: "plan2",
      plan3: "plan3",
  };
  
  const handleSubscribe = async (planId: keyof typeof STRIPE_PRODUCTS) => {
      await subscribe(PLAN_ID_MAP[planId]);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  const renderPlanFeatures = () => (
    <>
      <View style={styles.featureItem}>
        <Check size={20} color="#FA991C" />
        <Text style={styles.featureText}>Free browsing</Text>
      </View>
      <View style={styles.featureItem}>
        <Check size={20} color="#FA991C" />
        <Text style={styles.featureText}>Offline access</Text>
      </View>
      <View style={styles.featureItem}>
        <Check size={20} color="#FA991C" />
        <Text style={styles.featureText}>Exclusive access for clubs</Text>
      </View>
      <View style={styles.featureItem}>
        <Check size={20} color="#FA991C" />
        <Text style={styles.featureText}>Quote generation</Text>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#FBF3F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Choose Your Plan</Text>
        <Text style={styles.subheader}>Select the plan that best fits your needs</Text>

        {Object.entries(STRIPE_PRODUCTS).map(([planId, plan]) => (
          <View key={planId} style={styles.planCard}>
            <View style={styles.planHeader}>
              <CreditCard size={32} color="#FA991C" />
              <Text style={styles.planName}>{plan.name}</Text>
            </View>

            <Text style={styles.planPrice}>
              ${plan.price}
              <Text style={styles.perPeriod}> {plan.billingPeriod}</Text>
            </Text>

            <View style={styles.features}>
              {renderPlanFeatures()}
            </View>

            <TouchableOpacity
              style={[styles.subscribeButton, loading && styles.buttonDisabled]}
              onPress={() => handleSubscribe(planId as keyof typeof STRIPE_PRODUCTS)}
              disabled={loading}
            >
              <Text style={styles.subscribeButtonText}>
                {loading ? 'Processing...' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: '#032539',
    borderBottomWidth: 1,
    borderBottomColor: '#1C768F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C768F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBF3F2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#FBF3F2',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: '#1C768F',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  planPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FA991C',
    marginBottom: 24,
  },
  perPeriod: {
    fontSize: 16,
    color: '#FBF3F2',
    opacity: 0.8,
  },
  features: {
    marginBottom: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FBF3F2',
  },
  subscribeButton: {
    backgroundColor: '#FA991C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: '#FBF3F2',
    fontSize: 18,
    fontWeight: '600',
  },
});