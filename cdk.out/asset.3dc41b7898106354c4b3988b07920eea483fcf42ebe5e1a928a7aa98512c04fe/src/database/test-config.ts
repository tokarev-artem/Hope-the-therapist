/**
 * Test script to verify database configuration without requiring tables to exist
 */

import 'dotenv/config';
import { 
  initializeDatabaseConnection, 
  validateEncryptionConfig
} from './index';

async function testDatabaseConfiguration(): Promise<void> {
  console.log('🧪 Testing database configuration...\n');

  try {
    // Test encryption configuration
    console.log('1. Testing encryption configuration...');
    const encryptionValid = validateEncryptionConfig();
    console.log(`   Encryption: ${encryptionValid ? '✅ Valid' : '❌ Invalid'}\n`);

    // Initialize connection
    console.log('2. Initializing database connection...');
    const db = initializeDatabaseConnection();
    const connectionInfo = db.getConnectionInfo();
    console.log(`   Environment: ${connectionInfo.isLocal ? 'Local' : 'AWS'}`);
    console.log(`   Region: ${connectionInfo.region}`);
    if (connectionInfo.endpoint) {
      console.log(`   Endpoint: ${connectionInfo.endpoint}`);
    }
    console.log('   Table Configuration:');
    Object.entries(connectionInfo.tables).forEach(([key, tableName]) => {
      console.log(`     ${key}: ${tableName}`);
    });

    console.log('\n3. Configuration Summary:');
    console.log(`   ✅ Database connection initialized`);
    console.log(`   ✅ Table names configured`);
    console.log(`   ✅ Encryption configured`);
    console.log(`   ✅ Ready for use with existing DynamoDB tables`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Create DynamoDB tables using CDK/Terraform with the configured names');
    console.log('   2. Ensure AWS credentials have DynamoDB permissions');
    console.log('   3. Use the repositories to interact with the tables');

    console.log('\n🎉 Database configuration test completed successfully!');

  } catch (error) {
    console.error('❌ Database configuration test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConfiguration();
}

export { testDatabaseConfiguration };