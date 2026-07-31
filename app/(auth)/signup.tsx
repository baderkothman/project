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
import { Mail, Lock, UserPlus, User, Calendar } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { colors, spacing, radius, type, fontSizes } from '@/src/presentation/theme/tokens';
import { Button, Card, Input, Stamp } from '@/src/presentation/components/ui';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthdate: Date;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  birthdate?: string;
}

export default function SignUpScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: new Date(),
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    const today = new Date();
    const age = today.getFullYear() - formData.birthdate.getFullYear();
    if (age < 13) {
      newErrors.birthdate = 'You must be at least 13 years old';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});

      const { error } = await dataClient.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthdate: formData.birthdate.toISOString(),
          },
        },
      });

      if (error) throw error;

      setShowConfirmation(true);
    } catch (err: any) {
      setErrors({
        email: err.message || 'An error occurred during sign up',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web, the event itself contains the date value
      const webDate = event.target.value ? new Date(event.target.value) : null;
      if (webDate) {
        setFormData({ ...formData, birthdate: webDate });
      }
    } else {
      // For native platforms
      setShowDatePicker(false);
      if (selectedDate) {
        setFormData({ ...formData, birthdate: selectedDate });
      }
    }
  };

  if (showConfirmation) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationContainer}>
          <Stamp tone="bookplate" style={styles.confirmationStamp}>
            Account Created
          </Stamp>
          <Text style={styles.confirmationTitle}>Account created</Text>
          <Text style={styles.confirmationText}>
            Your local account is ready. You can start discovering and exchanging books now.
          </Text>
          <Button
            label="Start Exploring"
            onPress={() => router.replace('/(tabs)')}
            accessibilityLabel="Start exploring books"
            style={styles.loginButton}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.pexels.com/photos/1481627/pexels-photo-1481627.jpeg?w=400&q=80' }}
            style={styles.headerImage}
          />
          <View style={styles.overlay} />
          <Text style={styles.title}>Join Our Library</Text>
          <Text style={styles.subtitle}>Create your reading account</Text>
        </View>

        <View style={styles.form}>
          <Card style={styles.formCard}>
            <View>
              <Input
                accessibilityLabel="First name"
                icon={<User size={20} color={colors.textMuted} />}
                placeholder="First Name"
                value={formData.firstName}
                onChangeText={(text) =>
                  setFormData({ ...formData, firstName: text })
                }
              />
              {errors.firstName && (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              )}
            </View>

            <View>
              <Input
                accessibilityLabel="Last name"
                icon={<User size={20} color={colors.textMuted} />}
                placeholder="Last Name"
                value={formData.lastName}
                onChangeText={(text) =>
                  setFormData({ ...formData, lastName: text })
                }
              />
              {errors.lastName && (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              )}
            </View>

            <View>
              <Input
                accessibilityLabel="Email address"
                icon={<Mail size={20} color={colors.textMuted} />}
                placeholder="Email Address"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View>
              <Input
                accessibilityLabel="Password"
                icon={<Lock size={20} color={colors.textMuted} />}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry
                autoComplete="new-password"
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            <View>
              <Input
                accessibilityLabel="Confirm password"
                icon={<Lock size={20} color={colors.textMuted} />}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
                secureTextEntry
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            <View>
              {Platform.OS === 'web' ? (
                <View style={styles.inputContainer}>
                  <Calendar size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <input
                    type="date"
                    value={formData.birthdate.toISOString().split('T')[0]}
                    onChange={handleDateChange}
                    style={styles.webDateInput}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Birthdate, ${formData.birthdate.toLocaleDateString()}`}
                    style={styles.inputContainer}
                    onPress={() => setShowDatePicker(true)}>
                    <Calendar size={20} color={colors.textMuted} style={styles.inputIcon} />
                    <Text style={styles.dateText}>
                      {formData.birthdate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={formData.birthdate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
              {errors.birthdate && (
                <Text style={styles.errorText}>{errors.birthdate}</Text>
              )}
            </View>
          </Card>

          <Button
            label="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            icon={<UserPlus size={20} color={colors.onPrimary} />}
            accessibilityLabel="Create account"
            style={styles.submitButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in">
              <Link href="/login">
                <Text style={styles.footerLink}> Sign In</Text>
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
    height: 200,
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
  formCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    gap: spacing.xs,
  },
  inputIcon: {},
  webDateInput: {
    flex: 1,
    borderWidth: 0,
    fontSize: fontSizes[16],
    color: colors.text,
    fontFamily: 'inherit',
  },
  dateText: {
    flex: 1,
    ...type.body,
    color: colors.text,
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    marginTop: spacing.xxs,
    marginLeft: spacing.xxs,
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
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmationStamp: {
    marginBottom: spacing.md,
  },
  confirmationTitle: {
    ...type.title,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  confirmationText: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.xs,
  },
});
