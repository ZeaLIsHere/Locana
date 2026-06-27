const bcrypt = require('bcryptjs');
const { db } = require('./db');

async function seedDatabase(onlyMenu = false) {
  console.log('Database Seeder: Starting seeding process...');

  // 1. Seed Categories
  const categories = [
    { id: 'cat-barista-special', name: "BARISTA'S SPECIAL", slug: 'barista-special' },
    { id: 'cat-cold-brew', name: 'COLD BREW SERIES', slug: 'cold-brew' },
    { id: 'cat-espresso-bar', name: 'ESPRESSO BAR', slug: 'espresso-bar' },
    { id: 'cat-creation', name: 'CREATION SERIES', slug: 'creation' },
    { id: 'cat-bottle', name: 'BOTTLE SERIES', slug: 'bottle' },
    { id: 'cat-moctails', name: 'MOCTAILS SERIES', slug: 'moctails' },
    { id: 'cat-smoothies', name: 'SMOOTHIES LOVER', slug: 'smoothies' },
    { id: 'cat-tea', name: 'TEA LOVER', slug: 'tea' },
    { id: 'cat-refreshment', name: 'REFRESHMENT & JUICE', slug: 'refreshment' },
    { id: 'cat-addons', name: 'ADD ONS', slug: 'addons' },
    { id: 'cat-pastries', name: 'PASTRIES & CAKE', slug: 'pastries' },
    { id: 'cat-snack', name: 'SNACK LOVER', slug: 'snack' },
    { id: 'cat-gultik', name: 'MIE AYAM & GULTIK', slug: 'gultik' },
    { id: 'cat-kendil', name: 'KENDIL KELANA', slug: 'kendil' }
  ];

  for (const cat of categories) {
    await db.collection('categories').doc(cat.id).set(cat);
  }
  console.log('Database Seeder: Seeded 14 new categories');

  // 2. Seed Products
  const products = [
    // === BARISTA'S SPECIAL ===
    { id: 'prod-locana', category_id: 'cat-barista-special', name: 'Locana Coffee', description: 'Kopi susu signature Locana dengan racikan espreso, susu segar, dan gula aren pilihan.', price: 25000, points_cost: 250, image_url: '/data-menu/Locana.jpg', is_available: true },
    { id: 'prod-chocolate-pistachio', category_id: 'cat-barista-special', name: 'Chocolate Pistachio', description: 'Minuman cokelat premium pekat dipadukan sirup kacang pistachio gurih.', price: 30000, points_cost: 300, image_url: '/data-menu/Chocolate Pistaccio.jpg', is_available: true },
    { id: 'prod-kiss-of-rubina', category_id: 'cat-barista-special', name: 'Kiss Of Rubina', description: 'Mocktail soda buah berwarna merah delima rasa pomegranate segar.', price: 30000, points_cost: 300, image_url: '/data-menu/Kiss of Rubina.jpg', is_available: true },
    { id: 'prod-peanut-butter-cream-latte', category_id: 'cat-barista-special', name: 'Peanut Butter Cream Latte', description: 'Kopi susu latte dengan foam krim selai kacang gurih asin melimpah.', price: 30000, points_cost: 300, image_url: '/data-menu/Peanut Butter Cream Latte.jpg', is_available: true },
    { id: 'prod-white-mocha', category_id: 'cat-barista-special', name: 'White Mocha', description: 'Kopi espresso dengan sirup white chocolate premium dan susu segar hangat.', price: 25000, points_cost: 250, image_url: '/data-menu/White Mocha.jpg', is_available: true },

    // === COLD BREW SERIES ===
    { id: 'prod-apple-brew', category_id: 'cat-cold-brew', name: 'Apple Brew', description: 'Espresso dingin khas Locana yang dipadukan dengan sari apel manis segar.', price: 35000, points_cost: 350, image_url: '/data-menu/Apple Brew.jpg', is_available: true },
    { id: 'prod-mont-blanc', category_id: 'cat-cold-brew', name: 'Mont Blanc', description: 'Dessert manis krim kacang kastanye manis lembut disajikan dingin.', price: 35000, points_cost: 350, image_url: '/data-menu/Mont Blanc.jpg', is_available: true },
    { id: 'prod-papa-rumba', category_id: 'cat-cold-brew', name: 'Papa Rumba', description: 'Kopi mocktail beraroma rum manis kelapa yang creamy dan menyegarkan.', price: 30000, points_cost: 300, image_url: '/data-menu/Papa Rumba.jpg', is_available: true },
    { id: 'prod-the-guaranas', category_id: 'cat-cold-brew', name: 'The Guaranas', description: 'Mocktail soda dengan sari buah guarana tropis pemberi energi.', price: 30000, points_cost: 300, image_url: '/data-menu/The Guaranas.jpg', is_available: true },
    { id: 'prod-los-maria', category_id: 'cat-cold-brew', name: 'Los Maria', description: 'Racikan kopi susu beraroma citrus jeruk segar dan bunga melati lembut.', price: 30000, points_cost: 300, image_url: '/data-menu/Los Maria.jpg', is_available: true },

    // === ESPRESSO BAR ===
    { id: 'prod-black', category_id: 'cat-espresso-bar', name: 'Black Coffee', description: 'Kopi hitam espresso/americano klasik dari biji kopi arabika pilihan.', price: 20000, points_cost: 200, image_url: '/data-menu/Black.jpg', is_available: true },
    { id: 'prod-magic', category_id: 'cat-espresso-bar', name: 'Magic', description: 'Double ristretto dipadu susu steam hangat, menghasilkan cita rasa kopi yang intens.', price: 25000, points_cost: 250, image_url: '/data-menu/Magic.jpg', is_available: true },
    { id: 'prod-white', category_id: 'cat-espresso-bar', name: 'White Coffee', description: 'Flat white / caffe latte klasik dengan tekstur foam susu yang halus.', price: 25000, points_cost: 250, image_url: '/data-menu/White.jpg', is_available: true },

    // === CREATION SERIES ===
    { id: 'prod-berrycano', category_id: 'cat-creation', name: 'Berry Bee Cano', description: 'Double shot espresso arabika dengan sirup buah beri liar asam segar.', price: 27000, points_cost: 270, image_url: '/data-menu/Berrycano.jpg', is_available: true },
    { id: 'prod-burnt-butterscotch', category_id: 'cat-creation', name: 'Burnt Butterscotch', description: 'Espresso dengan susu segar dan sirup butterscotch manis gurih karamel bakar.', price: 38000, points_cost: 380, image_url: '/data-menu/Burnt Butterscotch.jpg', is_available: true },
    { id: 'prod-choco-mellow', category_id: 'cat-creation', name: 'Choco Mellow', description: 'Cokelat hitam premium disajikan dingin dengan marshmallow panggang lembut.', price: 35000, points_cost: 350, image_url: '/data-menu/Choco Mellow.jpg', is_available: true },
    { id: 'prod-crumble-scotch', category_id: 'cat-creation', name: 'Crumble Scotch', description: 'Kue tart biskuit renyah gurih manis sirup butterscotch caramel.', price: 38000, points_cost: 380, image_url: '/data-menu/Crumble Scotch.jpg', is_available: true },
    { id: 'prod-ichigo-matcha', category_id: 'cat-creation', name: 'Ichigo Matcha', description: 'Susu matcha latte Jepang dipadukan selai strawberry buah asli buatan rumah.', price: 38000, points_cost: 380, image_url: '/data-menu/Ichigo Matcha.jpg', is_available: true },
    { id: 'prod-marshmellow-matcha', category_id: 'cat-creation', name: 'Marshmellow Matcha', description: 'Matcha latte Jepang premium dengan topping marshmallow manis lumer.', price: 38000, points_cost: 380, image_url: '/data-menu/Marshmellow Matcha.jpg', is_available: true },
    { id: 'prod-matcha', category_id: 'cat-creation', name: 'Matcha', description: 'Matcha latte klasik Jepang racikan asli bertekstur kental susu.', price: 30000, points_cost: 300, image_url: '/data-menu/Matcha.jpg', is_available: true },

    // === MOCTAILS SERIES ===
    { id: 'prod-don-bosco', category_id: 'cat-moctails', name: 'Don Bosco', description: 'Kopi susu creamy premium signature dengan cita rasa hazelnut gurih.', price: 28000, points_cost: 280, image_url: '/data-menu/Don Bosco.jpg', is_available: true },

    // === SMOOTHIES LOVER ===
    { id: 'prod-mango', category_id: 'cat-smoothies', name: 'Mango', description: 'Minuman mangga smoothies creamy diblender tebal dengan yogurt.', price: 25000, points_cost: 250, image_url: '/data-menu/Mango Smoties.jpg', is_available: true },
    { id: 'prod-strawberry-jam', category_id: 'cat-smoothies', name: 'Strawberry Jam', description: 'Croissant panggang mentega bertabur selai buah strawberry manis segar.', price: 27000, points_cost: 270, image_url: '/data-menu/Strawberry Jam.jpg', is_available: true },

    // === TEA LOVER ===
    { id: 'prod-lemon-tea', category_id: 'cat-tea', name: 'Lemon Tea', description: 'Teh segar rasa lemon dengan potongan lemon asli.', price: 25000, points_cost: 250, image_url: '/data-menu/Lemon Tea.jpg', is_available: true },
    { id: 'prod-lychee-tea', category_id: 'cat-tea', name: 'Lychee Tea', description: 'Teh manis rasa buah leci segar dengan buah leci utuh.', price: 25000, points_cost: 250, image_url: '/data-menu/Lychee Tea.jpg', is_available: true },
    { id: 'prod-strawberry-tea', category_id: 'cat-tea', name: 'Strawberry Tea', description: 'Teh dingin rasa strawberry segar bertabur potongan strawberry buah asli.', price: 25000, points_cost: 250, image_url: '/data-menu/Strawberry Tea.jpg', is_available: true },
    { id: 'prod-thai-tea', category_id: 'cat-tea', name: 'Thai Tea', description: 'Teh susu khas Thailand berwarna jingga manis beraroma rempah teh pekat.', price: 25000, points_cost: 250, image_url: '/data-menu/Thai Tea.jpg', is_available: true },

    // === REFRESHMENT & JUICE ===
    { id: 'prod-es-somboy-kesturi', category_id: 'cat-refreshment', name: 'Es Somboy Kesturi', description: 'Jeruk kesturi peras berpadu manis asin manisan buah kiamboy.', price: 20000, points_cost: 200, image_url: '/data-menu/Es Somboy Kesturi.jpg', is_available: true },
    { id: 'prod-ice-grassjelly', category_id: 'cat-refreshment', name: 'Ice Grassjelly', description: 'Es susu cincau hitam serut manis dingin menyegarkan.', price: 20000, points_cost: 200, image_url: '/data-menu/Ice Grassjelly.jpg', is_available: true },
    { id: 'prod-es-limau', category_id: 'cat-refreshment', name: 'Limau', description: 'Es sari jeruk limau nipis segar peras asli asam manis.', price: 22000, points_cost: 220, image_url: '/data-menu/Es Limau.jpg', is_available: true },

    // === ADD ONS ===
    { id: 'prod-ice-tea-hot-tea', category_id: 'cat-addons', name: 'Ice / Hot Tea', description: 'Teh manis melati seduh klasik khas Locana (es/hangat).', price: 10000, points_cost: 100, image_url: '/data-menu/Ice Tea _ Hot Tea.jpg', is_available: true },
    { id: 'prod-air-mineral', category_id: 'cat-addons', name: 'Mineral Water 600ml', description: 'Air mineral kemasan botol dingin yang menyegarkan.', price: 10000, points_cost: 100, image_url: '/data-menu/Air Mineral.jpg', is_available: true },
    { id: 'prod-ice-cream-vanilla', category_id: 'cat-addons', name: 'Ice Cream', description: 'Es krim vanilla premium manis susu alami bertekstur sangat lembut.', price: 7000, points_cost: 70, image_url: '/data-menu/Ice Cream Vanilla.jpg', is_available: true },

    // === PASTRIES & CAKE ===
    { id: 'prod-mini-croissant-chocolate', category_id: 'cat-pastries', name: 'Mini Croissant Chocolate', description: 'Roti croissant mini isi pasta cokelat hitam manis lumer saat hangat.', price: 15000, points_cost: 150, image_url: '/data-menu/Mini Croissant Chocolate.jpg', is_available: true },
    { id: 'prod-mini-croissant-peanut', category_id: 'cat-pastries', name: 'Mini Croissant Peanut', description: 'Roti croissant mini dengan isian selai kacang gurih manis bertabur kacang.', price: 15000, points_cost: 150, image_url: '/data-menu/Mini Croissant Peanut.jpg', is_available: true },
    { id: 'prod-mini-croissant-plain', category_id: 'cat-pastries', name: 'Mini Croissant Plain', description: 'Roti croissant mini polos yang garing renyah dipanggang mentega.', price: 10000, points_cost: 100, image_url: '/data-menu/Mini Croissant Plain.jpg', is_available: true }
  ];

  for (const prod of products) {
    await db.collection('products').doc(prod.id).set(prod);
  }
  console.log('Database Seeder: Seeded/Updated 36 products matched to customer list');


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
      birthday: '1995-06-25', // H-2 (Active Birthday Discount)
      loyalty_points: 450,
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
      birthday: '1998-10-15', // Non-active
      loyalty_points: 920,
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
      birthday: '2000-06-27', // TODAY (Active Birthday Discount)
      loyalty_points: 120,
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

    // Pick 1 to 3 items
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = [];
    let totalPrice = 0;
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
      totalPrice += p.price * qty;
      items.push({
        product_id: p.id,
        name: p.name,
        quantity: qty,
        price_per_unit: p.price,
        notes: Math.random() < 0.2 ? 'Es sedikit' : (Math.random() < 0.2 ? 'Kurang manis' : ''),
        is_redeemed_by_points: false
      });
    }

    // Determine if redeemed a loyalty reward (only for members, 6% chance)
    if (customer.id && Math.random() < 0.06) {
      const randReward = Math.random();
      if (randReward < 0.4) {
        // Reward A: 25 Pts
        pointsRedeemed = 25;
        items.push({
          product_id: 'reward-25',
          name: 'Gratis Minuman Regular (Redeem 25 Poin)',
          quantity: 1,
          price_per_unit: 0,
          notes: 'Klaim Reward',
          is_redeemed_by_points: true
        });
      } else if (randReward < 0.8) {
        // Reward B: 50 Pts
        pointsRedeemed = 50;
        items.push({
          product_id: 'reward-50',
          name: 'Gratis Minuman + Croissant (Redeem 50 Poin)',
          quantity: 1,
          price_per_unit: 0,
          notes: 'Klaim Reward',
          is_redeemed_by_points: true
        });
      } else {
        // Reward C: 100 Pts
        pointsRedeemed = 100;
        items.push({
          product_id: 'reward-100',
          name: 'Gratis Minuman Signature 1L (Redeem 100 Poin)',
          quantity: 1,
          price_per_unit: 0,
          notes: 'Klaim Reward',
          is_redeemed_by_points: true
        });
      }
    }

    // Determine point multiplier based on customer tier
    // In seeder, Budi is Silver (1x), Andi is Gold (1.2x), Siti is Platinum (1.5x)
    let multiplier = 1.0;
    if (customer.id === 'user-customer') multiplier = 1.2; // Gold
    else if (customer.id === 'user-customer2') multiplier = 1.5; // Platinum

    // 1 point for every Rp25,000 spent
    const pointsEarned = customer.id ? Math.floor(totalPrice / 25000) * multiplier : 0;

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

  // Batch insert orders in parallel
  console.log(`Database Seeder: Uploading ${generatedOrders.length} orders to Cloud Firestore...`);
  await Promise.all(generatedOrders.map(o => db.collection('orders').doc(o.id).set(o)));
  
  // Batch insert loyalty transactions in parallel
  console.log(`Database Seeder: Uploading ${generatedLoyaltyTx.length} loyalty transactions to Cloud Firestore...`);
  await Promise.all(generatedLoyaltyTx.map(l => db.collection('loyalty_transactions').doc(l.id).set(l)));

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
