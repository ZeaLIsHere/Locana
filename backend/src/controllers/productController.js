const { db } = require('../config/db');

async function getCategories(req, res) {
  try {
    const snapshot = await db.collection('categories').get();
    const categories = [];
    snapshot.forEach(doc => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

async function getProducts(req, res) {
  const { category, search } = req.query;

  try {
    const snapshot = await db.collection('products').get();
    let products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    // Apply category filter if query exists
    if (category) {
      // Find category slug or ID
      products = products.filter(p => p.category_id === category);
    }

    // Apply search filter if query exists
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    return res.status(200).json(products);
  } catch (err) {
    console.error('Get products error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

async function createProduct(req, res) {
  const { category_id, name, description, price, points_cost, points_reward, image_url, is_available } = req.body;

  if (!category_id || !name || price === undefined) {
    return res.status(400).json({ error: 'Category ID, name, and price are required' });
  }

  try {
    // Generate unique ID
    const productId = 'prod-' + Date.now();
    const newProduct = {
      category_id,
      name,
      description: description || '',
      price: parseFloat(price),
      points_cost: parseInt(points_cost) || 0,
      points_reward: parseInt(points_reward) || 0,
      image_url: image_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600',
      is_available: is_available !== undefined ? is_available : true
    };

    await db.collection('products').doc(productId).set(newProduct);
    
    return res.status(201).json({
      message: 'Product created successfully',
      product: { id: productId, ...newProduct }
    });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

async function updateProduct(req, res) {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const productRef = db.collection('products').doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Clean and validate numeric values if updated
    const dataToUpdate = {};
    const allowedFields = ['category_id', 'name', 'description', 'price', 'points_cost', 'points_reward', 'image_url', 'is_available'];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'price') dataToUpdate[field] = parseFloat(updateData[field]);
        else if (field === 'points_cost' || field === 'points_reward') dataToUpdate[field] = parseInt(updateData[field]);
        else dataToUpdate[field] = updateData[field];
      }
    });

    await productRef.update(dataToUpdate);

    return res.status(200).json({
      message: 'Product updated successfully',
      id
    });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
}

async function deleteProduct(req, res) {
  const { id } = req.params;

  try {
    const productRef = db.collection('products').doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Instead of deleting from DB, let's mark it as unavailable to preserve order histories
    await productRef.update({ is_available: false });

    return res.status(200).json({
      message: 'Product soft-deleted/marked unavailable successfully'
    });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
}

module.exports = {
  getCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
