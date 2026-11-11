import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// 1. Initialize Firebase Admin
let firestoreDb = null;
let firebaseApp = null;

export function getFirebaseCredentials() {
  // 1. Check if individual environment variables are provided
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  // 2. Check if full JSON string or base64 encoded string is in FIREBASE_SERVICE_ACCOUNT
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      return parsed;
    } catch (e) {
      console.warn('[Firebase] Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
  }

  // 3. Fallback to file path if exists
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.resolve('./brookshow-16c93-firebase-adminsdk-fbsvc-a913e811e7.json');
  if (fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  throw new Error('Firebase credentials not found. Please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.');
}

export function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;

  const credentials = getFirebaseCredentials();

  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      credential: cert(credentials)
    });
  } else {
    firebaseApp = getApps()[0];
  }

  firestoreDb = getFirestore(firebaseApp);
  return firestoreDb;
}

// 2. Collection Names Mapping
const MODEL_TO_COLLECTION = {
  User: 'users',
  Artist: 'artists',
  ArtistProfile: 'artistprofiles',
  BankDetail: 'bankdetails',
  Booking: 'bookings',
  CalendarBlock: 'calendarblocks',
  Category: 'categories',
  Commission: 'commissions',
  Contact: 'contacts',
  Event: 'events',
  HeroImage: 'heroimages',
  MediaItem: 'mediaitems',
  OtpVerification: 'otpverifications',
  Payment: 'payments',
  PlannerEmployee: 'planneremployees',
  PlannerProfile: 'plannerprofiles',
  PlatformSetting: 'platformsettings',
  Reminder: 'reminders',
  Review: 'reviews',
  Scan: 'scans',
  Service: 'services',
  Ticket: 'tickets',
  TicketType: 'tickettypes',
  WalletTransaction: 'wallettransactions',
  WithdrawalRequest: 'withdrawalrequests',
  AdminLog: 'adminlogs',
};

export function getCollectionName(modelName) {
  if (MODEL_TO_COLLECTION[modelName]) return MODEL_TO_COLLECTION[modelName];
  if (modelName.endsWith('y') && !modelName.endsWith('ey')) {
    return modelName.slice(0, -1).toLowerCase() + 'ies';
  }
  return modelName.toLowerCase() + 's';
}

// 3. Types.ObjectId Implementation
export class ObjectId {
  constructor(id) {
    if (id) {
      this.id = String(id);
    } else {
      this.id = crypto.randomBytes(12).toString('hex');
    }
  }

  toString() {
    return this.id;
  }

  toHexString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }

  valueOf() {
    return this.id;
  }

  equals(other) {
    if (!other) return false;
    const str = typeof other === 'string' ? other : (other.id || other.toString?.() || String(other));
    return this.id === str;
  }

  static isValid(id) {
    if (id === null || id === undefined) return false;
    if (typeof id === 'object' && id.toString) id = id.toString();
    if (typeof id !== 'string') return false;
    const trimmed = id.trim();
    if (!trimmed) return false;
    return /^[0-9a-fA-F]{24}$/.test(trimmed) || /^[A-Za-z0-9_-]{10,64}$/.test(trimmed);
  }
}

export function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

export const Types = {
  ObjectId,
};

// 4. Schema Helper
export class Schema {
  constructor(definition = {}, options = {}) {
    this.paths = {};
    this.options = options || {};
    this._preHooks = { save: [] };
    this._postHooks = { save: [] };
    this._initDefinition(definition);
  }

  _initDefinition(definition) {
    for (const [key, val] of Object.entries(definition)) {
      if (typeof val === 'function' || !val) {
        this.paths[key] = { type: val };
      } else if (Array.isArray(val)) {
        this.paths[key] = { type: Array, schema: val[0] };
      } else if (typeof val === 'object') {
        this.paths[key] = { ...val };
      }
    }
  }

  pre(event, fn) {
    if (!this._preHooks[event]) this._preHooks[event] = [];
    this._preHooks[event].push(fn);
    return this;
  }

  post(event, fn) {
    if (!this._postHooks[event]) this._postHooks[event] = [];
    this._postHooks[event].push(fn);
    return this;
  }

  index() {
    return this;
  }

