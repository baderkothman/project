import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { X } from 'lucide-react-native';
import React from 'react';

export default function CancelScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <X size={48} color="#FBF3F2" />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>
          Your payment was cancelled. No charges have been made to your account.
        </Text>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity style={styles.button}>
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
    backgroundColor: '#032539',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1C768F',
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
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBF3F2',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#FBF3F2',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
  },
  button: {
    backgroundColor: '#FA991C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
});