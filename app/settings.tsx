import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Lock, 
  CircleHelp as HelpCircle, 
  Info, 
  LogOut,
  CreditCard,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      await dataClient.auth.signOut();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: CreditCard,
          label: 'My Subscription',
          type: 'link',
          disabled: isGuest,
          onPress: () => router.push('/subscription'),
        },
        {
          icon: Lock,
          label: 'Change Password',
          type: 'link',
          disabled: isGuest,
          onPress: () => router.push('/change-password'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          type: 'link',
          onPress: () => router.push('/help'),
        },
        {
          icon: Info,
          label: 'About',
          type: 'link',
          onPress: () => router.push('/about'),
        },
      ],
    },
  ];

  const renderItem = (item: any) => {
    const Icon = item.icon;
    
    return (
      <TouchableOpacity
        key={item.label}
        style={[
          styles.item,
          item.disabled && styles.itemDisabled
        ]}
        disabled={item.disabled}
        onPress={item.onPress}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled: Boolean(item.disabled) }}
      >
        <View style={styles.itemLeft}>
          <Icon size={24} color={item.disabled ? '#666' : '#FA991C'} />
          <Text style={[
            styles.itemLabel,
            item.disabled && styles.itemLabelDisabled
          ]}>
            {item.label}
          </Text>
        </View>

        <View style={styles.itemRight}>
          <ChevronRight size={20} color="#666" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FBF3F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderItem)}
            </View>
          </View>
        ))}

        {!isGuest && (
          <TouchableOpacity 
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            disabled={loading}
          >
            <LogOut size={24} color="#FBF3F2" />
            <Text style={styles.logoutText}>
              {loading ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        )}
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FA991C',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: '#1C768F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#032539',
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 16,
    color: '#FBF3F2',
    marginLeft: 12,
  },
  itemLabelDisabled: {
    color: '#666',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.8,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FA991C',
    borderRadius: 8,
  },
  errorText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
  },
});