  static get Types() {
    return {
      ObjectId,
      String,
      Number,
      Date,
      Boolean,
      Object,
      Array,
      Buffer,
      Mixed: Object
    };
  }
}

// 5. Utility: Nested property getter & setter
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  if (path === '_id' || path === 'id') return obj._id || obj.id;
  if (!path.includes('.')) return obj[path];
  const parts = path.split('.');
  let current = obj;
  for (const p of parts) {
    if (current == null) return undefined;
    current = current[p];
  }
  return current;
}

export function setNestedValue(obj, path, val) {
  if (!obj || !path) return;
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (current[p] == null || typeof current[p] !== 'object') {
      current[p] = {};
    }
    current = current[p];
  }
  current[parts[parts.length - 1]] = val;
}

// 6. Utility: Convert Firestore doc to JS Object
export function firestoreDocToData(docSnap) {
  if (!docSnap || !docSnap.exists) return null;
  const raw = docSnap.data();
  return sanitizeFromFirestore(raw, docSnap.id);
}

export function sanitizeFromFirestore(val, docId = null) {
  if (val === null || val === undefined) return val;

  // Firestore Timestamp to JS Date
  if (val instanceof Timestamp || (val._seconds !== undefined && val._nanoseconds !== undefined)) {
    return new Date(val._seconds * 1000 + Math.round((val._nanoseconds || 0) / 1000000));
  }

  if (Array.isArray(val)) {
    return val.map(item => sanitizeFromFirestore(item));
  }

  if (typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = sanitizeFromFirestore(v);
    }
    if (docId) {
      res._id = res._id || docId;
      res.id = res.id || docId;
    }
    return res;
  }

  return val;
}

export function sanitizeForFirestore(val) {
  if (val === undefined) return undefined;
  if (val === null) return null;

  if (val instanceof ObjectId) {
    return val.toString();
  }

  if (typeof val === 'object' && val._bsontype === 'ObjectID') {
    return val.toString();
  }

  if (val instanceof Date) {
    return val;
  }

  if (Buffer.isBuffer(val)) {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }

  if (typeof val === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(val)) {
      if (key.startsWith('$')) continue; // Skip Mongo update operators
      const cleanedVal = sanitizeForFirestore(value);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
      }
    }
    return cleaned;
  }

  return val;
}

// 7. Mongo Filter Matcher
export function matchQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, expected] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(expected) || !expected.some(sub => matchQuery(doc, sub))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(expected) || !expected.every(sub => matchQuery(doc, sub))) return false;
      continue;
    }

    const actual = getNestedValue(doc, key);

    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !(expected instanceof ObjectId) && !Array.isArray(expected) && !(expected instanceof RegExp)) {
      // Comparison operators
      let matches = true;
      for (const [op, opVal] of Object.entries(expected)) {
        if (op === '$eq') {
          if (!compareValues(actual, opVal, 'eq')) matches = false;
        } else if (op === '$ne') {
          if (!compareValues(actual, opVal, 'ne')) matches = false;
        } else if (op === '$in') {
          const list = Array.isArray(opVal) ? opVal.map(String) : [];
          const actStr = actual != null ? String(actual) : null;
          if (Array.isArray(actual)) {
            if (!actual.some(item => list.includes(String(item)))) matches = false;
          } else {
            if (!list.includes(actStr)) matches = false;
          }
        } else if (op === '$nin') {
          const list = Array.isArray(opVal) ? opVal.map(String) : [];
          const actStr = actual != null ? String(actual) : null;
          if (list.includes(actStr)) matches = false;
        } else if (op === '$gt') {
          if (!(toComparable(actual) > toComparable(opVal))) matches = false;
        } else if (op === '$gte') {
          if (!(toComparable(actual) >= toComparable(opVal))) matches = false;
        } else if (op === '$lt') {
          if (!(toComparable(actual) < toComparable(opVal))) matches = false;
        } else if (op === '$lte') {
          if (!(toComparable(actual) <= toComparable(opVal))) matches = false;
        } else if (op === '$exists') {
          const exists = actual !== undefined;
          if (exists !== Boolean(opVal)) matches = false;
        } else if (op === '$regex') {
          const pattern = opVal;
          const flags = expected.$options || '';
          const reg = new RegExp(pattern, flags);
          if (!reg.test(String(actual || ''))) matches = false;
        }
      }
      if (!matches) return false;
    } else if (expected instanceof RegExp) {
      if (!expected.test(String(actual || ''))) return false;
    } else {
      if (!compareValues(actual, expected, 'eq')) return false;
    }
  }

  return true;
}

