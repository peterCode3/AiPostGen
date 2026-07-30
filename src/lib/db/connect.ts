/**
 * Database connection for AiPostGen.
 *
 * Was Mongoose/DocumentDB; now Cloud SQL MySQL. Kept at the same path and with
 * the same exported name so the ~20 API routes that `import { dbConnect }`
 * need no change.
 *
 * The DocumentDB-specific workarounds are gone with it: no TLS CA bundle
 * (MONGODB_TLS_CA_FILE) and no retryWrites=false.
 */
export { dbConnect, getPool, newObjectId } from './sql';
