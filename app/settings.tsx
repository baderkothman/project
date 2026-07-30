import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
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
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const deleteAccount = async () => {
    try {
      setDeleting(true);
      setError(null);
      const { error: deleteError } = await dataClient.auth.deleteAccount();
      if (deleteError) throw deleteError;
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete your account? This permanently removes your profile, books, and messages. This cannot be undone.')) {
        void deleteAccount();
      }
      return;
    }
    Alert.alert(
      'Delete Account',
      'This permanently removes your profile, books, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );
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
          <Icon size={24} color={item.disabled ? colors.disabled : colors.primary} />
          <Text style={[
            styles.itemLabel,
            item.disabled && styles.itemLabelDisabled
          ]}>
            {item.label}
          </Text>
        </View>

        <View style={styles.itemRight}>
          <ChevronRight size={20} color={colors.disabled} />
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
          <ArrowLeft size={24} color={colors.text} />
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
            <LogOut size={24} color={colors.text} />
            <Text style={styles.logoutText}>
              {loading ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        )}

        {!isGuest && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={[styles.deleteButton, deleting && styles.logoutButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Trash2 size={24} color={colors.danger} />
            <Text style={styles.deleteText}>
              {deleting ? 'Deleting account...' : 'Delete Account'}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes[20],
    fontWeight: 'bold',
    color: colors.text,
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
    fontSize: fontSizes[16],
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: fontSizes[16],
    color: colors.text,
    marginLeft: 12,
  },
  itemLabelDisabled: {
    color: colors.disabled,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: fontSizes[14],
    color: colors.text,
    opacity: 0.8,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  deleteText: {
    color: colors.danger,
    fontSize: fontSizes[16],
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  errorText: {
    color: colors.background,
    fontSize: fontSizes[14],
    textAlign: 'center',
  },
});
