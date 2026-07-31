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
import { colors, radius, spacing, type } from '@/src/presentation/theme/tokens';
import { Button, Card, ScreenHeader } from '@/src/presentation/components/ui';

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
            <ScreenHeader title={section.title} />
            <Card style={styles.sectionContent}>
              {section.items.map(renderItem)}
            </Card>
          </View>
        ))}

        {!isGuest && (
          <Button
            label={loading ? 'Signing out...' : 'Sign Out'}
            onPress={handleLogout}
            loading={loading}
            disabled={loading}
            variant="secondary"
            icon={<LogOut size={20} color={colors.text} />}
            accessibilityLabel="Sign out"
            style={styles.logoutButton}
          />
        )}

        {!isGuest && (
          <Button
            label={deleting ? 'Deleting account...' : 'Delete Account'}
            onPress={handleDeleteAccount}
            loading={deleting}
            disabled={deleting}
            variant="ghost"
            icon={<Trash2 size={20} color={colors.danger} />}
            accessibilityLabel="Delete account"
            style={styles.deleteButton}
          />
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
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    ...type.heading,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionContent: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    ...type.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  itemLabelDisabled: {
    color: colors.disabled,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  deleteButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
  },
  errorText: {
    ...type.caption,
    color: colors.onDark,
    textAlign: 'center',
  },
});
