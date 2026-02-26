import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/Config';

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
  totalAmount: number;
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

// Helper to get auth token from stored user data
const getAuthToken = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.token || null;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

// Helper to get user type
const getUserType = async (): Promise<string | null> => {
  try {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || user.userType || null;
    }
  } catch (error) {
    console.error('Error getting user type:', error);
  }
  return null;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const userType = await getUserType();
      // Office users see ALL orders, customers see only their own
      const endpoint = (userType === 'office') ? `${API_URL}/orders/all` : `${API_URL}/orders/my-orders`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to load orders:', response.status);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const createOrder = async (
    customerEmail: string,
    customerName: string,
    items: OrderItem[],
    total: number
  ): Promise<string> => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ customerEmail, customerName, items, totalAmount: total }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create order');
    }

    const newOrder: Order = await response.json();
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder.id;
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update order');
    }

    const updatedOrder: Order = await response.json();
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...updatedOrder, id: updatedOrder.id } : order))
    );
  };

  const acceptOrder = async (orderId: string) => {
    await updateStatus(orderId, 'processing');
  };

  const rejectOrder = async (orderId: string) => {
    await updateStatus(orderId, 'rejected');
  };

  const completeOrder = async (orderId: string) => {
    await updateStatus(orderId, 'completed');
  };

  const getPendingOrders = () => {
    return orders.filter((order) => order.status === 'pending');
  };

  const getProcessingOrders = () => {
    return orders.filter((order) => order.status === 'processing');
  };

  const getOrderCount = () => {
    return orders.filter((order) => order.status === 'pending').length;
  };

  const getCustomerOrders = (customerEmail: string) => {
    return orders.filter((order) => order.customerEmail === customerEmail);
  };

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
