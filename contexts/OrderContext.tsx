import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export type OrderStatus = 'pending' | 'processing' | 'rejected' | 'completed';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

interface OrderContextType {
  orders: Order[];
  createOrder: (customerEmail: string, customerName: string, items: OrderItem[], total: number) => Promise<string>;
  acceptOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  getPendingOrders: () => Order[];
  getProcessingOrders: () => Order[];
  getOrderCount: () => number;
  getCustomerOrders: (customerEmail: string) => Order[];
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Configure notification handler for local notifications
// Note: Remote push notifications don't work in Expo Go, but local notifications do
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
    setupNotificationsForOfficeUsers();
  }, []);

  const setupNotificationsForOfficeUsers = async () => {
    // Request permissions for both office users and customers
    // Office users get notifications for new orders
    // Customers get notifications when orders are completed
    // Local notifications work in Expo Go (remote push notifications don't)
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      } else {
        console.log('Notification permissions granted - local notifications enabled');
      }
    } catch (error) {
      // Silently fail - notifications may not be available
      console.log('Could not request notification permissions:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const ordersData = await AsyncStorage.getItem('orders');
      if (ordersData) {
        setOrders(JSON.parse(ordersData));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const saveOrders = async (newOrders: Order[]) => {
    try {
      await AsyncStorage.setItem('orders', JSON.stringify(newOrders));
      setOrders(newOrders);
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  };

  const sendNotificationToOfficeUsers = async (title: string, body: string) => {
    try {
      // Check if current logged-in user is an office user
      // Only send notifications to office users
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Only send notification if current user is office user
        if (user.userType === 'office') {
          // Local notifications work in Expo Go
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: null, // Show immediately (local notification)
          });
        }
      }
    } catch (error) {
      // Silently fail - notifications are optional
      console.log('Could not send notification:', error);
    }
  };

  const sendNotificationToCustomer = async (customerEmail: string, title: string, body: string) => {
    if (!Notifications) return; // Skip if notifications not available
    
    try {
      // Check if current logged-in user is the customer
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Only send notification if current user is the customer
        if (user.userType === 'customer' && user.email === customerEmail) {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                sound: true,
              },
              trigger: null, // Show immediately
            });
          } catch (notifError) {
            // Notifications may not work in Expo Go - that's okay
            console.log('Notification not sent (may not be available in Expo Go)');
          }
        }
      }
    } catch (error) {
      // Silently fail - notifications are optional
      console.log('Notification not available');
    }
  };

  const createOrder = async (
    customerEmail: string,
    customerName: string,
    items: OrderItem[],
    total: number
  ): Promise<string> => {
    const newOrder: Order = {
      id: Date.now().toString(),
      customerEmail,
      customerName,
      items,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    await saveOrders(updatedOrders);

    // Send notification only to office users
    await sendNotificationToOfficeUsers(
      'New Order Received!',
      `${customerName} placed an order of ₹${total}`
    );

    return newOrder.id;
  };

  const acceptOrder = async (orderId: string) => {
    // Reload orders from storage to ensure we have the latest data
    const ordersData = await AsyncStorage.getItem('orders');
    const currentOrders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    
    const updatedOrders = currentOrders.map((order) =>
      order.id === orderId ? { ...order, status: 'processing' as OrderStatus } : order
    );
    await saveOrders(updatedOrders);
  };

  const completeOrder = async (orderId: string) => {
    // Reload orders from storage to ensure we have the latest data
    const ordersData = await AsyncStorage.getItem('orders');
    const currentOrders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    
    const order = currentOrders.find((o) => o.id === orderId);
    if (!order) return;

    const updatedOrders = currentOrders.map((o) =>
      o.id === orderId ? { ...o, status: 'completed' as OrderStatus } : o
    );
    await saveOrders(updatedOrders);

    // Notify customer that order is completed
    await sendNotificationToCustomer(
      order.customerEmail,
      'Order Completed! 🎉',
      `Your order of ₹${order.total} has been completed and is ready!`
    );
  };

  const rejectOrder = async (orderId: string) => {
    // Reload orders from storage to ensure we have the latest data
    const ordersData = await AsyncStorage.getItem('orders');
    const currentOrders: Order[] = ordersData ? JSON.parse(ordersData) : [];
    
    const updatedOrders = currentOrders.map((order) =>
      order.id === orderId ? { ...order, status: 'rejected' as OrderStatus } : order
    );
    await saveOrders(updatedOrders);
  };

  const getPendingOrders = () => {
    // Read from state, but also ensure we have latest data
    return orders.filter((order) => order.status === 'pending');
  };

  const getProcessingOrders = () => {
    // Read from state, but also ensure we have latest data
    return orders.filter((order) => order.status === 'processing');
  };

  const getOrderCount = () => {
    return orders.filter((order) => order.status === 'pending').length;
  };

  const getCustomerOrders = (customerEmail: string) => {
    return orders.filter((order) => order.customerEmail === customerEmail);
  };

  // Add a method to force refresh orders from storage
  const refreshOrders = async () => {
    await loadOrders();
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        createOrder,
        acceptOrder,
        rejectOrder,
        completeOrder,
        getPendingOrders,
        getProcessingOrders,
        getOrderCount,
        getCustomerOrders,
        refreshOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