function toComparable(val) {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string' && !isNaN(Date.parse(val)) && (val.includes('-') || val.includes(':'))) {
    const t = Date.parse(val);
    if (!isNaN(t)) return t;
  }
  return val;
}

function compareValues(a, b, op = 'eq') {
  if (op === 'ne') return !compareValues(a, b, 'eq');

  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (a instanceof ObjectId || b instanceof ObjectId) {
    return String(a) === String(b);
  }

  if (a instanceof Date || b instanceof Date) {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    return ta === tb;
  }

  if (Array.isArray(a)) {
    return a.some(item => compareValues(item, b, 'eq'));
  }

  return String(a) === String(b);
}

// 8. Document Class Instance
export class FirestoreDocument {
  constructor(data = {}, model = null) {
    this._model = model;
    const id = data._id ? String(data._id) : (data.id ? String(data.id) : new ObjectId().toString());
    this._id = id;
    this.id = id;

    Object.assign(this, data);
    this._id = id;
    this.id = id;

    // Apply defaults from schema if fields are undefined
    if (model?.schema?.paths) {
      for (const [key, fieldDef] of Object.entries(model.schema.paths)) {
        if (this[key] === undefined && fieldDef.default !== undefined) {
          this[key] = typeof fieldDef.default === 'function' ? fieldDef.default() : fieldDef.default;
        }
      }
    }
  }

  async save() {
    if (!this._model) throw new Error('Cannot save document without an associated model');
    return await this._model._saveDoc(this);
  }

  toObject() {
    const plain = {};
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_') || key === '_id') {
        plain[key] = this[key];
      }
    }
    return plain;
  }

  toJSON() {
    return this.toObject();
  }

  toString() {
    return `FirestoreDocument(${this._model?.modelName || 'Unknown'}, ${this._id})`;
  }
}

