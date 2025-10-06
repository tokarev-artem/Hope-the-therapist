/**
 * Database setup script for creating DynamoDB tables
 * Note: This is for reference only. Tables should be created via CDK/Terraform
 */

import 'dotenv/config';
import { CreateTableCommand, DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { getDatabaseConnection, initializeDatabaseConnection } from './connection';
import { AllTableSchemas, getTableCreationOrder, validateTableSchema } from './schemas';
import { validateEncryptionConfig } from './encryption';

interface SetupOptions {
  force?: boolean; // Force recreate tables if they exist
  skipValidation?: boolean; // Skip schema validation
  verbose?: boolean; // Verbose logging
}

/**
 * Setup all database tables (for reference - use CDK/Terraform in production)
 */
export async function setupDatabase(options: SetupOptions = {}): Promise<void> {
  const { force = false, skipValidation = false, verbose = false } = options;

  try {
    console.log('🚀 Starting database setup...');
    console.log('⚠️  Note: This is for reference only. Use CDK/Terraform for production deployments.');

    // Initialize database connection
    const db = initializeDatabaseConnection();
    const client = db.getClient();
    const connectionInfo = db.getConnectionInfo();

    console.log(`📡 Connected to ${connectionInfo.isLocal ? 'local' : 'AWS'} DynamoDB`);
    console.log(`   Region: ${connectionInfo.region}`);
    if (connectionInfo.endpoint) {
      console.log(`   Endpoint: ${connectionInfo.endpoint}`);
    }

    // Validate encryption configuration
    if (!skipValidation) {
      console.log('🔐 Validating encryption configuration...');
      if (!validateEncryptionConfig()) {
        throw new Error('Encryption configuration validation failed');
      }
      console.log('✅ Encryption configuration is valid');
    }

    // Get existing tables
    const listTablesCommand = new ListTablesCommand({});
    const existingTablesResponse = await client.send(listTablesCommand);
    const existingTables = existingTablesResponse.TableNames || [];

    if (verbose) {
      console.log(`📋 Found ${existingTables.length} existing tables:`, existingTables);
    }

    // Show table configuration
    console.log('📝 Configured table names:');
    Object.entries(connectionInfo.tables).forEach(([key, tableName]) => {
      console.log(`   ${key}: ${tableName}`);
    });

    // Get table creation order
    const schemasToCreate = getTableCreationOrder();

    // Validate schemas
    if (!skipValidation) {
      console.log('🔍 Validating table schemas...');
      for (const schema of schemasToCreate) {
        if (!validateTableSchema(schema)) {
          throw new Error(`Invalid schema for table: ${schema.tableName}`);
        }
      }
      console.log('✅ All table schemas are valid');
    }

    // Create tables (if not using CDK/Terraform)
    for (const schema of schemasToCreate) {
      const tableType = schema.tableName as 'users' | 'sessions';
      const fullTableName = db.getTableName(tableType);
      
      // Check if table exists
      const tableExists = existingTables.includes(fullTableName);

      if (tableExists && !force) {
        console.log(`⏭️  Table ${fullTableName} already exists, skipping...`);
        continue;
      }

      if (tableExists && force) {
        console.log(`🗑️  Force mode: Table ${fullTableName} exists, but continuing with creation...`);
      }

      console.log(`📝 Creating table: ${fullTableName}`);

      // Set the full table name in the schema
      const createTableInput = {
        ...schema.createTableInput,
        TableName: fullTableName
      };

      try {
        const createCommand = new CreateTableCommand(createTableInput);
        await client.send(createCommand);

        // Wait for table to be active
        await waitForTableActive(client, fullTableName, verbose);
        
        console.log(`✅ Table ${fullTableName} created successfully`);
      } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
          console.log(`⚠️  Table ${fullTableName} already exists`);
        } else {
          console.error(`❌ Failed to create table ${fullTableName}:`, error.message);
          throw error;
        }
      }
    }

    console.log('🎉 Database setup completed successfully!');

    // Print summary
    console.log('\n📊 Setup Summary:');
    console.log(`   Environment: ${connectionInfo.isLocal ? 'Local Development' : 'AWS Production'}`);
    console.log(`   Tables configured: ${Object.keys(connectionInfo.tables).length}`);
    console.log(`   Encryption: ${process.env.ENCRYPTION_KEY ? 'Custom key' : 'Default demo key'}`);
    
    console.log('\n💡 Production Deployment:');
    console.log('   - Use CDK or Terraform to create tables');
    console.log('   - Configure IAM permissions for DynamoDB access');
    console.log('   - Set up monitoring and alarms');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Wait for table to become active
 */
async function waitForTableActive(client: any, tableName: string, verbose: boolean = false): Promise<void> {
  const maxAttempts = 30; // 5 minutes max wait time
  const delayMs = 10000; // 10 seconds between checks

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const describeCommand = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(describeCommand);
      
      const status = response.Table?.TableStatus;
      
      if (verbose) {
        console.log(`   Table ${tableName} status: ${status} (attempt ${attempt}/${maxAttempts})`);
      }

      if (status === 'ACTIVE') {
        return;
      }

      if (status === 'FAILED') {
        throw new Error(`Table ${tableName} creation failed`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Table doesn't exist yet, continue waiting
        if (verbose) {
          console.log(`   Table ${tableName} not found yet, waiting... (attempt ${attempt}/${maxAttempts})`);
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Timeout waiting for table ${tableName} to become active`);
}

/**
 * Main function for CLI usage
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const verbose = args.includes('--verbose');
  const skipValidation = args.includes('--skip-validation');

  try {
    await setupDatabase({ force, verbose, skipValidation });
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}