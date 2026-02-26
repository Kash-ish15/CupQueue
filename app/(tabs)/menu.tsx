import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, OrderItem } from '@/contexts/OrderContext';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: any; // Can be require() or URI string
  imageType: 'local' | 'remote';
  imageKey: string; // For storing in orders
}

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

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Coffee',
    price: 20,
    image: require('../view/coffee.jpg'),
    imageType: 'local',
    imageKey: 'coffee.jpg'
  },
  {
    id: '2',
    name: 'Tea',
    price: 20,
    image: require('../view/chai.jpg'),
    imageType: 'local',
    imageKey: 'chai.jpg'
  },
  {
    id: '3',
    name: 'Nimbu Pani',
    price: 15,
    image: require('../view/Lemonade.webp'),
    imageType: 'local',
    imageKey: 'Lemonade.webp'
  },
  {
    id: '4',
    name: 'Sandwich',
    price: 30,
    image: require('../view/Sanwich.jpg'),
    imageType: 'local',
    imageKey: 'Sanwich.jpg'
  },
  {
    id: '5',
    name: 'Egg Sandwich',
    price: 30,
    image: require('../view/EggSandwhich.webp'),
    imageType: 'local',
    imageKey: 'EggSandwhich.webp'
  },
];

export default function MenuScreen() {
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const { user, logout } = useAuth();
  const { createOrder } = useOrders();

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.item.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((cartItem) =>
          cartItem.item.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter((cartItem) => cartItem.item.id !== itemId);
    });
  };

  const getTotal = () => {
    return cart.reduce((total, cartItem) => {
      return total + cartItem.item.price * cartItem.quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please login to place an order');
      return;
    }

    const total = getTotal();
    const orderItems: OrderItem[] = cart.map((cartItem) => ({
      id: cartItem.item.id,
      name: cartItem.item.name,
      price: cartItem.item.price,
      quantity: cartItem.quantity,
      image: cartItem.item.imageKey || 'default.jpg', // Store image key for local images
    }));

    try {
      await createOrder(
        user.email,
        user.name || user.email,
        orderItems,
        total
      );

      Alert.alert(
        'Order Placed!',
        `Your order total is ₹${total}\n\nItems:\n${cart
          .map((item) => `${item.item.name} x${item.quantity} - ₹${item.item.price * item.quantity}`)
          .join('\n')}\n\nYour order has been sent to the Ram Bhiya.`,
        [{ text: 'OK', onPress: () => setCart([]) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const getQuantity = (itemId: string) => {
    const cartItem = cart.find((c) => c.item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item) => {
          const quantity = getQuantity(item.id);
          return (
            <View key={item.id} style={styles.menuItem}>
              <Image
                source={item.imageType === 'local' ? item.image : { uri: item.image }}
                style={styles.itemImage}
                contentFit="cover"
                transition={200}
                placeholderContentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
              {quantity === 0 ? (
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => addToCart(item)}
                >
                  <Text style={styles.orderButtonText}>Order</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => addToCart(item)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {cart.length > 0 && (
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart</Text>
            <Text style={styles.cartTotal}>Total: ₹{getTotal()}</Text>
          </View>
          <ScrollView style={styles.cartItems}>
            {cart.map((cartItem) => {
              const imageSource = cartItem.item.imageType === 'local'
                ? cartItem.item.image
                : { uri: cartItem.item.image };
              return (
                <View key={cartItem.item.id} style={styles.cartItem}>
                  <Image
                    source={imageSource}
                    style={styles.cartItemImage}
                    contentFit="cover"
                  />
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>
                      {cartItem.item.name} x{cartItem.quantity}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      ₹{cartItem.item.price * cartItem.quantity}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Place Order</Text>
          </TouchableOpacity>
        </View>
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
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  menuContainer: {
    flex: 1,
    padding: 15,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    backgroundColor: '#8B4513',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  quantityButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'center',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cartContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 15,
    maxHeight: 300,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  cartItems: {
    maxHeight: 150,
    marginBottom: 10,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  cartItemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemName: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