// 9. QueryBuilder Supporting Chaining (.populate, .sort, .skip, .limit, .select, .lean)
export class QueryBuilder {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.single = single;
    this._sortObj = null;
    this._skipCount = 0;
    this._limitCount = null;
    this._populates = [];
    this._selectFields = null;
    this._isLean = false;
  }

  sort(sortObj) {
    this._sortObj = sortObj;
    return this;
  }

  skip(n) {
    this._skipCount = Math.max(0, Number(n) || 0);
    return this;
  }

  limit(n) {
    this._limitCount = Math.max(0, Number(n) || 0);
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  populate(pathOrObj, selectFields) {
    if (typeof pathOrObj === 'string') {
      this._populates.push({ path: pathOrObj, select: selectFields });
    } else if (typeof pathOrObj === 'object') {
      this._populates.push(pathOrObj);
    }
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  async exec() {
    return await this.model._executeFind(this);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

// 10. Aggregation Pipeline Runner
export async function runAggregationPipeline(docs, pipeline, getModelByName) {
  let currentDocs = docs.map(d => ({ ...d }));

  for (const stage of pipeline) {
    const [op, val] = Object.entries(stage)[0];

    if (op === '$match') {
      currentDocs = currentDocs.filter(d => matchQuery(d, val));
    } else if (op === '$lookup') {
      const { from, localField, foreignField, as } = val;
      const refModel = getModelByName(from);
      if (refModel) {
        const allRefDocs = await refModel.find({}).lean();
        currentDocs.forEach(doc => {
          const localVal = getNestedValue(doc, localField);
          const matched = allRefDocs.filter(refDoc => {
            const refVal = getNestedValue(refDoc, foreignField);
            return compareValues(localVal, refVal, 'eq');
          });
          doc[as] = matched;
        });
      }
    } else if (op === '$unwind') {
      const fieldPath = typeof val === 'string' ? val.replace(/^\$/, '') : val.path.replace(/^\$/, '');
      const newDocs = [];
      currentDocs.forEach(doc => {
        const items = getNestedValue(doc, fieldPath);
        if (Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
            const copy = JSON.parse(JSON.stringify(doc));
            setNestedValue(copy, fieldPath, item);
            newDocs.push(copy);
          });
        } else if (items && !Array.isArray(items)) {
          newDocs.push(doc);
        } else if (val.preserveNullAndEmptyArrays) {
          const copy = JSON.parse(JSON.stringify(doc));
          setNestedValue(copy, fieldPath, null);
          newDocs.push(copy);
        }
      });
      currentDocs = newDocs;
    } else if (op === '$group') {
      const groups = new Map();
      const idExpr = val._id;

      currentDocs.forEach(doc => {
        let groupKey = null;
        let groupKeyObj = null;

        if (idExpr === null) {
          groupKey = '__ALL__';
          groupKeyObj = null;
        } else if (typeof idExpr === 'string') {
          const field = idExpr.replace(/^\$/, '');
          groupKey = String(getNestedValue(doc, field));
          groupKeyObj = getNestedValue(doc, field);
        } else if (typeof idExpr === 'object') {
          const computedObj = {};
          for (const [k, expr] of Object.entries(idExpr)) {
            computedObj[k] = evaluateExpr(doc, expr);
          }
          groupKey = JSON.stringify(computedObj);
          groupKeyObj = computedObj;
        }

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            _id: groupKeyObj,
            _docs: []
          });
        }
        groups.get(groupKey)._docs.push(doc);
      });

      const aggregatedResults = [];
      for (const group of groups.values()) {
        const resultDoc = { _id: group._id };
        for (const [field, accExpr] of Object.entries(val)) {
          if (field === '_id') continue;
          resultDoc[field] = evaluateAccumulator(group._docs, accExpr);
        }
        aggregatedResults.push(resultDoc);
      }
      currentDocs = aggregatedResults;
    } else if (op === '$sort') {
      currentDocs.sort((a, b) => {
        for (const [field, dir] of Object.entries(val)) {
          const va = getNestedValue(a, field);
          const vb = getNestedValue(b, field);
          if (va < vb) return dir === 1 ? -1 : 1;
          if (va > vb) return dir === 1 ? 1 : -1;
        }
        return 0;
      });
    } else if (op === '$project') {
      currentDocs = currentDocs.map(doc => {
        const projected = {};
        for (const [k, v] of Object.entries(val)) {
          if (v === 1 || v === true) {
            projected[k] = getNestedValue(doc, k);
          } else if (typeof v === 'string' && v.startsWith('$')) {
            projected[k] = getNestedValue(doc, v.slice(1));
          } else if (typeof v === 'object') {
            projected[k] = evaluateExpr(doc, v);
          }
        }
        if (val._id === undefined && doc._id !== undefined) {
          projected._id = doc._id;
        }
        return projected;
      });
    }
  }

  return currentDocs;
}

function evaluateExpr(doc, expr) {
  if (expr == null) return null;
  if (typeof expr === 'string') {
    if (expr.startsWith('$')) return getNestedValue(doc, expr.slice(1));
    return expr;
  }
  if (typeof expr === 'number' || typeof expr === 'boolean') return expr;
  if (typeof expr === 'object') {
    if (expr.$month) {
      const d = evaluateExpr(doc, expr.$month);
      return d ? new Date(d).getMonth() + 1 : null;
    }
    if (expr.$year) {
      const d = evaluateExpr(doc, expr.$year);
      return d ? new Date(d).getFullYear() : null;
    }
    if (expr.$ifNull) {
      const [f1, f2] = expr.$ifNull;
      const v1 = evaluateExpr(doc, f1);
      return v1 != null ? v1 : evaluateExpr(doc, f2);
    }
    if (expr.$multiply) {
      const factors = expr.$multiply.map(f => Number(evaluateExpr(doc, f)) || 0);
      return factors.reduce((prod, f) => prod * f, 1);
    }
  }
  return null;
}

