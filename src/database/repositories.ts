/**
 * Repository pattern implementation for DynamoDB data access
 * Provides CRUD operations for all data models with encryption support
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { getDatabaseConnection } from './connection';
import {
  User,
  Session,
  DynamoDBUser,
  DynamoDBSession,
  CreateUserInput,
  UpdateUserInput,
  CreateSessionInput,
  UpdateSessionInput
} from './models';
import {
  encryptSensitiveData,
  decryptSensitiveData,
  generateSecureUserId,
  generateSecureSessionId,
  sanitizeBeforeEncryption,
  encryptTranscriptWithKMS,
  decryptTranscriptWithKMS
} from './encryption';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base repository class with common functionality
 */
abstract class BaseRepository {
  protected db = getDatabaseConnection();
  protected docClient = this.db.getDocumentClient();

  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  protected generateId(): string {
    return uuidv4();
  }
}

/**
 * Users repository
 */
export class UsersRepository extends BaseRepository {
  private tableName = this.db.getTableName('users');

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const userId = generateSecureUserId();
    const now = this.getCurrentTimestamp();

    const user: User = {
      userId,
      createdAt: now,
      lastActiveAt: now,
      ...input
    };

    // Convert to DynamoDB format
    const dynamoUser: DynamoDBUser = {
      ...user,
      isAnonymous: user.isAnonymous.toString(), // Convert boolean to string for DynamoDB
      preferences: JSON.stringify(user.preferences),
      GSI1PK: user.isAnonymous.toString(), // Convert boolean to string for GSI
      GSI1SK: user.lastActiveAt
    };

    // Encrypt sensitive data if present
    if (user.encryptedData) {
      const sanitized = sanitizeBeforeEncryption(user.encryptedData);
      dynamoUser.encryptedData = encryptSensitiveData(sanitized);
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dynamoUser
    });

    await this.docClient.send(command);
    return user;
  }

  /**
   * Create a new user with a specific userId (e.g., frontend UUID) and prevent duplicates
   * Uses a conditional put to ensure we don't overwrite existing users
   */
  async createUserWithId(userId: string, input: CreateUserInput): Promise<User> {
    const now = this.getCurrentTimestamp();

    const user: User = {
      userId,
      createdAt: now,
      lastActiveAt: now,
      ...input
    };

    // Convert to DynamoDB format
    const dynamoUser: DynamoDBUser = {
      ...user,
      isAnonymous: user.isAnonymous.toString(),
      preferences: JSON.stringify(user.preferences),
      GSI1PK: user.isAnonymous.toString(),
      GSI1SK: user.lastActiveAt
    };

    // Encrypt sensitive data if present
    if (user.encryptedData) {
      const sanitized = sanitizeBeforeEncryption(user.encryptedData);
      dynamoUser.encryptedData = encryptSensitiveData(sanitized);
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dynamoUser,
      ConditionExpression: 'attribute_not_exists(#pk)',
      ExpressionAttributeNames: { '#pk': 'userId' }
    });

    await this.docClient.send(command);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { userId }
    });

    const response = await this.docClient.send(command);
    if (!response.Item) {
      return null;
    }

    return this.convertFromDynamoUser(response.Item as DynamoDBUser);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression
    if (input.lastActiveAt !== undefined) {
      updateExpressions.push('#lastActiveAt = :lastActiveAt');
      expressionAttributeNames['#lastActiveAt'] = 'lastActiveAt';
      expressionAttributeValues[':lastActiveAt'] = input.lastActiveAt;

      // Update GSI sort key as well
      updateExpressions.push('GSI1SK = :lastActiveAt');
    }

    if (input.preferences !== undefined) {
      updateExpressions.push('#preferences = :preferences');
      expressionAttributeNames['#preferences'] = 'preferences';
      expressionAttributeValues[':preferences'] = JSON.stringify(input.preferences);
    }

    if (input.encryptedData !== undefined) {
      const sanitized = sanitizeBeforeEncryption(input.encryptedData);
      updateExpressions.push('#encryptedData = :encryptedData');
      expressionAttributeNames['#encryptedData'] = 'encryptedData';
      expressionAttributeValues[':encryptedData'] = encryptSensitiveData(sanitized);
    }

    if (updateExpressions.length === 0) {
      return this.getUserById(userId);
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const response = await this.docClient.send(command);
    if (!response.Attributes) {
      return null;
    }

    return this.convertFromDynamoUser(response.Attributes as DynamoDBUser);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { userId }
    });

    await this.docClient.send(command);
    return true;
  }

  /**
   * Get anonymous users by last activity
   */
  async getAnonymousUsersByActivity(limit: number = 50): Promise<User[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'isAnonymous-lastActiveAt-index',
      KeyConditionExpression: 'isAnonymous = :isAnonymous',
      ExpressionAttributeValues: {
        ':isAnonymous': 'true'
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    });

    const response = await this.docClient.send(command);
    if (!response.Items) {
      return [];
    }

    return response.Items.map(item => this.convertFromDynamoUser(item as DynamoDBUser));
  }

  private convertFromDynamoUser(dynamoUser: DynamoDBUser): User {
    const user: User = {
      ...dynamoUser,
      isAnonymous: dynamoUser.isAnonymous === 'true', // Convert string back to boolean
      preferences: JSON.parse(dynamoUser.preferences)
    };

    // Decrypt sensitive data if present
    if (dynamoUser.encryptedData) {
      try {
        user.encryptedData = decryptSensitiveData(dynamoUser.encryptedData);
      } catch (error) {
        console.error('Failed to decrypt user data:', error);
        // Don't fail the entire operation, just omit the encrypted data
        delete user.encryptedData;
      }
    }

    return user;
  }
}

