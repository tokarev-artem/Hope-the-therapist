/**
 * Mock DynamoDB implementation for local development
 * Provides in-memory storage that mimics DynamoDB operations
 */

import { 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';

interface MockTable {
  [key: string]: any;
}

interface MockDatabase {
  [tableName: string]: MockTable;
}

export class MockDynamoDBClient {
  private database: MockDatabase = {};
  private isConnected = true;

  /**
   * Initialize mock tables
   */
  initializeTables(tableNames: string[]): void {
    tableNames.forEach(tableName => {
      if (!this.database[tableName]) {
        this.database[tableName] = {};
      }
    });
  }

  /**
   * Mock send method that handles DynamoDB commands
   */
  async send(command: any): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Mock DynamoDB client is not connected');
    }

    // Handle different command types
    if (command instanceof PutCommand) {
      return this.handlePutCommand(command);
    } else if (command instanceof GetCommand) {
      return this.handleGetCommand(command);
    } else if (command instanceof UpdateCommand) {
      return this.handleUpdateCommand(command);
    } else if (command instanceof DeleteCommand) {
      return this.handleDeleteCommand(command);
    } else if (command instanceof QueryCommand) {
      return this.handleQueryCommand(command);
    } else if (command instanceof ScanCommand) {
      return this.handleScanCommand(command);
    } else if (command.constructor.name === 'ListTablesCommand') {
      return this.handleListTablesCommand();
    } else if (command.constructor.name === 'CreateTableCommand') {
      return this.handleCreateTableCommand(command);
    } else if (command.constructor.name === 'DescribeTableCommand') {
      return this.handleDescribeTableCommand(command);
    }

    throw new Error(`Unsupported command: ${command.constructor.name}`);
  }

  private handlePutCommand(command: PutCommand): any {
    const { TableName, Item } = command.input;
    if (!TableName || !Item) {
      throw new Error('TableName and Item are required for PutCommand');
    }

    // Ensure table exists
    if (!this.database[TableName]) {
      this.database[TableName] = {};
    }

    // Get primary key (assume first key is primary key)
    const primaryKey = this.getPrimaryKey(Item);
    this.database[TableName][primaryKey] = { ...Item };

    return {
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleGetCommand(command: GetCommand): any {
    const { TableName, Key } = command.input;
    if (!TableName || !Key) {
      throw new Error('TableName and Key are required for GetCommand');
    }

    const table = this.database[TableName];
    if (!table) {
      return {
        $metadata: {
          httpStatusCode: 200,
          requestId: this.generateRequestId()
        }
      };
    }

    const primaryKey = this.getPrimaryKey(Key);
    const item = table[primaryKey];

    return {
      Item: item ? { ...item } : undefined,
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleUpdateCommand(command: UpdateCommand): any {
    const { TableName, Key, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues, ReturnValues } = command.input;
    if (!TableName || !Key) {
      throw new Error('TableName and Key are required for UpdateCommand');
    }

    const table = this.database[TableName];
    if (!table) {
      throw new Error(`Table ${TableName} does not exist`);
    }

    const primaryKey = this.getPrimaryKey(Key);
    let item = table[primaryKey];

    if (!item) {
      throw new Error('Item not found');
    }

    // Simple update expression parsing (basic implementation)
    if (UpdateExpression && ExpressionAttributeNames && ExpressionAttributeValues) {
      item = this.applyUpdateExpression(item, UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues);
      table[primaryKey] = item;
    }

    return {
      Attributes: ReturnValues === 'ALL_NEW' ? { ...item } : undefined,
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleDeleteCommand(command: DeleteCommand): any {
    const { TableName, Key } = command.input;
    if (!TableName || !Key) {
      throw new Error('TableName and Key are required for DeleteCommand');
    }

    const table = this.database[TableName];
    if (table) {
      const primaryKey = this.getPrimaryKey(Key);
      delete table[primaryKey];
    }

    return {
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleQueryCommand(command: QueryCommand): any {
    const { TableName, IndexName, KeyConditionExpression, ExpressionAttributeValues, Limit, ScanIndexForward } = command.input;
    if (!TableName) {
      throw new Error('TableName is required for QueryCommand');
    }

    const table = this.database[TableName];
    if (!table) {
      return {
        Items: [],
        Count: 0,
        ScannedCount: 0,
        $metadata: {
          httpStatusCode: 200,
          requestId: this.generateRequestId()
        }
      };
    }

    // Simple query implementation - return all items for now
    // In a real implementation, you'd parse the KeyConditionExpression
    let items = Object.values(table);

    // Apply limit
    if (Limit) {
      items = items.slice(0, Limit);
    }

    // Apply sort order (basic implementation)
    if (ScanIndexForward === false) {
      items = items.reverse();
    }

    return {
      Items: items.map(item => ({ ...item })),
      Count: items.length,
      ScannedCount: items.length,
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleScanCommand(command: ScanCommand): any {
    const { TableName, Limit } = command.input;
    if (!TableName) {
      throw new Error('TableName is required for ScanCommand');
    }

    const table = this.database[TableName];
    if (!table) {
      return {
        Items: [],
        Count: 0,
        ScannedCount: 0,
        $metadata: {
          httpStatusCode: 200,
          requestId: this.generateRequestId()
        }
      };
    }

    let items = Object.values(table);

    // Apply limit
    if (Limit) {
      items = items.slice(0, Limit);
    }

    return {
      Items: items.map(item => ({ ...item })),
      Count: items.length,
      ScannedCount: items.length,
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleListTablesCommand(): any {
    return {
      TableNames: Object.keys(this.database),
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleCreateTableCommand(command: any): any {
    const { TableName } = command.input;
    if (!TableName) {
      throw new Error('TableName is required for CreateTableCommand');
    }

    // Initialize empty table
    this.database[TableName] = {};

    return {
      TableDescription: {
        TableName,
        TableStatus: 'ACTIVE',
        CreationDateTime: new Date(),
        AttributeDefinitions: command.input.AttributeDefinitions || [],
        KeySchema: command.input.KeySchema || []
      },
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private handleDescribeTableCommand(command: any): any {
    const { TableName } = command.input;
    if (!TableName) {
      throw new Error('TableName is required for DescribeTableCommand');
    }

    if (!this.database[TableName]) {
      const error = new Error(`Table not found: ${TableName}`);
      (error as any).name = 'ResourceNotFoundException';
      throw error;
    }

    return {
      Table: {
        TableName,
        TableStatus: 'ACTIVE',
        CreationDateTime: new Date(),
        ItemCount: Object.keys(this.database[TableName]).length,
        TableSizeBytes: 0
      },
      $metadata: {
        httpStatusCode: 200,
        requestId: this.generateRequestId()
      }
    };
  }

  private getPrimaryKey(item: any): string {
    // Simple implementation - use first key as primary key
    const keys = Object.keys(item);
    if (keys.length === 0) {
      throw new Error('Item must have at least one key');
    }
    return item[keys[0]];
  }

  private applyUpdateExpression(item: any, updateExpression: string, attributeNames: any, attributeValues: any): any {
    // Very basic implementation - just handle SET operations
    const updatedItem = { ...item };
    
    if (updateExpression.startsWith('SET ')) {
      const setClause = updateExpression.substring(4);
      const assignments = setClause.split(', ');
      
      assignments.forEach(assignment => {
        const [nameExpr, valueExpr] = assignment.split(' = ');
        const actualName = attributeNames[nameExpr] || nameExpr;
        const actualValue = attributeValues[valueExpr];
        
        if (actualValue !== undefined) {
          updatedItem[actualName] = actualValue;
        }
      });
    }
    
    return updatedItem;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get database state for debugging
   */
  getDatabase(): MockDatabase {
    return { ...this.database };
  }

  /**
   * Clear all data
   */
  clearDatabase(): void {
    this.database = {};
  }

  /**
   * Disconnect mock client
   */
  destroy(): void {
    this.isConnected = false;
  }
}