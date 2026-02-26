import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, Order } from '@/contexts/OrderContext';

// Image mapping for local images
const getLocalImage = (imageKey: string) => {
  const imageMap: { [key: string]: any } = {
    'coffee.jpg': require('../view/coffee.jpg'),
    'chai.jpg': require('../view/chai.jpg'),
    'Lemonade.webp': require('../view/Lemonade.webp'),
    'Sanwich.jpg': require('../view/Sanwich.jpg'),
    'EggSandwhich.webp': require('../view/EggSandwhich.webp'),
  };
  return imageMap[imageKey];
};

const isLocalImage = (imagePath: string): boolean => {
  return imagePath.endsWith('.jpg') || imagePath.endsWith('.webp') || imagePath.endsWith('.png');
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#ffc107';
    case 'processing':
      return '#17a2b8';
    case 'completed':
      return '#28a745';
    case 'rejected':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed ✓';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

export default function MyOrdersScreen() {
  const { user } = useAuth();
  const { getCustomerOrders, refreshOrders } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect office users away from this screen
    if (user && user.userType !== 'customer') {
      router.replace('/(tabs)/orders' as any);
      return;
    }

    refreshOrders();
    // Refresh orders from storage every 3 seconds
    const interval = setInterval(() => {
      refreshOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Derive orders directly from context so they always reflect latest state
  const orders = user?.email
    ? [...getCustomerOrders(user.email)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Your orders will appear here once you place them
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.ordersContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
                  <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => {
                  const imageSource = isLocalImage(item.image)
                    ? getLocalImage(item.image)
                    : { uri: item.image };
                  return (
                    <View key={index} style={styles.orderItem}>
                      <Image
                        source={imageSource}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>
                          Qty: {item.quantity} × ₹{item.price} = ₹{item.price * item.quantity}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  ordersContainer: {
    flex: 1,
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
});