/**
 * Sessions repository
 */
export class SessionsRepository extends BaseRepository {
  private tableName = this.db.getTableName('sessions');

  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    const sessionId = generateSecureSessionId();
    const startTime = this.getCurrentTimestamp();

    const session: Session = {
      sessionId,
      startTime,
      ...input
    };

    // Convert to DynamoDB format
    const dynamoSession: DynamoDBSession = {
      ...session,
      emotionalState: JSON.stringify(session.emotionalState),
      wavePatterns: JSON.stringify(session.wavePatterns),
      therapeuticMetrics: JSON.stringify(session.therapeuticMetrics),
      keyTopics: session.keyTopics ? JSON.stringify(session.keyTopics) : undefined,
      therapeuticProgress: session.therapeuticProgress ? JSON.stringify(session.therapeuticProgress) : undefined,
      // Write legacy GSI attributes for compatibility with existing deployments
      GSI1PK: session.userId,
      GSI1SK: session.startTime
    };

    // Encrypt transcript if present using KMS
    if (session.encryptedTranscript) {
      const sanitized = sanitizeBeforeEncryption(session.encryptedTranscript);
      dynamoSession.encryptedTranscript = await encryptTranscriptWithKMS(sanitized);
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: dynamoSession
    });

    await this.docClient.send(command);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { sessionId }
    });

    const response = await this.docClient.send(command);
    if (!response.Item) {
      return null;
    }

    return await this.convertFromDynamoSession(response.Item as DynamoDBSession);
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, input: UpdateSessionInput): Promise<Session | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression for various fields
    if (input.endTime !== undefined) {
      updateExpressions.push('#endTime = :endTime');
      expressionAttributeNames['#endTime'] = 'endTime';
      expressionAttributeValues[':endTime'] = input.endTime;
    }

    if (input.duration !== undefined) {
      updateExpressions.push('#duration = :duration');
      expressionAttributeNames['#duration'] = 'duration';
      expressionAttributeValues[':duration'] = input.duration;
    }

    if (input.conversationSummary !== undefined) {
      updateExpressions.push('#conversationSummary = :conversationSummary');
      expressionAttributeNames['#conversationSummary'] = 'conversationSummary';
      expressionAttributeValues[':conversationSummary'] = input.conversationSummary;
    }

    if (input.emotionalState !== undefined) {
      updateExpressions.push('#emotionalState = :emotionalState');
      expressionAttributeNames['#emotionalState'] = 'emotionalState';
      expressionAttributeValues[':emotionalState'] = JSON.stringify(input.emotionalState);
    }

    if (input.wavePatterns !== undefined) {
      updateExpressions.push('#wavePatterns = :wavePatterns');
      expressionAttributeNames['#wavePatterns'] = 'wavePatterns';
      expressionAttributeValues[':wavePatterns'] = JSON.stringify(input.wavePatterns);
    }

    if (input.therapeuticMetrics !== undefined) {
      updateExpressions.push('#therapeuticMetrics = :therapeuticMetrics');
      expressionAttributeNames['#therapeuticMetrics'] = 'therapeuticMetrics';
      expressionAttributeValues[':therapeuticMetrics'] = JSON.stringify(input.therapeuticMetrics);
    }

    if (input.encryptedTranscript !== undefined) {
      const sanitized = sanitizeBeforeEncryption(input.encryptedTranscript);
      updateExpressions.push('#encryptedTranscript = :encryptedTranscript');
      expressionAttributeNames['#encryptedTranscript'] = 'encryptedTranscript';
      expressionAttributeValues[':encryptedTranscript'] = await encryptTranscriptWithKMS(sanitized);
    }

    if (updateExpressions.length === 0) {
      return this.getSessionById(sessionId);
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { sessionId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const response = await this.docClient.send(command);
    if (!response.Attributes) {
      return null;
    }

    return await this.convertFromDynamoSession(response.Attributes as DynamoDBSession);
  }

  /**
   * Get sessions by user ID
   */
  async getSessionsByUserId(userId: string, limit: number = 50): Promise<Session[]> {
    const indexCandidates = [
      'userId-startTime-index',
      'GSI1PK-GSI1SK-index',
      'UserIdStartTimeIndex',
      'userIdStartTimeIndex'
    ];

    // Try all index names with both key schema variants
    for (const indexName of indexCandidates) {
      // Variant A: Using userId key
      try {
        const cmd = new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: '#uid = :userId',
          ExpressionAttributeNames: { '#uid': 'userId' },
          ExpressionAttributeValues: { ':userId': userId },
          ScanIndexForward: false,
          Limit: limit
        });
        const resp = await this.docClient.send(cmd);
        if (resp.Items && resp.Items.length > 0) {
          return await Promise.all(resp.Items.map(item => this.convertFromDynamoSession(item as DynamoDBSession)));
        }
      } catch (e: any) {
        // proceed to variant B
      }

      // Variant B: Using legacy GSI1PK (no prefix)
      try {
        const cmdLegacy = new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'GSI1PK' },
          ExpressionAttributeValues: { ':pk': userId },
          ScanIndexForward: false,
          Limit: limit
        });
        const legacyResp = await this.docClient.send(cmdLegacy);
        if (legacyResp.Items && legacyResp.Items.length > 0) {
          return await Promise.all(legacyResp.Items.map(item => this.convertFromDynamoSession(item as DynamoDBSession)));
        }
      } catch (e: any) {
        // proceed to variant C
      }

      // Variant C: Using legacy GSI1PK with USER# prefix
      try {
        const cmdPref = new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: '#pk = :pk',
          ExpressionAttributeNames: { '#pk': 'GSI1PK' },
          ExpressionAttributeValues: { ':pk': `USER#${userId}` },
          ScanIndexForward: false,
          Limit: limit
        });
        const prefResp = await this.docClient.send(cmdPref);
        if (prefResp.Items && prefResp.Items.length > 0) {
          return await Promise.all(prefResp.Items.map(item => this.convertFromDynamoSession(item as DynamoDBSession)));
        }
      } catch (e: any) {
        // try next index candidate
      }
    }

    // If we reach here, nothing found
    return [];
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { sessionId }
    });

    await this.docClient.send(command);
    return true;
  }

  private async convertFromDynamoSession(dynamoSession: DynamoDBSession): Promise<Session> {
    const session: Session = {
      ...dynamoSession,
      emotionalState: JSON.parse(dynamoSession.emotionalState),
      wavePatterns: JSON.parse(dynamoSession.wavePatterns),
      therapeuticMetrics: JSON.parse(dynamoSession.therapeuticMetrics),
      keyTopics: dynamoSession.keyTopics ? JSON.parse(dynamoSession.keyTopics) : undefined,
      therapeuticProgress: dynamoSession.therapeuticProgress ? JSON.parse(dynamoSession.therapeuticProgress) : undefined
    };

    // Decrypt transcript if present using KMS
    if (dynamoSession.encryptedTranscript) {
      try {
        session.encryptedTranscript = await decryptTranscriptWithKMS(dynamoSession.encryptedTranscript);
      } catch (error) {
        console.error('Failed to decrypt session transcript:', error);
        delete session.encryptedTranscript;
      }
    }

    return session;
  }
}



// Export repository instances
export const usersRepository = new UsersRepository();
export const sessionsRepository = new SessionsRepository();