/**
 * Database module exports
 * Central export point for all database functionality
 */

// Connection utilities
export {
  DatabaseConnection,
  getDatabaseConnection,
  initializeDatabaseConnection,
  checkDatabaseHealth,
  closeDatabaseConnection
} from './connection';

// Data models and types
export * from './models';

// Encryption utilities
export {
  encryptSensitiveData,
  decryptSensitiveData,
  hashForIndex,
  generateSecureUserId,
  generateSecureSessionId,
  sanitizeBeforeEncryption,
  validateEncryptionConfig,
  createEncryptionMetadata
} from './encryption';

// Repository pattern implementations
export {
  UsersRepository,
  SessionsRepository,
  ProgressRepository,
  SettingsRepository,
  usersRepository,
  sessionsRepository,
  progressRepository,
  settingsRepository
} from './repositories';

// Table schemas
export {
  UsersTableSchema,
  SessionsTableSchema,
  ProgressTableSchema,
  SettingsTableSchema,
  AllTableSchemas,
  getTableSchema,
  validateTableSchema,
  getTableCreationOrder
} from './schemas';

// Setup utilities
export {
  setupDatabase
} from './setup';