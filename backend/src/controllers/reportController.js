const { db } = require('../config/db');

async function getDashboardReports(req, res) {
  try {
    // 1. Fetch all completed orders
    const ordersSnapshot = await db.collection('orders').get();
    const orders = [];
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      // Ensure we only process paid or completed orders for financial metrics
      if (order.payment_status === 'paid' && order.status !== 'cancelled') {
        orders.push(order);
      }
    });

    // 2. Fetch all members
    const usersSnapshot = await db.collection('users').get();
    const members = [];
    usersSnapshot.forEach(doc => {
      const u = doc.data();
      if (u.role === 'customer') {
        members.push({ id: doc.id, ...u });
      }
    });

    // Sort orders by date for time-series calculations
    orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Initialize metrics
    let totalSales = 0;
    const salesByDate = {}; // Daily sales
    const salesByMonth = {}; // Monthly sales
    const salesByWeek = {}; // Weekly sales
    const hourlyDistribution = Array(24).fill(0); // 0-23 hours
    const productSales = {}; // Product best seller
    const customerAggregates = {}; // Customer stats
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    let loyaltyOrderCount = 0;
    let loyaltySalesVolume = 0;

    // Process orders
    orders.forEach(order => {
      const dateStr = order.created_at.split('T')[0]; // YYYY-MM-DD
      const dateObj = new Date(order.created_at);
      const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate week of year
      const oneJan = new Date(dateObj.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((dateObj - oneJan) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((dateObj.getDay() + 1 + numberOfDays) / 7);
      const weekStr = `${dateObj.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

      const price = parseFloat(order.total_price) || 0;
      totalSales += price;

      // Group sales by time periods
      salesByDate[dateStr] = (salesByDate[dateStr] || 0) + price;
      salesByMonth[monthStr] = (salesByMonth[monthStr] || 0) + price;
      salesByWeek[weekStr] = (salesByWeek[weekStr] || 0) + price;

      // Group by hour
      const hour = dateObj.getHours();
      hourlyDistribution[hour] += 1;

      // Group by product
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          // Skip if product name or id is missing
          const pId = item.product_id || 'unknown';
          const pName = item.name || 'Produk Lain';
          const qty = parseInt(item.quantity) || 1;
          
          if (!productSales[pId]) {
            productSales[pId] = { name: pName, quantity: 0, revenue: 0 };
          }
          productSales[pId].quantity += qty;
          productSales[pId].revenue += (parseFloat(item.price_per_unit) || 0) * qty;
        });
      }

      // Group by member/customer
      if (order.customer_id) {
        loyaltyOrderCount += 1;
        loyaltySalesVolume += price;
        totalPointsEarned += order.points_earned || 0;
        totalPointsRedeemed += order.points_redeemed || 0;

        if (!customerAggregates[order.customer_id]) {
          customerAggregates[order.customer_id] = {
            name: order.customer_name || 'Member',
            visits: 0,
            totalSpend: 0
          };
        }
        customerAggregates[order.customer_id].visits += 1;
        customerAggregates[order.customer_id].totalSpend += price;
      }
    });

    // 3. Format Sales Charts Data
    // Daily sales chart (last 30 days)
    const dailySalesChart = Object.keys(salesByDate)
      .slice(-30)
      .map(date => ({ date, sales: salesByDate[date] }));

    // Monthly sales chart
    const monthlySalesChart = Object.keys(salesByMonth).map(month => ({
      month,
      sales: salesByMonth[month]
    }));

    // Weekly sales chart
    const weeklySalesChart = Object.keys(salesByWeek).map(week => ({
      week,
      sales: salesByWeek[week]
    }));

    // Hourly peak distribution
    const hourlyPeakChart = hourlyDistribution.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      visits: count
    }));

    // Best-selling products (top 5)
    const bestSellers = Object.keys(productSales)
      .map(pId => ({
        id: pId,
        name: productSales[pId].name,
        quantity: productSales[pId].quantity,
        revenue: productSales[pId].revenue
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Active member metrics
    const memberCount = members.length;
    
    // Member Visit Frequency: Average visits of active members who ordered
    const memberVisitCounts = Object.values(customerAggregates).map(c => c.visits);
    const averageMemberVisits = memberVisitCounts.length > 0 
      ? parseFloat((memberVisitCounts.reduce((a, b) => a + b, 0) / memberCount).toFixed(2)) 
      : 0;

    // Top spending members (top 5)
    const topSpendingMembers = Object.keys(customerAggregates)
      .map(id => ({
        id,
        name: customerAggregates[id].name,
        visits: customerAggregates[id].visits,
        totalSpend: customerAggregates[id].totalSpend
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);

    // Loyalty efficacy metrics
    const loyaltyEfficacy = {
      totalPointsEarned,
      totalPointsRedeemed,
      pointsRedeemedRatio: totalPointsEarned > 0 ? parseFloat(((totalPointsRedeemed / totalPointsEarned) * 100).toFixed(2)) : 0,
      memberSalesRatio: totalSales > 0 ? parseFloat(((loyaltySalesVolume / totalSales) * 100).toFixed(2)) : 0,
      loyaltySalesVolume,
      guestSalesVolume: totalSales - loyaltySalesVolume,
      loyaltyOrdersPercent: orders.length > 0 ? parseFloat(((loyaltyOrderCount / orders.length) * 100).toFixed(2)) : 0
    };

    // Calculate current stats (today, this week, this month)
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = salesByDate[todayStr] || 0;

    return res.status(200).json({
      summary: {
        totalRevenue: totalSales,
        totalOrders: orders.length,
        todaySales,
        activeMembers: memberCount,
        averageMemberVisits
      },
      charts: {
        dailySales: dailySalesChart,
        weeklySales: weeklySalesChart,
        monthlySales: monthlySalesChart,
        hourlyPeak: hourlyPeakChart,
        bestSellers,
        topSpendingMembers
      },
      loyaltyEfficacy
    });

  } catch (err) {
    console.error('Get reports error:', err);
    return res.status(500).json({ error: 'Failed to generate dashboard reports' });
  }
}

// ========================================
// SALES REPORTS — 9 report types
// ========================================
async function getSalesReports(req, res) {
  const { type, startDate, endDate } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Report type is required' });
  }

  try {
    // Fetch all paid orders
    const ordersSnapshot = await db.collection('orders').get();
    let orders = [];
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.payment_status === 'paid' && order.status !== 'cancelled') {
        orders.push(order);
      }
    });

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      orders = orders.filter(o => new Date(o.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      orders = orders.filter(o => new Date(o.created_at) <= end);
    }

    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch products and categories for category-based reports
    const productsSnapshot = await db.collection('products').get();
    const productsMap = {};
    productsSnapshot.forEach(doc => {
      productsMap[doc.id] = doc.data();
    });

    const categoriesSnapshot = await db.collection('categories').get();
    const categoriesMap = {};
    categoriesSnapshot.forEach(doc => {
      categoriesMap[doc.id] = doc.data();
    });

    let result = [];

    switch (type) {
      // ---- 1. Sales Recapitulation Detail Report ----
      case 'recapitulation_detail': {
        result = orders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          date: o.created_at,
          customer_name: o.customer_name || 'Guest/Umum',
          items_summary: (o.items || []).map(i => `${i.name} x${i.quantity}`).join(', '),
          item_count: (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0),
          payment_method: o.payment_method === 'online_qris' ? 'QRIS' : 'Kasir',
          total_price: o.total_price,
          points_earned: o.points_earned || 0,
          points_redeemed: o.points_redeemed || 0,
          notes: o.notes || '-'
        }));
        break;
      }

      // ---- 2. Daily Sales Summary Report ----
      case 'daily_summary': {
        const byDate = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          if (!byDate[dateStr]) {
            byDate[dateStr] = { date: dateStr, total_transactions: 0, total_revenue: 0, total_items: 0 };
          }
          byDate[dateStr].total_transactions += 1;
          byDate[dateStr].total_revenue += o.total_price || 0;
          byDate[dateStr].total_items += (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
        });
        result = Object.values(byDate)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(d => ({
            ...d,
            average_order_value: d.total_transactions > 0 ? Math.round(d.total_revenue / d.total_transactions) : 0
          }));
        break;
      }

      // ---- 3. Sales Payment Summary Report ----
      case 'payment_summary': {
        const byMethod = {};
        orders.forEach(o => {
          const method = o.payment_method === 'online_qris' ? 'QRIS' : 'Kasir';
          if (!byMethod[method]) {
            byMethod[method] = { payment_method: method, total_transactions: 0, total_revenue: 0 };
          }
          byMethod[method].total_transactions += 1;
          byMethod[method].total_revenue += o.total_price || 0;
        });
        const totalTrx = orders.length;
        const totalRev = orders.reduce((s, o) => s + (o.total_price || 0), 0);
        result = Object.values(byMethod).map(m => ({
          ...m,
          transaction_percentage: totalTrx > 0 ? parseFloat(((m.total_transactions / totalTrx) * 100).toFixed(1)) : 0,
          revenue_percentage: totalRev > 0 ? parseFloat(((m.total_revenue / totalRev) * 100).toFixed(1)) : 0
        }));
        break;
      }

      // ---- 4. Daily Sales Payment Recapitulation Report ----
      case 'daily_payment': {
        const byDateMethod = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          if (!byDateMethod[dateStr]) {
            byDateMethod[dateStr] = { date: dateStr, qris_count: 0, qris_revenue: 0, cashier_count: 0, cashier_revenue: 0, total_revenue: 0 };
          }
          if (o.payment_method === 'online_qris') {
            byDateMethod[dateStr].qris_count += 1;
            byDateMethod[dateStr].qris_revenue += o.total_price || 0;
          } else {
            byDateMethod[dateStr].cashier_count += 1;
            byDateMethod[dateStr].cashier_revenue += o.total_price || 0;
          }
          byDateMethod[dateStr].total_revenue += o.total_price || 0;
        });
        result = Object.values(byDateMethod).sort((a, b) => b.date.localeCompare(a.date));
        break;
      }

      // ---- 5. Daily Sales Menu Per Detail Category Report ----
      case 'daily_menu_category': {
        const byCatDate = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          (o.items || []).forEach(item => {
            const prod = productsMap[item.product_id];
            const catId = prod ? prod.category_id : 'unknown';
            const catName = categoriesMap[catId] ? categoriesMap[catId].name : 'Lainnya';
            const key = `${dateStr}_${catId}`;
            if (!byCatDate[key]) {
              byCatDate[key] = { date: dateStr, category: catName, total_qty: 0, total_revenue: 0 };
            }
            byCatDate[key].total_qty += item.quantity || 1;
            byCatDate[key].total_revenue += (item.price_per_unit || 0) * (item.quantity || 1);
          });
        });
        result = Object.values(byCatDate).sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category));
        break;
      }

      // ---- 6. Daily Sales Menu Report ----
      case 'daily_menu': {
        const byMenuDate = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          (o.items || []).forEach(item => {
            const key = `${dateStr}_${item.product_id}`;
            if (!byMenuDate[key]) {
              byMenuDate[key] = { date: dateStr, product_name: item.name, total_qty: 0, total_revenue: 0 };
            }
            byMenuDate[key].total_qty += item.quantity || 1;
            byMenuDate[key].total_revenue += (item.price_per_unit || 0) * (item.quantity || 1);
          });
        });
        result = Object.values(byMenuDate).sort((a, b) => b.date.localeCompare(a.date) || b.total_qty - a.total_qty);
        break;
      }

      // ---- 7. Sales Menu Recapitulation By Time Report ----
      case 'menu_by_time': {
        const byMenuHour = {};
        orders.forEach(o => {
          const hour = new Date(o.created_at).getHours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          (o.items || []).forEach(item => {
            const key = `${hourLabel}_${item.product_id}`;
            if (!byMenuHour[key]) {
              byMenuHour[key] = { hour: hourLabel, product_name: item.name, total_qty: 0, total_revenue: 0 };
            }
            byMenuHour[key].total_qty += item.quantity || 1;
            byMenuHour[key].total_revenue += (item.price_per_unit || 0) * (item.quantity || 1);
          });
        });
        result = Object.values(byMenuHour).sort((a, b) => a.hour.localeCompare(b.hour) || b.total_qty - a.total_qty);
        break;
      }

      // ---- 8. Average Sales Menu Recapitulation By Time Report ----
      case 'avg_menu_by_time': {
        // Calculate the number of unique days in the dataset
        const uniqueDays = new Set(orders.map(o => o.created_at.split('T')[0]));
        const dayCount = uniqueDays.size || 1;

        const byMenuHourAvg = {};
        orders.forEach(o => {
          const hour = new Date(o.created_at).getHours();
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          (o.items || []).forEach(item => {
            const key = `${hourLabel}_${item.product_id}`;
            if (!byMenuHourAvg[key]) {
              byMenuHourAvg[key] = { hour: hourLabel, product_name: item.name, total_qty: 0, total_revenue: 0 };
            }
            byMenuHourAvg[key].total_qty += item.quantity || 1;
            byMenuHourAvg[key].total_revenue += (item.price_per_unit || 0) * (item.quantity || 1);
          });
        });
        result = Object.values(byMenuHourAvg)
          .map(r => ({
            hour: r.hour,
            product_name: r.product_name,
            avg_qty_per_day: parseFloat((r.total_qty / dayCount).toFixed(2)),
            avg_revenue_per_day: Math.round(r.total_revenue / dayCount),
            total_qty: r.total_qty,
            total_revenue: r.total_revenue
          }))
          .sort((a, b) => a.hour.localeCompare(b.hour) || b.avg_qty_per_day - a.avg_qty_per_day);
        break;
      }

      // ---- 9. Sales Average Spending (AOV) Report ----
      case 'average_spending': {
        // Daily AOV
        const dailyAov = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          if (!dailyAov[dateStr]) {
            dailyAov[dateStr] = { count: 0, revenue: 0 };
          }
          dailyAov[dateStr].count += 1;
          dailyAov[dateStr].revenue += o.total_price || 0;
        });
        const dailyData = Object.entries(dailyAov)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, val]) => ({
            period: date,
            period_type: 'Harian',
            total_transactions: val.count,
            total_revenue: val.revenue,
            average_order_value: val.count > 0 ? Math.round(val.revenue / val.count) : 0
          }));

        // Weekly AOV
        const weeklyAov = {};
        orders.forEach(o => {
          const d = new Date(o.created_at);
          const oneJan = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((d - oneJan) / (24 * 60 * 60 * 1000) + oneJan.getDay() + 1) / 7);
          const weekKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          if (!weeklyAov[weekKey]) {
            weeklyAov[weekKey] = { count: 0, revenue: 0 };
          }
          weeklyAov[weekKey].count += 1;
          weeklyAov[weekKey].revenue += o.total_price || 0;
        });
        const weeklyData = Object.entries(weeklyAov)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([period, val]) => ({
            period,
            period_type: 'Mingguan',
            total_transactions: val.count,
            total_revenue: val.revenue,
            average_order_value: val.count > 0 ? Math.round(val.revenue / val.count) : 0
          }));

        // Monthly AOV
        const monthlyAov = {};
        orders.forEach(o => {
          const d = new Date(o.created_at);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyAov[monthKey]) {
            monthlyAov[monthKey] = { count: 0, revenue: 0 };
          }
          monthlyAov[monthKey].count += 1;
          monthlyAov[monthKey].revenue += o.total_price || 0;
        });
        const monthlyData = Object.entries(monthlyAov)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([period, val]) => ({
            period,
            period_type: 'Bulanan',
            total_transactions: val.count,
            total_revenue: val.revenue,
            average_order_value: val.count > 0 ? Math.round(val.revenue / val.count) : 0
          }));

        result = [...monthlyData, ...weeklyData, ...dailyData];
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown report type: ${type}` });
    }

    return res.status(200).json({ type, count: result.length, data: result });

  } catch (err) {
    console.error('getSalesReports error:', err);
    return res.status(500).json({ error: 'Failed to generate sales report' });
  }
}