function evaluateAccumulator(docs, accExpr) {
  if (!accExpr || typeof accExpr !== 'object') return 0;
  if (accExpr.$sum !== undefined) {
    const expr = accExpr.$sum;
    if (expr === 1) return docs.length;
    let sum = 0;
    for (const d of docs) {
      const val = evaluateExpr(d, expr);
      if (typeof val === 'number' && !isNaN(val)) sum += val;
    }
    return sum;
  }
  if (accExpr.$avg !== undefined) {
    if (docs.length === 0) return 0;
    const expr = accExpr.$avg;
    let sum = 0;
    let count = 0;
    for (const d of docs) {
      const val = evaluateExpr(d, expr);
      if (typeof val === 'number' && !isNaN(val)) {
        sum += val;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
  return 0;
}

// 11. Base Firestore Model Class
export class FirestoreModel {
  constructor(modelName, schema = null) {
    this.modelName = modelName;
    this.collectionName = getCollectionName(modelName);
    this.schema = schema instanceof Schema ? schema : new Schema(schema || {});
  }

  get _collection() {
    return getFirestoreDb().collection(this.collectionName);
  }

  createInstance(data = {}) {
    const doc = new FirestoreDocument(data, this);
    if (this._constructor) {
      Object.setPrototypeOf(doc, this._constructor.prototype);
    }
    return doc;
  }

  // 12. CRUD Methods
  async create(docs) {
    if (Array.isArray(docs)) {
      const created = [];
      for (const d of docs) {
        const instance = this.createInstance(d);
        await instance.save();
        created.push(instance);
      }
      return created;
    }
    const instance = this.createInstance(docs);
    await instance.save();
    return instance;
  }

  async _saveDoc(doc) {
    // Run pre-save hooks if any
    if (this.schema?._preHooks?.save?.length > 0) {
      for (const hook of this.schema._preHooks.save) {
        await new Promise((resolve, reject) => {
          let called = false;
          const next = (err) => {
            if (called) return;
            called = true;
            if (err) reject(err);
            else resolve();
          };
          const res = hook.call(doc, next);
          if (res && typeof res.then === 'function') {
            res.then(() => next()).catch(reject);
          }
        });
      }
    }

    const now = new Date();
    if (this.schema.options?.timestamps) {
      if (!doc.createdAt) doc.createdAt = now;
      doc.updatedAt = now;
    }

    const docId = doc._id ? String(doc._id) : (doc.id ? String(doc.id) : new ObjectId().toString());
    doc._id = docId;
    doc.id = docId;

    const dataToSave = sanitizeForFirestore(doc.toObject());
    dataToSave._id = docId;

    await this._collection.doc(docId).set(dataToSave, { merge: true });

    // Run post-save hooks if any
    if (this.schema?._postHooks?.save?.length > 0) {
      for (const hook of this.schema._postHooks.save) {
        hook.call(doc);
      }
    }

    return doc;
  }

  find(filter = {}) {
    return new QueryBuilder(this, filter, false);
  }

  findOne(filter = {}) {
    return new QueryBuilder(this, filter, true);
  }

  findById(id) {
    const stringId = id != null ? (id.toString?.() || String(id)) : null;
    return new QueryBuilder(this, { _id: stringId }, true);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    if (!id) return null;
    const stringId = id.toString?.() || String(id);
    const docRef = this._collection.doc(stringId);
    const snap = await docRef.get();

    if (!snap.exists) {
      if (options.upsert) {
        const newDoc = { _id: stringId, ...(update.$set || update) };
        const instance = this.createInstance(newDoc);
        await instance.save();
        return instance;
      }
      return null;
    }

    const existing = firestoreDocToData(snap);
    const updated = this._applyUpdate(existing, update);

    if (this.schema.options?.timestamps) {
      updated.updatedAt = new Date();
    }

    const sanitized = sanitizeForFirestore(updated);
    sanitized._id = stringId;
    await docRef.set(sanitized, { merge: true });

    const returnedData = options.new ? updated : existing;
    return options.lean ? returnedData : this.createInstance(returnedData);
  }

  async findByIdAndDelete(id) {
    if (!id) return null;
    const stringId = id.toString?.() || String(id);
    const docRef = this._collection.doc(stringId);
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const data = firestoreDocToData(snap);
    await docRef.delete();
    return this.createInstance(data);
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    const doc = await this.findOne(filter);
    if (!doc) {
      if (options.upsert) {
        const newDoc = { ...filter, ...(update.$set || update) };
        await this.create(newDoc);
        return { acknowledged: true, modifiedCount: 1, upsertedCount: 1 };
      }
      return { acknowledged: true, modifiedCount: 0 };
    }
    await this.findByIdAndUpdate(doc._id, update, { new: true });
    return { acknowledged: true, modifiedCount: 1 };
  }

  async updateMany(filter = {}, update = {}, options = {}) {
    const docs = await this.find(filter);
    let modifiedCount = 0;
    for (const d of docs) {
      await this.findByIdAndUpdate(d._id, update, { new: true });
      modifiedCount++;
    }
    return { acknowledged: true, modifiedCount };
  }

  async deleteOne(filter = {}) {
    const doc = await this.findOne(filter);
    if (!doc) return { acknowledged: true, deletedCount: 0 };
    await this.findByIdAndDelete(doc._id);
    return { acknowledged: true, deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const docs = await this.find(filter);
    let deletedCount = 0;
    for (const d of docs) {
      await this.findByIdAndDelete(d._id);
      deletedCount++;
    }
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(filter = {}) {
    if (!filter || Object.keys(filter).length === 0) {
      const snap = await this._collection.count().get();
      return snap.data().count;
    }
    const docs = await this.find(filter).lean();
    return docs.length;
  }

  async aggregate(pipeline = []) {
    const allDocs = await this.find({}).lean();
    return await runAggregationPipeline(allDocs, pipeline, (name) => {
      return getRegisteredModel(name);
    });
  }

  // 13. Query Execution Engine
  async _executeFind(qb) {
    let results = [];

    // Fast path: findById single doc lookup
    if (qb.single && qb.filter && qb.filter._id && Object.keys(qb.filter).length === 1 && typeof qb.filter._id === 'string') {
      const snap = await this._collection.doc(qb.filter._id).get();
      if (!snap.exists) return null;
      results = [firestoreDocToData(snap)];
    } else {
      // Fetch collection docs
      const snap = await this._collection.get();
      const docs = [];
      snap.forEach(d => {
        docs.push(firestoreDocToData(d));
      });

      // Filter in-memory
      results = docs.filter(d => matchQuery(d, qb.filter));
    }

    // Sort
    if (qb._sortObj) {
      const sortEntries = Object.entries(qb._sortObj);
      results.sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const va = getNestedValue(a, field);
          const vb = getNestedValue(b, field);
          if (va < vb) return dir === 1 || dir === 'asc' ? -1 : 1;
          if (va > vb) return dir === 1 || dir === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Skip
    if (qb._skipCount > 0) {
      results = results.slice(qb._skipCount);
    }

    // Limit
    if (qb._limitCount != null) {
      results = results.slice(0, qb._limitCount);
    }

    // Populate
    if (qb._populates.length > 0) {
      for (const pop of qb._populates) {
        await this._applyPopulate(results, pop);
      }
    }

    // Select
    if (qb._selectFields) {
      const selectParts = typeof qb._selectFields === 'string'
        ? qb._selectFields.split(' ').map(s => s.trim()).filter(Boolean)
        : Object.keys(qb._selectFields);

      const isExclusive = selectParts.some(p => p.startsWith('-'));
      results = results.map(doc => {
        const projected = { _id: doc._id, id: doc.id };
        if (isExclusive) {
          const excludeFields = selectParts.map(p => p.replace(/^-/, ''));
          for (const [k, v] of Object.entries(doc)) {
            if (!excludeFields.includes(k)) projected[k] = v;
          }
        } else {
          for (const field of selectParts) {
            projected[field] = getNestedValue(doc, field);
          }
        }
        return projected;
      });
    }

    if (qb.single) {
      if (results.length === 0) return null;
      const data = results[0];
      return qb._isLean ? data : this.createInstance(data);
    }

    return qb._isLean ? results : results.map(d => this.createInstance(d));
  }

  async _applyPopulate(docs, populateOptions) {
    const pathStr = typeof populateOptions === 'string' ? populateOptions : populateOptions.path;
    const selectStr = populateOptions.select;
    const nestedPopulate = populateOptions.populate;

    // Determine referenced model
    let refModelName = null;
    if (populateOptions.model) {
      refModelName = populateOptions.model;
    } else {
      // Check schema paths for ref
      const fieldDef = this.schema?.paths?.[pathStr];
      if (fieldDef?.ref) {
        refModelName = fieldDef.ref;
      } else if (fieldDef?.schema?.ref) {
        refModelName = fieldDef.schema.ref;
      }
    }

    // Fallback: guess ref model from path name (e.g. 'userId' -> 'User', 'eventId' -> 'Event')
    if (!refModelName) {
      const cleanPath = pathStr.replace(/Id$/, '');
      refModelName = cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
    }

    const refModel = getRegisteredModel(refModelName);
    if (!refModel) return;

    for (const doc of docs) {
      const targetId = getNestedValue(doc, pathStr);
      if (!targetId) continue;

      if (Array.isArray(targetId)) {
        const populatedList = [];
        for (const id of targetId) {
          const refDoc = await refModel.findById(id).select(selectStr).lean();
          if (refDoc) populatedList.push(refDoc);
        }
        setNestedValue(doc, pathStr, populatedList);
      } else {
        const refDoc = await refModel.findById(targetId).select(selectStr).lean();
        if (refDoc) {
          if (nestedPopulate) {
            await refModel._applyPopulate([refDoc], nestedPopulate);
          }
          setNestedValue(doc, pathStr, refDoc);
        }
      }
    }
  }

  _applyUpdate(target, update) {
    const res = { ...target };

    // Direct updates
    for (const [k, v] of Object.entries(update)) {
      if (!k.startsWith('$')) {
        setNestedValue(res, k, v);
      }
    }

    // $set
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        setNestedValue(res, k, v);
      }
    }

    // $inc
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        const current = Number(getNestedValue(res, k)) || 0;
        setNestedValue(res, k, current + Number(v));
      }
    }

    // $push
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        let current = getNestedValue(res, k);
        if (!Array.isArray(current)) current = [];
        if (v && v.$each) {
          current.push(...v.$each);
        } else {
          current.push(v);
        }
        setNestedValue(res, k, current);
      }
    }

    // $pull
    if (update.$pull) {
      for (const [k, v] of Object.entries(update.$pull)) {
        let current = getNestedValue(res, k);
        if (Array.isArray(current)) {
          current = current.filter(item => !compareValues(item, v, 'eq'));
          setNestedValue(res, k, current);
        }
      }
    }

    return res;
  }
}

