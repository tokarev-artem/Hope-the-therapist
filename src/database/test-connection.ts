/**
 * Test script to verify database connection and basic operations
 */

import 'dotenv/config';
import { 
  initializeDatabaseConnection, 
  checkDatabaseHealth,
  usersRepository,
  settingsRepository,
  validateEncryptionConfig
} from './index';

async function testDatabaseConnection(): Promise<void> {
  console.log('🧪 Testing database connection and operations...\n');

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

    // Test connection health
    console.log('\n3. Testing connection health...');
    const health = await checkDatabaseHealth();
    console.log(`   Status: ${health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`   Connection test: ${health.details.connectionTest ? '✅ Passed' : '❌ Failed'}\n`);

    if (health.status !== 'healthy') {
      console.log('❌ Database connection is not healthy. Please check your configuration.');
      return;
    }

    // Test basic operations (only if tables exist)
    console.log('4. Testing basic repository operations...');
    
    try {
      // Test creating a user
      console.log('   Creating test user...');
      const testUser = await usersRepository.createUser({
        isAnonymous: true,
        preferences: {
          theme: 'ocean-calm',
          motionIntensity: 0.8,
          colorIntensity: 0.7,
          animationSpeed: 1.0,
          reducedMotion: false,
          highContrast: false,
          audioSensitivity: 0.6
        }
      });
      console.log(`   ✅ User created with ID: ${testUser.userId}`);

      // Test creating settings for the user
      console.log('   Creating test settings...');
      const testSettings = await settingsRepository.upsertSettings({
        userId: testUser.userId,
        waveSettings: {
          theme: 'ocean-calm',
          motionIntensity: 0.8,
          animationSpeed: 1.0,
          reducedMotion: false,
          waveComplexity: 'moderate'
        },
        audioSettings: {
          inputSensitivity: 0.6,
          outputVolume: 0.8,
          noiseReduction: true,
          voiceEnhancement: false,
          binauralBeats: false
        },
        privacySettings: {
          storeConversations: true,
          encryptSensitiveData: true,
          dataRetentionDays: 30,
          shareAnonymizedData: false,
          allowAnalytics: true
        },
        therapeuticSettings: {
          sessionGoals: ['reduce-anxiety', 'improve-mood'],
          triggerWords: [],
          copingStrategies: ['deep-breathing', 'mindfulness'],
          reminderFrequency: 'weekly',
          progressSharing: false
        }
      });
      console.log(`   ✅ Settings created for user: ${testSettings.userId}`);

      // Test retrieving the user
      console.log('   Retrieving test user...');
      const retrievedUser = await usersRepository.getUserById(testUser.userId);
      console.log(`   ✅ User retrieved: ${retrievedUser ? 'Success' : 'Failed'}`);

      // Test retrieving settings
      console.log('   Retrieving test settings...');
      const retrievedSettings = await settingsRepository.getSettingsByUserId(testUser.userId);
      console.log(`   ✅ Settings retrieved: ${retrievedSettings ? 'Success' : 'Failed'}`);

      // Clean up test data
      console.log('   Cleaning up test data...');
      await usersRepository.deleteUser(testUser.userId);
      console.log('   ✅ Test data cleaned up');

    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('   ⚠️  Tables not found. Run "npm run db:setup" to create tables first.');
      } else {
        console.log(`   ❌ Repository operations failed: ${error.message}`);
      }
    }

    console.log('\n🎉 Database connection test completed!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseConnection();
}

export { testDatabaseConnection };