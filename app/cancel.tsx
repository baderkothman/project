import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { X } from 'lucide-react-native';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

export default function CancelScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <X size={48} color={colors.text} />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>
          Your payment was cancelled. No charges have been made to your account.
        </Text>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity style={styles.button} accessibilityRole="button" accessibilityLabel="Return to home">
            <Text style={styles.buttonText}>Return to Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: fontSizes[24],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSizes[16],
    color: colors.text,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
  },
});