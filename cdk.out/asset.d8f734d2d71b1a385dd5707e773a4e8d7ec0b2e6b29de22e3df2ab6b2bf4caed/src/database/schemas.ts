/**
 * DynamoDB table schemas for Users, Sessions, Progress, and Settings tables
 */

import { CreateTableCommand, CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

export interface TableSchema {
  tableName: string;
  createTableInput: CreateTableCommandInput;
}

/**
 * Users table schema
 * Primary Key: userId (String)
 * GSI1: isAnonymous-lastActiveAt-index for querying anonymous users by activity
 */
export const UsersTableSchema: TableSchema = {
  tableName: 'users',
  createTableInput: {
    TableName: '', // Will be set with prefix in setup
    KeySchema: [
      {
        AttributeName: 'userId',
        KeyType: 'HASH' // Partition key
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'userId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'isAnonymous',
        AttributeType: 'S' // 'true' or 'false' as string
      },
      {
        AttributeName: 'lastActiveAt',
        AttributeType: 'S' // ISO timestamp
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'isAnonymous-lastActiveAt-index',
        KeySchema: [
          {
            AttributeName: 'isAnonymous',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'lastActiveAt',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    },
    SSESpecification: {
      Enabled: true
    },
    Tags: [
      {
        Key: 'Application',
        Value: 'TherapeuticWaveInterface'
      },
      {
        Key: 'Environment',
        Value: process.env.NODE_ENV || 'development'
      }
    ]
  }
};

/**
 * Sessions table schema
 * Primary Key: sessionId (String)
 * GSI1: userId-startTime-index for querying sessions by user chronologically
 */
export const SessionsTableSchema: TableSchema = {
  tableName: 'sessions',
  createTableInput: {
    TableName: '', // Will be set with prefix in setup
    KeySchema: [
      {
        AttributeName: 'sessionId',
        KeyType: 'HASH' // Partition key
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'sessionId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'userId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'startTime',
        AttributeType: 'S' // ISO timestamp
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-startTime-index',
        KeySchema: [
          {
            AttributeName: 'userId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'startTime',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    },
    SSESpecification: {
      Enabled: true
    },
    Tags: [
      {
        Key: 'Application',
        Value: 'TherapeuticWaveInterface'
      },
      {
        Key: 'Environment',
        Value: process.env.NODE_ENV || 'development'
      },
      {
        Key: 'DataType',
        Value: 'SessionData'
      }
    ]
  }
};

/**
 * Progress table schema
 * Primary Key: progressId (String)
 * GSI1: userId-weekStartDate-index for querying progress by user chronologically
 */
export const ProgressTableSchema: TableSchema = {
  tableName: 'progress',
  createTableInput: {
    TableName: '', // Will be set with prefix in setup
    KeySchema: [
      {
        AttributeName: 'progressId',
        KeyType: 'HASH' // Partition key
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'progressId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'userId',
        AttributeType: 'S'
      },
      {
        AttributeName: 'weekStartDate',
        AttributeType: 'S' // ISO date string (YYYY-MM-DD)
      }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-weekStartDate-index',
        KeySchema: [
          {
            AttributeName: 'userId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'weekStartDate',
            KeyType: 'RANGE'
          }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    },
    SSESpecification: {
      Enabled: true
    },
    Tags: [
      {
        Key: 'Application',
        Value: 'TherapeuticWaveInterface'
      },
      {
        Key: 'Environment',
        Value: process.env.NODE_ENV || 'development'
      },
      {
        Key: 'DataType',
        Value: 'ProgressData'
      }
    ]
  }
};

/**
 * Settings table schema
 * Primary Key: settingsId (String) - same as userId for user-specific settings
 * No GSI needed as settings are accessed directly by userId
 */
export const SettingsTableSchema: TableSchema = {
  tableName: 'settings',
  createTableInput: {
    TableName: '', // Will be set with prefix in setup
    KeySchema: [
      {
        AttributeName: 'settingsId',
        KeyType: 'HASH' // Partition key
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: 'settingsId',
        AttributeType: 'S'
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES'
    },
    SSESpecification: {
      Enabled: true
    },
    Tags: [
      {
        Key: 'Application',
        Value: 'TherapeuticWaveInterface'
      },
      {
        Key: 'Environment',
        Value: process.env.NODE_ENV || 'development'
      },
      {
        Key: 'DataType',
        Value: 'UserSettings'
      }
    ]
  }
};

/**
 * All table schemas for easy iteration
 */
export const AllTableSchemas: TableSchema[] = [
  UsersTableSchema,
  SessionsTableSchema,
  ProgressTableSchema,
  SettingsTableSchema
];

/**
 * Get table schema by name
 */
export function getTableSchema(tableName: string): TableSchema | undefined {
  return AllTableSchemas.find(schema => schema.tableName === tableName);
}

/**
 * Validate table schema configuration
 */
export function validateTableSchema(schema: TableSchema): boolean {
  try {
    // Basic validation checks
    if (!schema.tableName || !schema.createTableInput) {
      return false;
    }

    const input = schema.createTableInput;
    
    // Check required fields
    if (!input.KeySchema || input.KeySchema.length === 0) {
      return false;
    }

    if (!input.AttributeDefinitions || input.AttributeDefinitions.length === 0) {
      return false;
    }

    // Validate key schema references exist in attribute definitions
    const attributeNames = input.AttributeDefinitions.map(attr => attr.AttributeName);
    const keyAttributes = input.KeySchema.map(key => key.AttributeName);
    
    for (const keyAttr of keyAttributes) {
      if (!attributeNames.includes(keyAttr)) {
        console.error(`Key attribute ${keyAttr} not found in attribute definitions`);
        return false;
      }
    }

    // Validate GSI key schema if present
    if (input.GlobalSecondaryIndexes) {
      for (const gsi of input.GlobalSecondaryIndexes) {
        if (gsi.KeySchema) {
          const gsiKeyAttributes = gsi.KeySchema.map(key => key.AttributeName);
          for (const gsiKeyAttr of gsiKeyAttributes) {
            if (!attributeNames.includes(gsiKeyAttr)) {
              console.error(`GSI key attribute ${gsiKeyAttr} not found in attribute definitions`);
              return false;
            }
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Table schema validation error:', error);
    return false;
  }
}

/**
 * Get table creation order (considering dependencies)
 */
export function getTableCreationOrder(): TableSchema[] {
  // Users table should be created first as other tables reference it
  // Settings can be created after Users
  // Sessions and Progress can be created in parallel after Users
  return [
    UsersTableSchema,
    SettingsTableSchema,
    SessionsTableSchema,
    ProgressTableSchema
  ];
}