import { Platform } from 'react-native';

export const BASE_URL = "http://172.21.100.137:5000";

// Use 10.0.2.2 for Android Emulator, localhost for iOS/Web
// For a physical device, replace with your computer's local IP address (e.g., 192.168.1.x)
export const API_URL = `${BASE_URL}/api`;