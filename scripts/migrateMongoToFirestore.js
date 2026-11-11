import dns from 'dns';
// Resolve DNS and prioritize IPv4 to prevent Windows/NAT64 timeouts with Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = path.resolve('./brookshow-16c93-firebase-adminsdk-fbsvc-a913e811e7.json');

// Helper to convert BSON types, ObjectIds, Buffers, Dates to Firestore-compatible data
function sanitizeForFirestore(val) {
  if (val === undefined) return undefined;
  if (val === null) return null;

  // Check for MongoDB ObjectId or BSON ObjectID
  if (typeof val === 'object' && val._bsontype === 'ObjectID') {
    return val.toString();
  }
  if (typeof val?.toHexString === 'function') {
    return val.toHexString();
  }

  // Preserve Date instances (Firebase Admin automatically converts Date to Timestamp)
  if (val instanceof Date) {
    return val;
  }

  // Preserve Buffer
  if (Buffer.isBuffer(val)) {
    return val;
  }

  // Handle Arrays
  if (Array.isArray(val)) {
    return val
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined);
  }

  // Handle Objects
  if (typeof val === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(val)) {
      const sanitizedVal = sanitizeForFirestore(value);
      if (sanitizedVal !== undefined) {
        cleaned[key] = sanitizedVal;
      }
    }
    return cleaned;
  }

  return val;
}

async function runMigration() {
  console.log('====================================================');
  console.log(' Starting MongoDB Atlas to Firebase Firestore Migration');
  console.log('====================================================\n');

  // 1. Initialize Firebase Admin
  let credentials;
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  } else {
    throw new Error('Firebase credentials not found in .env or key file.');
  }

  console.log(`[Firebase] Initializing Firebase Admin for Project: ${credentials.project_id || credentials.projectId}`);
  const firebaseApp = initializeApp({
    credential: cert(credentials)
  });
  const firestoreDb = getFirestore(firebaseApp);
  console.log('[Firebase] Connected to Firestore successfully.\n');

  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || 'brookshow';
  console.log(`[MongoDB] Connecting to MongoDB Atlas (${dbName})...`);
  await mongoose.connect(mongoUri, { dbName, family: 4 });
  console.log('[MongoDB] Connected successfully.\n');

  const mongoDb = mongoose.connection.db;
  const collections = await mongoDb.listCollections().toArray();
  const targetCollections = collections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.') && !name.startsWith('_test'));

  console.log(`Found ${targetCollections.length} collections to migrate:`);
  targetCollections.forEach(name => console.log(` - ${name}`));
  console.log('\n----------------------------------------------------');

  const report = [];
  const BATCH_SIZE = 100; // Efficient chunk size for network transfers

  for (const collectionName of targetCollections) {
    const mongoCollection = mongoDb.collection(collectionName);
    const firestoreCollection = firestoreDb.collection(collectionName);

    const mongoCount = await mongoCollection.countDocuments();
    process.stdout.write(`Migrating [${collectionName}] (${mongoCount} docs)... `);

    if (mongoCount === 0) {
      console.log('Skipped (0 documents).');
      report.push({
        collection: collectionName,
        mongoCount: 0,
        firestoreCount: 0,
        status: 'EMPTY'
      });
      continue;
    }

    const cursor = mongoCollection.find({});
    let batch = firestoreDb.batch();
    let batchCount = 0;
    let totalMigrated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const docId = doc._id ? doc._id.toString() : undefined;
      const sanitizedData = sanitizeForFirestore(doc);
      if (docId) {
        sanitizedData._id = docId;
      }

      const docRef = docId ? firestoreCollection.doc(docId) : firestoreCollection.doc();
      batch.set(docRef, sanitizedData, { merge: true });
      batchCount++;
      totalMigrated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = firestoreDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // Verify document count in Firestore
    const firestoreCountSnap = await firestoreCollection.count().get();
    const firestoreCount = firestoreCountSnap.data().count;

    const isMatch = mongoCount === firestoreCount;
    console.log(`Done! Migrated: ${totalMigrated}, Firestore total: ${firestoreCount} [${isMatch ? 'MATCH' : 'CHECK'}]`);

    report.push({
      collection: collectionName,
      mongoCount,
      firestoreCount,
      status: isMatch ? 'SUCCESS' : 'COUNT_MISMATCH'
    });
  }

  // Clean up any test collections if present
  try {
    const testDoc = await firestoreDb.collection('_migration_test').doc('ping').get();
    if (testDoc.exists) await firestoreDb.collection('_migration_test').doc('ping').delete();
  } catch {}

  console.log('\n====================================================');
  console.log(' Migration Summary Report');
  console.log('====================================================');
  console.table(report);

  const totalMongoDocs = report.reduce((sum, r) => sum + r.mongoCount, 0);
  const totalFirestoreDocs = report.reduce((sum, r) => sum + r.firestoreCount, 0);
  console.log(`\nTotal Documents in MongoDB:   ${totalMongoDocs}`);
  console.log(`Total Documents in Firestore: ${totalFirestoreDocs}`);

  await mongoose.disconnect();
  console.log('\n[MongoDB] Disconnected.');
  console.log('[Migration] All data migrated successfully!\n');
}

runMigration().catch(err => {
  console.error('\n[FATAL ERROR] Migration failed:', err);
  process.exit(1);
});
