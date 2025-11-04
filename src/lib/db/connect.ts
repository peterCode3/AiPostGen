/**
 * MongoDB Connection with SSL Fix
 * 
 * Handles connection pooling and SSL/TLS issues
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your .env.local file');
}

// Global variable to cache the connection
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  // Return cached connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection if none exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      
      // SSL/TLS Configuration - FIXED
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      
      // Retry configuration
      retryWrites: true,
      retryReads: true,
      
      // Connection options
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log('[MongoDB] Connecting...');
    
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ [MongoDB] Connected successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('❌ [MongoDB] Connection failed:', err.message);
        cached.promise = null; // Reset promise on error
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Handle connection errors
mongoose.connection.on('error', (err) => {
  console.error('❌ [MongoDB] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB] Disconnected');
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ [MongoDB] Reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
