import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';
import { colors, spacing, radius, type } from '@/src/presentation/theme/tokens';
import { Button, Card, Input } from '@/src/presentation/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await dataClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user?.email_confirmed_at) {
        setError('Please verify your email before signing in');
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80' }}
            style={styles.headerImage}
          />
          <View style={styles.overlay} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue reading</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Card style={styles.formCard}>
            <Input
              accessibilityLabel="Email address"
              icon={<Mail size={20} color={colors.textMuted} />}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />

            <Input
              accessibilityLabel="Password"
              icon={<Lock size={20} color={colors.textMuted} />}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          </Card>

          <Button
            label={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            icon={<LogIn size={20} color={colors.onPrimary} />}
            accessibilityLabel="Sign in"
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign up">
              <Link href="/(auth)/signup">
                  <Text style={styles.footerLink}> Sign Up</Text>
              </Link>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 300,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  headerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  title: {
    ...type.title,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
  },
  form: {
    padding: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...type.label,
    color: colors.danger,
    textAlign: 'center',
  },
  formCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...type.caption,
    color: colors.textMuted,
  },
  footerLink: {
    ...type.label,
    color: colors.primary,
  },
});
