const { db } = require('../config/db');
const QRCode = require('qrcode');
const { ZipArchive } = require('archiver');

async function getTables(req, res) {
  try {
    const snapshot = await db.collection('tables').get();
    const tables = [];
    snapshot.forEach(doc => tables.push({ id: doc.id, ...doc.data() }));
    tables.sort((a, b) => a.number - b.number);
    return res.status(200).json(tables);
  } catch (err) {
    console.error('Get tables error:', err);
    return res.status(500).json({ error: 'Failed to fetch tables' });
  }
}

async function createTable(req, res) {
  const { number, label } = req.body;
  if (!number || !label) {
    return res.status(400).json({ error: 'number and label are required' });
  }

  const parsedNumber = parseInt(number);
  if (isNaN(parsedNumber) || parsedNumber < 1) {
    return res.status(400).json({ error: 'number must be a positive integer' });
  }

  try {
    // Check for duplicate table number
    const existing = await db.collection('tables').where('number', '==', parsedNumber).get();
    if (!existing.empty) {
      return res.status(400).json({ error: `Meja nomor ${number} sudah ada` });
    }

    const id = `tbl-${Date.now()}`;
    const newTable = {
      id,
      number: parsedNumber,
      label: label.trim(),
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: req.user?.uid || null
    };

    await db.collection('tables').doc(id).set(newTable);
    return res.status(201).json(newTable);
  } catch (err) {
    console.error('Create table error:', err);
    return res.status(500).json({ error: 'Failed to create table' });
  }
}

async function updateTable(req, res) {
  const { id } = req.params;
  const { label, is_active } = req.body;

  try {
    const ref = db.collection('tables').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updates = {};
    if (label !== undefined) updates.label = label.trim();
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    await ref.update(updates);
    return res.status(200).json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error('Update table error:', err);
    return res.status(500).json({ error: 'Failed to update table' });
  }
}

async function deleteTable(req, res) {
  const { id } = req.params;

  try {
    const doc = await db.collection('tables').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Block delete if there are active orders for this table
    const activeOrdersSnap = await db.collection('orders')
      .where('table_id', '==', id)
      .get();

    const activeOrders = [];
    activeOrdersSnap.forEach(d => {
      const o = d.data();
      if (['pending_payment', 'preparing'].includes(o.status)) {
        activeOrders.push(o);
      }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        error: 'Ada pesanan aktif di meja ini, selesaikan dulu sebelum menghapus.'
      });
    }

    await db.collection('tables').doc(id).delete();
    return res.status(200).json({ message: 'Table deleted successfully' });
  } catch (err) {
    console.error('Delete table error:', err);
    return res.status(500).json({ error: 'Failed to delete table' });
  }
}

async function exportQRCodes(req, res) {
  try {
    const snapshot = await db.collection('tables').where('is_active', '==', true).get();
    const tables = [];
    snapshot.forEach(doc => tables.push({ id: doc.id, ...doc.data() }));
    tables.sort((a, b) => a.number - b.number);

    if (tables.length === 0) {
      return res.status(400).json({ error: 'Tidak ada meja aktif untuk di-export' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="locana-qr-tables.zip"');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', err => {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to generate QR codes' });
    });
    archive.pipe(res);

    const baseUrl = process.env.FRONTEND_URL || 'https://locana.app';

    for (const table of tables) {
      const url = `${baseUrl}/table/${table.number}`;
      const pngBuffer = await QRCode.toBuffer(url, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' }
      });
      archive.append(pngBuffer, { name: `meja-${table.number}.png` });
    }

    await archive.finalize();
  } catch (err) {
    console.error('QR export error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate QR codes' });
    }
    archive.destroy(err);
  }
}

module.exports = { getTables, createTable, updateTable, deleteTable, exportQRCodes };
