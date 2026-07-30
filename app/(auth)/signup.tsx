import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, UserPlus, User, Calendar } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import DateTimePicker from '@react-native-community/datetimepicker';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

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
          <Text style={styles.confirmationTitle}>Account created</Text>
          <Text style={styles.confirmationText}>
            Your local account is ready. You can start discovering and exchanging books now.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start exploring books"
            style={styles.loginButton}
            onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.loginButtonText}>Start Exploring</Text>
          </TouchableOpacity>
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
          <View style={styles.inputContainer}>
            <User size={20} color={colors.surface} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="First name"
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor={colors.surface}
              value={formData.firstName}
              onChangeText={(text) =>
                setFormData({ ...formData, firstName: text })
              }
            />
          </View>
          {errors.firstName && (
            <Text style={styles.errorText}>{errors.firstName}</Text>
          )}

          <View style={styles.inputContainer}>
            <User size={20} color={colors.surface} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="Last name"
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor={colors.surface}
              value={formData.lastName}
              onChangeText={(text) =>
                setFormData({ ...formData, lastName: text })
              }
            />
          </View>
          {errors.lastName && (
            <Text style={styles.errorText}>{errors.lastName}</Text>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.surface} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="Email address"
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.surface}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
          </View>
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.surface} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="Password"
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.surface}
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <View style={styles.inputContainer}>
            <Lock size={20} color={colors.surface} style={styles.inputIcon} />
            <TextInput
              accessibilityLabel="Confirm password"
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.surface}
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              secureTextEntry
            />
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          {Platform.OS === 'web' ? (
            <View style={styles.inputContainer}>
              <Calendar size={20} color={colors.surface} style={styles.inputIcon} />
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
                <Calendar size={20} color={colors.surface} style={styles.inputIcon} />
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

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create account"
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <UserPlus size={20} color={colors.text} />
                <Text style={styles.buttonText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

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
    padding: 20,
  },
  headerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 37, 57, 0.7)',
  },
  title: {
    fontSize: fontSizes[32],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes[18],
    color: colors.text,
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.background,
    fontSize: fontSizes[16],
  },
  webDateInput: {
    flex: 1,
    borderWidth: 0,
    fontSize: fontSizes[16],
    color: colors.background,
    fontFamily: 'inherit',
  },
  dateText: {
    flex: 1,
    color: colors.background,
    fontSize: fontSizes[16],
  },
  errorText: {
    color: colors.primary,
    fontSize: fontSizes[12],
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.text,
    fontSize: fontSizes[14],
  },
  footerLink: {
    color: colors.primary,
    fontSize: fontSizes[14],
    fontWeight: '600',
    marginLeft: 4,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationTitle: {
    fontSize: fontSizes[24],
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: fontSizes[16],
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  loginButtonText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
  },
});