// ========================================
// POS REPORTS — 4 report types
// ========================================
async function getPosReports(req, res) {
  const { type, startDate, endDate } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Report type is required' });
  }

  try {
    const ordersSnapshot = await db.collection('orders').get();
    let orders = [];
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.payment_status === 'paid' && order.status !== 'cancelled') {
        orders.push(order);
      }
    });

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      orders = orders.filter(o => new Date(o.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      orders = orders.filter(o => new Date(o.created_at) <= end);
    }

    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch users for staff reports
    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      usersMap[doc.id] = doc.data();
    });

    let result = [];

    switch (type) {
      // ---- 1. Staff Daily Sales Report ----
      case 'staff_daily': {
        const byStaffDate = {};
        orders.forEach(o => {
          if (!o.cashier_id) return; // Skip non-cashier orders
          const dateStr = o.created_at.split('T')[0];
          const staffName = usersMap[o.cashier_id] ? usersMap[o.cashier_id].name : o.cashier_id;
          const key = `${dateStr}_${o.cashier_id}`;
          if (!byStaffDate[key]) {
            byStaffDate[key] = { date: dateStr, cashier_name: staffName, total_transactions: 0, total_revenue: 0, total_items: 0 };
          }
          byStaffDate[key].total_transactions += 1;
          byStaffDate[key].total_revenue += o.total_price || 0;
          byStaffDate[key].total_items += (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
        });
        result = Object.values(byStaffDate).sort((a, b) => b.date.localeCompare(a.date));
        break;
      }

      // ---- 2. Guest Comment Report ----
      case 'guest_comment': {
        // Order-level notes
        orders.forEach(o => {
          if (o.notes && o.notes.trim().length > 0) {
            result.push({
              date: o.created_at,
              order_number: o.order_number,
              customer_name: o.customer_name || 'Guest',
              source: 'Catatan Pesanan',
              comment: o.notes
            });
          }
          // Item-level notes
          (o.items || []).forEach(item => {
            if (item.notes && item.notes.trim().length > 0) {
              result.push({
                date: o.created_at,
                order_number: o.order_number,
                customer_name: o.customer_name || 'Guest',
                source: `Item: ${item.name}`,
                comment: item.notes
              });
            }
          });
        });
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      }

      // ---- 3. Monthly POS Report ----
      case 'monthly_pos': {
        const byMonth = {};
        orders.forEach(o => {
          const d = new Date(o.created_at);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = {
              period: monthKey,
              total_transactions: 0,
              total_revenue: 0,
              total_items: 0,
              qris_count: 0,
              qris_revenue: 0,
              cashier_count: 0,
              cashier_revenue: 0,
              member_orders: 0,
              guest_orders: 0,
              unique_days: new Set()
            };
          }
          byMonth[monthKey].total_transactions += 1;
          byMonth[monthKey].total_revenue += o.total_price || 0;
          byMonth[monthKey].total_items += (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
          byMonth[monthKey].unique_days.add(o.created_at.split('T')[0]);
          if (o.payment_method === 'online_qris') {
            byMonth[monthKey].qris_count += 1;
            byMonth[monthKey].qris_revenue += o.total_price || 0;
          } else {
            byMonth[monthKey].cashier_count += 1;
            byMonth[monthKey].cashier_revenue += o.total_price || 0;
          }
          if (o.customer_id) {
            byMonth[monthKey].member_orders += 1;
          } else {
            byMonth[monthKey].guest_orders += 1;
          }
        });
        result = Object.values(byMonth)
          .sort((a, b) => b.period.localeCompare(a.period))
          .map(m => ({
            period: m.period,
            total_transactions: m.total_transactions,
            total_revenue: m.total_revenue,
            total_items: m.total_items,
            active_days: m.unique_days.size,
            avg_daily_revenue: m.unique_days.size > 0 ? Math.round(m.total_revenue / m.unique_days.size) : 0,
            avg_order_value: m.total_transactions > 0 ? Math.round(m.total_revenue / m.total_transactions) : 0,
            qris_count: m.qris_count,
            qris_revenue: m.qris_revenue,
            cashier_count: m.cashier_count,
            cashier_revenue: m.cashier_revenue,
            member_orders: m.member_orders,
            guest_orders: m.guest_orders
          }));
        break;
      }

      // ---- 4. Daily POS Report ----
      case 'daily_pos': {
        const byDay = {};
        orders.forEach(o => {
          const dateStr = o.created_at.split('T')[0];
          const hour = new Date(o.created_at).getHours();
          if (!byDay[dateStr]) {
            byDay[dateStr] = {
              date: dateStr,
              total_transactions: 0,
              total_revenue: 0,
              total_items: 0,
              qris_count: 0,
              qris_revenue: 0,
              cashier_count: 0,
              cashier_revenue: 0,
              member_orders: 0,
              guest_orders: 0,
              peak_hour: null,
              hourly: {}
            };
          }
          byDay[dateStr].total_transactions += 1;
          byDay[dateStr].total_revenue += o.total_price || 0;
          byDay[dateStr].total_items += (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
          byDay[dateStr].hourly[hour] = (byDay[dateStr].hourly[hour] || 0) + 1;
          if (o.payment_method === 'online_qris') {
            byDay[dateStr].qris_count += 1;
            byDay[dateStr].qris_revenue += o.total_price || 0;
          } else {
            byDay[dateStr].cashier_count += 1;
            byDay[dateStr].cashier_revenue += o.total_price || 0;
          }
          if (o.customer_id) byDay[dateStr].member_orders += 1;
          else byDay[dateStr].guest_orders += 1;
        });
        result = Object.values(byDay)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(d => {
            // Find peak hour
            let peakHour = '-';
            let maxCount = 0;
            Object.entries(d.hourly).forEach(([h, c]) => {
              if (c > maxCount) { maxCount = c; peakHour = `${String(h).padStart(2, '0')}:00`; }
            });
            return {
              date: d.date,
              total_transactions: d.total_transactions,
              total_revenue: d.total_revenue,
              total_items: d.total_items,
              avg_order_value: d.total_transactions > 0 ? Math.round(d.total_revenue / d.total_transactions) : 0,
              qris_count: d.qris_count,
              qris_revenue: d.qris_revenue,
              cashier_count: d.cashier_count,
              cashier_revenue: d.cashier_revenue,
              member_orders: d.member_orders,
              guest_orders: d.guest_orders,
              peak_hour: peakHour
            };
          });
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown report type: ${type}` });
    }

    return res.status(200).json({ type, count: result.length, data: result });

  } catch (err) {
    console.error('getPosReports error:', err);
    return res.status(500).json({ error: 'Failed to generate POS report' });
  }
}

module.exports = {
  getDashboardReports,
  getSalesReports,
  getPosReports
};
