import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const API_URL =
  configuredApiUrl ??
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'
    : 'http://127.0.0.1:4000');

export const WEBSOCKET_URL = API_URL.replace(/^http/, 'ws');

