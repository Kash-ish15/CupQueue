import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserType = 'customer' | 'office';

export interface User {
  email: string;
  password: string;
  userType: UserType;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, userType: UserType, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeDefaultUsers();
    loadUser();
  }, []);

  const initializeDefaultUsers = async () => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        // Create default test users if no users exist
        const defaultUsers: User[] = [
          {
            email: 'customer@test.com',
            password: 'customer123',
            userType: 'customer',
            name: 'Test Customer',
          },
          {
            email: 'office@test.com',
            password: 'office123',
            userType: 'office',
            name: 'Test Office',
          },
        ];
        await AsyncStorage.setItem('users', JSON.stringify(defaultUsers));
      }
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        return false;
      }

      const users: User[] = JSON.parse(usersData);
      const foundUser = users.find(
        (u) => u.email === email && u.password === password
      );

      if (foundUser) {
        setUser(foundUser);
        await AsyncStorage.setItem('user', JSON.stringify(foundUser));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const signup = async (
    email: string,
    password: string,
    userType: UserType,
    name?: string
  ): Promise<boolean> => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: User[] = usersData ? JSON.parse(usersData) : [];

      // Check if user already exists
      if (users.some((u) => u.email === email)) {
        return false;
      }

      const newUser: User = {
        email,
        password,
        userType,
        name,
      };

      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));
      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Error during signup:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