// 14. Model Registry & model() Factory
const MODEL_REGISTRY = new Map();

export function model(name, schema) {
  if (MODEL_REGISTRY.has(name) && !schema) {
    return MODEL_REGISTRY.get(name);
  }

  const firestoreModelInstance = new FirestoreModel(name, schema);

  function ModelConstructor(data = {}) {
    return firestoreModelInstance.createInstance(data);
  }

  firestoreModelInstance._constructor = ModelConstructor;

  // Setup prototype inheritance so `instance instanceof ModelConstructor` works
  ModelConstructor.prototype = Object.create(FirestoreDocument.prototype);
  ModelConstructor.prototype.constructor = ModelConstructor;

  // Attach all FirestoreModel static methods onto ModelConstructor
  Object.setPrototypeOf(ModelConstructor, firestoreModelInstance);
  Object.assign(ModelConstructor, firestoreModelInstance);
  ModelConstructor.modelName = name;
  ModelConstructor.schema = firestoreModelInstance.schema;

  MODEL_REGISTRY.set(name, ModelConstructor);
  return ModelConstructor;
}

export function getRegisteredModel(name) {
  if (MODEL_REGISTRY.has(name)) return MODEL_REGISTRY.get(name);
  // Also check lowercase or plural
  for (const [regName, regModel] of MODEL_REGISTRY.entries()) {
    if (regName.toLowerCase() === name.toLowerCase()) return regModel;
    if (getCollectionName(regName) === name.toLowerCase()) return regModel;
  }
  return model(name);
}

// 15. Mongoose-compatible root export
export const connection = {
  readyState: 1, // 1 = connected
  host: 'firestore.googleapis.com',
  name: 'brookshow-16c93',
  collection: (name) => {
    return {
      indexes: async () => [],
      dropIndex: async () => true,
    };
  }
};

export async function connect(uri, options = {}) {
  getFirestoreDb();
  console.log('[Firebase] Firestore connected successfully: brookshow-16c93');
  return connection;
}

export async function disconnect() {
  console.log('[Firebase] Firestore disconnected.');
  return true;
}

export const set = () => {};

export default {
  Schema,
  model,
  Types,
  ObjectId,
  isValidObjectId,
  connection,
  connect,
  disconnect,
  set,
  getFirestoreDb,
};
