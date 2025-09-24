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
  sanitizeBeforeEncryption
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
      GSI1PK: session.userId,
      GSI1SK: session.startTime
    };

    // Encrypt transcript if present
    if (session.encryptedTranscript) {
      const sanitized = sanitizeBeforeEncryption(session.encryptedTranscript);
      dynamoSession.encryptedTranscript = encryptSensitiveData(sanitized);
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

    return this.convertFromDynamoSession(response.Item as DynamoDBSession);
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
      expressionAttributeValues[':encryptedTranscript'] = encryptSensitiveData(sanitized);
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

    return this.convertFromDynamoSession(response.Attributes as DynamoDBSession);
  }

  /**
   * Get sessions by user ID
   */
  async getSessionsByUserId(userId: string, limit: number = 50): Promise<Session[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'userId-startTime-index',
        KeyConditionExpression: 'GSI1PK = :userId',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}` 
        },
        ScanIndexForward: false,
        Limit: limit
      });

      const response = await this.docClient.send(command);
      if (!response.Items) {
        return [];
      }

      return response.Items.map(item => this.convertFromDynamoSession(item as DynamoDBSession));
    } catch (error) {
      console.error('Error fetching sessions by userId:', error);
      throw error;
    }
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

  private convertFromDynamoSession(dynamoSession: DynamoDBSession): Session {
    const session: Session = {
      ...dynamoSession,
      emotionalState: JSON.parse(dynamoSession.emotionalState),
      wavePatterns: JSON.parse(dynamoSession.wavePatterns),
      therapeuticMetrics: JSON.parse(dynamoSession.therapeuticMetrics)
    };

    // Decrypt transcript if present
    if (dynamoSession.encryptedTranscript) {
      try {
        session.encryptedTranscript = decryptSensitiveData(dynamoSession.encryptedTranscript);
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