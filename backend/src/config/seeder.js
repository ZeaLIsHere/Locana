const bcrypt = require('bcryptjs');
const { db } = require('./db');

async function seedDatabase(onlyMenu = false) {
  console.log('Database Seeder: Starting seeding process...');

  // 1. Seed Categories
  const categories = [
    { id: 'cat-coffee', name: 'Coffee', slug: 'coffee' },
    { id: 'cat-non-coffee', name: 'Non-Coffee', slug: 'non-coffee' },
    { id: 'cat-food', name: 'Makanan Utama', slug: 'food' },
    { id: 'cat-pastry', name: 'Pastry & Cemilan', slug: 'pastry' }
  ];

  for (const cat of categories) {
    await db.collection('categories').doc(cat.id).set(cat);
  }
  console.log('Database Seeder: Seeded 4 categories');

  // 2. Seed Products
  const products = [
    // Coffee
    { id: 'prod-latte', category_id: 'cat-coffee', name: 'Cafe Latte', description: 'Kopi espresso premium dengan susu segar yang di-steam sempurna.', price: 28000, points_cost: 280, points_reward: 28, image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-aren', category_id: 'cat-coffee', name: 'Kopi Susu Aren Locana', description: 'Kopi susu khas Locana dengan pemanis gula aren alami pilihan.', price: 25000, points_cost: 250, points_reward: 25, image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-americano', category_id: 'cat-coffee', name: 'Americano', description: 'Dua shot espresso premium dengan air panas, seimbang dan kaya rasa.', price: 22000, points_cost: 220, points_reward: 22, image_url: 'https://images.unsplash.com/photo-1551046713-bc47f9987f09?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-espresso', category_id: 'cat-coffee', name: 'Espresso Single', description: 'Konsentrat kopi murni dari biji kopi arabika pilihan.', price: 18000, points_cost: 180, points_reward: 18, image_url: 'https://images.unsplash.com/photo-1510707513156-466d22c378f6?auto=format&fit=crop&q=80&w=600', is_available: true },
    
    // Non-Coffee
    { id: 'prod-matcha', category_id: 'cat-non-coffee', name: 'Matcha Latte', description: 'Teh hijau Jepang grade premium dipadukan dengan susu segar.', price: 30000, points_cost: 300, points_reward: 30, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-chocolate', category_id: 'cat-non-coffee', name: 'Chocolate Signature', description: 'Cokelat hitam premium pekat yang disajikan hangat atau dingin dengan susu.', price: 28000, points_cost: 280, points_reward: 28, image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-peachtea', category_id: 'cat-non-coffee', name: 'Iced Peach Tea', description: 'Teh hitam segar rasa buah persik manis dengan potongan buah asli.', price: 20000, points_cost: 200, points_reward: 20, image_url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&q=80&w=600', is_available: true },

    // Food
    { id: 'prod-nasgor', category_id: 'cat-food', name: 'Nasi Goreng Locana', description: 'Nasi goreng bumbu rempah khas Locana, disajikan dengan telur mata sapi dan kerupuk.', price: 35000, points_cost: 350, points_reward: 35, image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-mie', category_id: 'cat-food', name: 'Mie Goreng Jawa', description: 'Mie telur tebal digoreng khas Jawa dengan suwiran ayam, bakso, dan sayuran.', price: 30000, points_cost: 300, points_reward: 30, image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-geprek', category_id: 'cat-food', name: 'Ayam Geprek Sambal Korek', description: 'Nasi putih dengan ayam goreng tepung renyah yang dimemarkan bersama sambal bawang pedas.', price: 28000, points_cost: 280, points_reward: 28, image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=600', is_available: true },

    // Pastry
    { id: 'prod-croissant', category_id: 'cat-pastry', name: 'Croissant Butter', description: 'Roti croissant mentega Prancis klasik yang renyah di luar, lembut di dalam.', price: 25000, points_cost: 250, points_reward: 25, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-fries', category_id: 'cat-pastry', name: 'French Fries Extra Crispy', description: 'Kentang goreng renyah bumbu bawang garam gurih.', price: 20000, points_cost: 200, points_reward: 20, image_url: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=600', is_available: true },
    { id: 'prod-rotbak', category_id: 'cat-pastry', name: 'Roti Bakar Coklat Keju', description: 'Roti tawar tebal dipanggang dengan mentega, diberi taburan coklat meses dan keju cheddar melimpah.', price: 22000, points_cost: 220, points_reward: 22, image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&q=80&w=600', is_available: true }
  ];

  for (const prod of products) {
    await db.collection('products').doc(prod.id).set(prod);
  }
  console.log('Database Seeder: Seeded/Updated 12 products');

  if (onlyMenu) {
    console.log('Database Seeder: Products & categories sync completed successfully!');
    return;
  }

  // 3. Seed Users (Demo Accounts)
  const salt = bcrypt.genSaltSync(10);
  const users = [
    {
      id: 'user-owner',
      username: 'owner',
      email: 'owner@locana.com',
      password_hash: bcrypt.hashSync('owner123', salt),
      role: 'owner',
      name: 'Owner Locana',
      phone: '08111222333',
      loyalty_points: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-manager',
      username: 'manager',
      email: 'manager@locana.com',
      password_hash: bcrypt.hashSync('manager123', salt),
      role: 'manager',
      name: 'Manager Locana',
      phone: '08222333444',
      loyalty_points: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-cashier',
      username: 'cashier',
      email: 'cashier@locana.com',
      password_hash: bcrypt.hashSync('cashier123', salt),
      role: 'cashier',
      name: 'Kasir Locana',
      phone: '08333444555',
      loyalty_points: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-kitchen',
      username: 'kitchen',
      email: 'kitchen@locana.com',
      password_hash: bcrypt.hashSync('kitchen123', salt),
      role: 'kitchen',
      name: 'Dapur Locana',
      phone: '08444555666',
      loyalty_points: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'user-customer',
      username: 'customer',
      email: 'customer@locana.com',
      password_hash: bcrypt.hashSync('customer123', salt),
      role: 'customer',
      name: 'Andi Wijaya',
      phone: '08555666777',
      loyalty_points: 450, // customer has points
      created_at: new Date().toISOString()
    },
    {
      id: 'user-customer2',
      username: 'siti',
      email: 'siti@locana.com',
      password_hash: bcrypt.hashSync('customer123', salt),
      role: 'customer',
      name: 'Siti Rahma',
      phone: '08777888999',
      loyalty_points: 920, // customer has points
      created_at: new Date().toISOString()
    },
    {
      id: 'user-customer3',
      username: 'budi',
      email: 'budi@locana.com',
      password_hash: bcrypt.hashSync('customer123', salt),
      role: 'customer',
      name: 'Budi Santoso',
      phone: '08999000111',
      loyalty_points: 120, // customer has points
      created_at: new Date().toISOString()
    }
  ];

  for (const user of users) {
    await db.collection('users').doc(user.id).set(user);
  }
  console.log('Database Seeder: Seeded 7 users (including 5 demo roles)');

  // 4. Generate 90 days of historic transaction data for beautiful reports!
  console.log('Database Seeder: Generating 90 days of transaction data...');
  const orderCount = 280; // Total orders to generate
  const now = new Date();
  
  // Product pricing mapping for quick calculation
  const productPriceMap = {};
  products.forEach(p => {
    productPriceMap[p.id] = p;
  });

  const paymentMethods = ['online_qris', 'cashier'];
  const orderStatuses = ['completed'];
  const customers = [
    { id: 'user-customer', name: 'Andi Wijaya' },
    { id: 'user-customer2', name: 'Siti Rahma' },
    { id: 'user-customer3', name: 'Budi Santoso' },
    { id: null, name: 'Guest/Umum' } // Non-member checkout
  ];

  const generatedOrders = [];
  const generatedLoyaltyTx = [];

  for (let i = 0; i < orderCount; i++) {
    // Distribute date randomly over the last 90 days
    const daysAgo = Math.floor(Math.random() * 90);
    const orderDate = new Date();
    orderDate.setDate(now.getDate() - daysAgo);

    // Peak hours simulation:
    // 08:00 - 10:00 (Coffee Peak) - 25%
    // 12:00 - 14:00 (Lunch Peak) - 30%
    // 17:00 - 21:00 (Dinner Peak) - 35%
    // Other times - 10%
    let hour = 15;
    const randHour = Math.random();
    if (randHour < 0.25) {
      hour = 8 + Math.floor(Math.random() * 3); // 8, 9, 10
    } else if (randHour < 0.55) {
      hour = 12 + Math.floor(Math.random() * 3); // 12, 13, 14
    } else if (randHour < 0.90) {
      hour = 17 + Math.floor(Math.random() * 5); // 17, 18, 19, 20, 21
    } else {
      hour = 11 + Math.floor(Math.random() * 6); // 11, 15, 16
    }
    
    orderDate.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

    // Choose random customer
    const custIndex = Math.floor(Math.random() * customers.length);
    const customer = customers[custIndex];

    // Pick 1 to 4 items
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = [];
    let totalPrice = 0;
    let pointsEarned = 0;
    let pointsRedeemed = 0;

    const usedProductIds = new Set();
    for (let j = 0; j < itemCount; j++) {
      let p;
      // Get unique product in order
      do {
        p = products[Math.floor(Math.random() * products.length)];
      } while (usedProductIds.has(p.id));
      usedProductIds.add(p.id);

      const qty = 1 + Math.floor(Math.random() * 2);
      
      // Determine if redeemed by points (only for members, 10% chance and if they have points cost)
      const isRedeemed = customer.id && Math.random() < 0.08;
      
      if (isRedeemed) {
        pointsRedeemed += p.points_cost * qty;
        items.push({
          product_id: p.id,
          name: p.name,
          quantity: qty,
          price_per_unit: 0,
          notes: Math.random() < 0.3 ? 'Tukar poin' : '',
          is_redeemed_by_points: true
        });
      } else {
        totalPrice += p.price * qty;
        pointsEarned += p.points_reward * qty;
        items.push({
          product_id: p.id,
          name: p.name,
          quantity: qty,
          price_per_unit: p.price,
          notes: Math.random() < 0.2 ? 'Es sedikit' : (Math.random() < 0.2 ? 'Kurang manis' : ''),
          is_redeemed_by_points: false
        });
      }
    }

    if (totalPrice === 0 && pointsRedeemed === 0) {
      // Fallback
      const p = products[0];
      totalPrice = p.price;
      pointsEarned = p.points_reward;
      items.push({
        product_id: p.id,
        name: p.name,
        quantity: 1,
        price_per_unit: p.price,
        notes: '',
        is_redeemed_by_points: false
      });
    }

    const payMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const codeDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
    const orderId = `ord-${orderDate.getTime()}-${i}`;

    const orderDoc = {
      id: orderId,
      order_number: `LOC${codeDigits.substring(0, 5)}`,
      customer_id: customer.id,
      customer_name: customer.name,
      cashier_id: payMethod === 'cashier' ? 'user-cashier' : null,
      status: 'completed',
      payment_method: payMethod,
      payment_status: 'paid',
      total_price: totalPrice,
      points_earned: pointsEarned,
      points_redeemed: pointsRedeemed,
      notes: Math.random() < 0.15 ? 'Takeaway' : '',
      created_at: orderDate.toISOString(),
      items: items
    };

    generatedOrders.push(orderDoc);

    // Loyalty logs
    if (customer.id) {
      if (pointsEarned > 0) {
        generatedLoyaltyTx.push({
          id: `loy-${orderId}-earn`,
          customer_id: customer.id,
          order_id: orderId,
          points: pointsEarned,
          transaction_type: 'earn',
          created_at: orderDate.toISOString()
        });
      }
      if (pointsRedeemed > 0) {
        generatedLoyaltyTx.push({
          id: `loy-${orderId}-redeem`,
          customer_id: customer.id,
          order_id: orderId,
          points: -pointsRedeemed,
          transaction_type: 'redeem',
          created_at: orderDate.toISOString()
        });
      }
    }
  }

  // Batch insert orders
  for (const o of generatedOrders) {
    await db.collection('orders').doc(o.id).set(o);
  }
  
  // Batch insert loyalty transactions
  for (const l of generatedLoyaltyTx) {
    await db.collection('loyalty_transactions').doc(l.id).set(l);
  }

  console.log(`Database Seeder: Successfully generated ${generatedOrders.length} historical orders`);
  console.log(`Database Seeder: Successfully generated ${generatedLoyaltyTx.length} loyalty point transactions`);
  console.log('Database Seeder: Seeding completed successfully!');
}

module.exports = seedDatabase;

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database Seeder failed:', err);
      process.exit(1);
    });
}
