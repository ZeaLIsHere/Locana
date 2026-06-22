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

module.exports = {
  getDashboardReports
};
