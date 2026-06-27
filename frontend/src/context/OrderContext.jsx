import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const { token, user } = useAuth();
  
  // Menu State
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  // Cart State
  const [cart, setCart] = useState([]);
  
  // Real-time Orders State (for Cashier / Kitchen / Manager)
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch Categories and Products
  const fetchMenu = async () => {
    setLoadingMenu(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products')
      ]);

      if (catRes.ok && prodRes.ok) {
        const cats = await catRes.json();
        const prods = await prodRes.json();
        setCategories(cats);
        setProducts(prods);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Fetch all orders (Cashier/Kitchen/Manager only)
  const fetchOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Setup Server-Sent Events (SSE) for Real-time Updates
  useEffect(() => {
    // We open SSE connection for everyone, but it is especially used by Cashier, Kitchen, and Customer
    console.log('SSE: Establishing real-time event stream connection...');
    const eventSource = new EventSource('/api/realtime');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('SSE Event Received:', payload.type, payload.data);

        if (payload.type === 'NEW_ORDER') {
          // Prepend new order to list if user is staff
          setOrders(prev => {
            // Check if order already exists to avoid duplicates
            if (prev.some(o => o.id === payload.data.id)) return prev;
            return [payload.data, ...prev];
          });
        } else if (payload.type === 'ORDER_UPDATED') {
          // Update order in place
          setOrders(prev => prev.map(o => o.id === payload.data.id ? payload.data : o));
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Connection error, retrying...', err);
    };

    return () => {
      console.log('SSE: Closing connection');
      eventSource.close();
    };
  }, []);

  // Fetch initial menu on mount
  useEffect(() => {
    fetchMenu();
  }, []);

  // Fetch orders when token (login state) changes
  useEffect(() => {
    if (token && ['owner', 'manager', 'cashier', 'kitchen'].includes(user?.role)) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [token, user]);

  // Cart Functions
  const addToCart = (product, quantity = 1, notes = '', isRedeemedByPoints = false) => {
    setCart(prevCart => {
      // Find if item already exists with same criteria (same product, same redemption status, same notes)
      const existingItemIndex = prevCart.findIndex(item => 
        item.product_id === product.id && 
        item.is_redeemed_by_points === isRedeemedByPoints && 
        item.notes.trim().toLowerCase() === notes.trim().toLowerCase()
      );

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      } else {
        return [...prevCart, {
          product_id: product.id,
          name: product.name,
          image_url: product.image_url,
          quantity,
          price_per_unit: isRedeemedByPoints ? 0 : product.price,
          points_cost: product.points_cost || 0,
          points_reward: product.points_reward || 0,
          notes,
          is_redeemed_by_points: isRedeemedByPoints
        }];
      }
    });
  };

  const removeFromCart = (productId, isRedeemedByPoints, notes) => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.product_id === productId && 
        item.is_redeemed_by_points === isRedeemedByPoints && 
        item.notes.trim().toLowerCase() === notes.trim().toLowerCase())
    ));
  };

  const updateCartQty = (productId, isRedeemedByPoints, notes, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId, isRedeemedByPoints, notes);
      return;
    }
    setCart(prevCart => prevCart.map(item => {
      if (item.product_id === productId && 
          item.is_redeemed_by_points === isRedeemedByPoints && 
          item.notes.trim().toLowerCase() === notes.trim().toLowerCase()) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculate realtime totals
  const getCartTotals = () => {
    let totalPrice = 0;
    let totalPointsCost = 0;
    let totalItemsCount = 0;

    cart.forEach(item => {
      totalItemsCount += item.quantity;
      if (item.is_redeemed_by_points) {
        totalPointsCost += item.points_cost * item.quantity;
      } else {
        totalPrice += item.price_per_unit * item.quantity;
      }
    });

    let multiplier = 1.0;
    if (user && user.role === 'customer') {
      if (user.membership_tier === 'Platinum') multiplier = 1.5;
      else if (user.membership_tier === 'Gold') multiplier = 1.2;
    }
    const totalPointsEarned = Math.floor(totalPrice / 25000) * multiplier;

    return {
      totalPrice,
      totalPointsCost,
      totalPointsEarned,
      totalItemsCount
    };
  };

  // Place order
  const checkout = async (paymentMethod, customNotes = '') => {
    const { totalPointsCost } = getCartTotals();
    
    // Safety check for points
    if (user && totalPointsCost > (user.loyalty_points || 0)) {
      throw new Error(`Poin loyalitas Anda tidak cukup. Anda membutuhkan ${totalPointsCost} poin.`);
    }

    const payload = {
      customer_id: user?.role === 'customer' ? user.id : null,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes,
        is_redeemed_by_points: item.is_redeemed_by_points
      })),
      payment_method: paymentMethod,
      notes: customNotes
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan pemesanan');
      }

      // If checkout is successful, empty the cart
      clearCart();
      return data;
    } catch (err) {
      console.error('Checkout error:', err);
      throw err;
    }
  };

  // Process cashier payment (Cashier / Owner)
  const payOrder = async (orderId) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cashier_id: user.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses pembayaran');
      }

      return data.order;
    } catch (err) {
      console.error('Payment processing error:', err);
      throw err;
    }
  };

  // Update order status (Cashier/Kitchen/Owner)
  const updateStatus = async (orderId, newStatus) => {
    if (!token) return;
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate status pesanan');
      }

      return data.order;
    } catch (err) {
      console.error('Update status error:', err);
      throw err;
    }
  };

  return (
    <OrderContext.Provider value={{
      categories,
      products,
      loadingMenu,
      cart,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      getCartTotals,
      checkout,
      orders,
      loadingOrders,
      fetchOrders,
      payOrder,
      updateStatus,
      fetchMenu
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
