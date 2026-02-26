import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login' as any);
    } else if (user.userType === 'customer') {
      router.replace('/(tabs)/menu' as any);
    } else {
      // Office user - show orders screen
      router.replace('/(tabs)/orders' as any);
    }
  }, [user, isLoading, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#8B4513" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});