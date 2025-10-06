/**
 * Database connection utilities that work both locally and with AWS DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
// Removed fromIni import since we're using default credential chain

export interface DatabaseConfig {
  region: string;
  endpoint?: string; // For local DynamoDB
  accessKeyId?: string;
  secretAccessKey?: string;
  tables: {
    users: string;
    sessions: string;
  };
}

export class DatabaseConnection {
  private client!: DynamoDBClient;
  private docClient!: DynamoDBDocumentClient;
  private config: DatabaseConfig;
  private isLocal: boolean;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      tables: {
        users: process.env.DYNAMODB_USERS_TABLE || 'therapeutic-wave-users',
        sessions: process.env.DYNAMODB_SESSIONS_TABLE || 'therapeutic-wave-sessions'
      },
      ...config
    };

    this.isLocal = !!this.config.endpoint;
    this.initializeClients();
  }

  private initializeClients(): void {
    // Simple configuration that matches our working test
    const clientConfig: any = {
      region: this.config.region,
    };

    // Configure for local DynamoDB
    if (this.isLocal) {
      clientConfig.endpoint = this.config.endpoint;
      clientConfig.credentials = {
        accessKeyId: 'local',
        secretAccessKey: 'local'
      };
    }
    // For AWS DynamoDB, let the SDK use default credential chain automatically
    // No explicit credential configuration needed

    this.client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }

  /**
   * Get the DynamoDB document client
   */
  getDocumentClient(): DynamoDBDocumentClient {
    return this.docClient;
  }

  /**
   * Get the raw DynamoDB client
   */
  getClient(): DynamoDBClient {
    return this.client;
  }

  /**
   * Get table name by type
   */
  getTableName(tableType: 'users' | 'sessions'): string {
    return this.config.tables[tableType];
  }

  /**
   * Check if connection is configured for local development
   */
  isLocalEnvironment(): boolean {
    return this.isLocal;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
      const command = new ListTablesCommand({});
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database configuration info (for debugging)
   */
  getConnectionInfo(): { isLocal: boolean; region: string; endpoint?: string; tables: Record<string, string> } {
    return {
      isLocal: this.isLocal,
      region: this.config.region,
      endpoint: this.config.endpoint,
      tables: this.config.tables
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      this.client.destroy();
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Singleton instance for application-wide use
let dbConnection: DatabaseConnection | null = null;

/**
 * Get or create database connection singleton
 */
export function getDatabaseConnection(config?: Partial<DatabaseConfig>): DatabaseConnection {
  if (!dbConnection) {
    dbConnection = new DatabaseConnection(config);
  }
  return dbConnection;
}

/**
 * Initialize database connection with environment-specific configuration
 */
export function initializeDatabaseConnection(): DatabaseConnection {
  const config: Partial<DatabaseConfig> = {};

  // Development environment - use local DynamoDB if endpoint is set
  if (process.env.DYNAMODB_ENDPOINT) {
    config.endpoint = process.env.DYNAMODB_ENDPOINT;
    console.log('Initializing local DynamoDB connection');
  } else {
    // Production environment - use AWS DynamoDB
    console.log('Initializing AWS DynamoDB connection');
  }

  return getDatabaseConnection(config);
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    isLocal: boolean;
    region: string;
    endpoint?: string;
    tables: Record<string, string>;
    connectionTest: boolean;
  };
}> {
  try {
    const db = getDatabaseConnection();
    const connectionTest = await db.testConnection();
    const connectionInfo = db.getConnectionInfo();

    return {
      status: connectionTest ? 'healthy' : 'unhealthy',
      details: {
        ...connectionInfo,
        connectionTest
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      details: {
        isLocal: false,
        region: 'unknown',
        tables: {},
        connectionTest: false
      }
    };
  }
}

/**
 * Gracefully close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (dbConnection) {
    await dbConnection.close();
    dbConnection = null;
  }
}