const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/mock_db.json');

// Helper to read and write database
function readDB() {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
    return {};
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('Error reading mock DB:', err);
    return {};
  }
}

function writeDB(data) {
  if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

class DocumentSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
    this.exists = data !== null && data !== undefined;
  }

  data() {
    return this._data;
  }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class DocumentReference {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
  }

  async get() {
    const dbData = readDB();
    const collection = dbData[this.collectionName] || {};
    const docData = collection[this.id];
    return new DocumentSnapshot(this.id, docData);
  }

  async set(data, options = {}) {
    const dbData = readDB();
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }
    
    let docData = data;
    if (options.merge) {
      const existing = dbData[this.collectionName][this.id] || {};
      docData = { ...existing, ...data };
    }
    
    dbData[this.collectionName][this.id] = docData;
    writeDB(dbData);
    return { id: this.id };
  }

  async update(data) {
    const dbData = readDB();
    if (!dbData[this.collectionName] || !dbData[this.collectionName][this.id]) {
      throw new Error(`Document ${this.id} not found in collection ${this.collectionName}`);
    }
    const existing = dbData[this.collectionName][this.id];
    dbData[this.collectionName][this.id] = { ...existing, ...data };
    writeDB(dbData);
    return { id: this.id };
  }

  async delete() {
    const dbData = readDB();
    if (dbData[this.collectionName] && dbData[this.collectionName][this.id]) {
      delete dbData[this.collectionName][this.id];
      writeDB(dbData);
    }
    return { id: this.id };
  }
}

class CollectionReference {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  doc(id) {
    const docId = id || Math.random().toString(36).substring(2, 10).toUpperCase();
    return new DocumentReference(this.collectionName, docId);
  }

  async add(data) {
    const docId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const docRef = this.doc(docId);
    await docRef.set(data);
    return docRef;
  }

  where(field, op, val) {
    return new Query(this.collectionName, [{ field, op, val }]);
  }

  async get() {
    return new Query(this.collectionName).get();
  }
}

class Query {
  constructor(collectionName, filters = []) {
    this.collectionName = collectionName;
    this.filters = filters;
  }

  where(field, op, val) {
    return new Query(this.collectionName, [...this.filters, { field, op, val }]);
  }

  async get() {
    const dbData = readDB();
    const collection = dbData[this.collectionName] || {};
    
    let docs = Object.keys(collection).map(id => {
      return new DocumentSnapshot(id, collection[id]);
    });

    // Apply filters
    for (const filter of this.filters) {
      const { field, op, val } = filter;
      docs = docs.filter(doc => {
        const docData = doc.data();
        if (!docData) return false;
        const actualVal = docData[field];
        
        switch (op) {
          case '==':
            return actualVal === val;
          case '!=':
            return actualVal !== val;
          case '>':
            return actualVal > val;
          case '>=':
            return actualVal >= val;
          case '<':
            return actualVal < val;
          case '<=':
            return actualVal <= val;
          case 'in':
            return Array.isArray(val) && val.includes(actualVal);
          case 'array-contains':
            return Array.isArray(actualVal) && actualVal.includes(val);
          default:
            return false;
        }
      });
    }

    return new QuerySnapshot(docs);
  }
}

class MockFirestore {
  collection(name) {
    return new CollectionReference(name);
  }
}

module.exports = {
  MockFirestore,
  readDB,
  writeDB
};
