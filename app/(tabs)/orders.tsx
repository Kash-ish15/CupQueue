import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
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

export default function OrdersScreen() {
  const { user, logout } = useAuth();
  const { getPendingOrders, getProcessingOrders, acceptOrder, rejectOrder, completeOrder, getOrderCount, refreshOrders } = useOrders();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [processingOrders, setProcessingOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'processing'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect customers away from this screen
    if (user && user.userType !== 'office') {
      router.replace('/(tabs)/menu' as any);
      return;
    }

    loadOrders();
    // Refresh orders every 2 seconds to check for new ones
    const interval = setInterval(loadOrders, 2000);
    return () => clearInterval(interval);
  }, [user]);

  const loadOrders = () => {
    setPendingOrders(getPendingOrders());
    setProcessingOrders(getProcessingOrders());
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
    setRefreshing(false);
  };

  const handleAccept = async (orderId: string) => {
    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this order? It will move to processing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            await acceptOrder(orderId);
            // Refresh orders from storage
            await refreshOrders();
            Alert.alert('Success', 'Order is now being processed!');
          },
        },
      ]
    );
  };

  const handleComplete = async (orderId: string) => {
    Alert.alert(
      'Complete Order',
      'Mark this order as completed? The customer will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await completeOrder(orderId);
            // Refresh orders from storage
            await refreshOrders();
            Alert.alert('Success', 'Order marked as completed! Customer has been notified.');
          },
        },
      ]
    );
  };

  const handleReject = async (orderId: string) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await rejectOrder(orderId);
            // Refresh orders from storage
            await refreshOrders();
            Alert.alert('Order Rejected', 'The order has been rejected.');
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const orderCount = getOrderCount();
  const currentOrders = activeTab === 'pending' ? pendingOrders : processingOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Orders</Text>
          {activeTab === 'pending' && orderCount > 0 && (
            <Text style={styles.orderCount}>
              {orderCount} pending order{orderCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'processing' && styles.activeTab]}
          onPress={() => setActiveTab('processing')}
        >
          <Text style={[styles.tabText, activeTab === 'processing' && styles.activeTabText]}>
            Processing ({processingOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {currentOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {activeTab === 'pending' ? 'pending' : 'processing'} orders
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'pending'
              ? 'New orders will appear here when customers place them'
              : 'Accepted orders will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.ordersContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {currentOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                  <Text style={styles.customerEmail}>{order.customerEmail}</Text>
                  <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                </View>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
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

              <View style={styles.actionButtons}>
                {activeTab === 'pending' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(order.id)}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAccept(order.id)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleComplete(order.id)}
                  >
                    <Text style={styles.completeButtonText}>Mark as Done ✓</Text>
                  </TouchableOpacity>
                )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderCount: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#8B4513',
    fontWeight: 'bold',
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
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
  },
  totalContainer: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
  },
  acceptButton: {
    backgroundColor: '#8B4513',
  },
  completeButton: {
    backgroundColor: '#28a745',
    flex: 1,
  },
  rejectButtonText: {
    color: '#c33',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
