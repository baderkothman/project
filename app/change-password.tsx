import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate passwords
      if (!oldPassword || !newPassword || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // First verify the old password
      const { error: signInError } = await dataClient.auth.signInWithPassword({
        email: (await dataClient.auth.getUser()).data.user?.email || '',
        password: oldPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update the password
      const { error: updateError } = await dataClient.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Navigate back after successful password change
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };
    const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/settings');
    }
  };

   return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Change password</Text>
          <View style={styles.placeholder} />
        </View>

      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Password changed successfully! Redirecting...
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Lock size={20} color={colors.surface} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            placeholderTextColor={colors.surface}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!showOldPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowOldPassword(!showOldPassword)}
            accessibilityRole="button"
            accessibilityLabel={showOldPassword ? 'Hide current password' : 'Show current password'}
          >
            {showOldPassword ? (
              <EyeOff size={20} color={colors.surface} />
            ) : (
              <Eye size={20} color={colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color={colors.surface} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor={colors.surface}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowNewPassword(!showNewPassword)}
            accessibilityRole="button"
            accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
          >
            {showNewPassword ? (
              <EyeOff size={20} color={colors.surface} />
            ) : (
              <Eye size={20} color={colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color={colors.surface} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor={colors.surface}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            accessibilityRole="button"
            accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color={colors.surface} />
            ) : (
              <Eye size={20} color={colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Changing password' : 'Change password'}
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: colors.danger,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: colors.text,
    textAlign: 'center',
    fontSize: fontSizes[14],
  },
  successContainer: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: colors.text,
    textAlign: 'center',
    fontSize: fontSizes[14],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.background,
    fontSize: fontSizes[16],
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
  },
});