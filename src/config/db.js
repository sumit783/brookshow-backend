import firestore from "./firestore.js";

export const connectDB = async () => {
  try {
    await firestore.connect();
    console.log(`[Firebase] Firestore connected successfully for database: brookshow-16c93`);
  } catch (error) {
    console.error(`[Firebase] Firestore Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
