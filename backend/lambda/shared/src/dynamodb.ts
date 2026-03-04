/**
 * DynamoDB Utilities
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Get a single item by primary key
 */
export async function getItem<T>(
  tableName: string,
  key: Record<string, any>
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );
  return (result.Item as T) || null;
}

/**
 * Put a new item
 */
export async function putItem<T>(
  tableName: string,
  item: T
): Promise<T> {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item as Record<string, any>,
    })
  );
  return item;
}

/**
 * Update an item with an update expression
 */
export async function updateItem<T>(
  tableName: string,
  key: Record<string, any>,
  updates: Partial<T>
): Promise<T> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.entries(updates).forEach(([field, value]) => {
    if (value !== undefined) {
      const attrName = `#${field}`;
      const attrValue = `:${field}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = field;
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length === 0) {
    throw new Error('No fields to update');
  }

  // Add updatedAt
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as T;
}

/**
 * Delete an item
 */
export async function deleteItem(
  tableName: string,
  key: Record<string, any>
): Promise<boolean> {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    })
  );
  return true;
}

/**
 * Query items
 */
export async function queryItems<T>(
  tableName: string,
  params: Omit<QueryCommandInput, 'TableName'>
): Promise<{ items: T[]; nextToken?: string }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      ...params,
    })
  );
  return {
    items: (result.Items as T[]) || [],
    nextToken: result.LastEvaluatedKey
      ? JSON.stringify(result.LastEvaluatedKey)
      : undefined,
  };
}

/**
 * Scan items
 */
export async function scanItems<T>(
  tableName: string,
  params: Omit<ScanCommandInput, 'TableName'>
): Promise<{ items: T[]; nextToken?: string }> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      ...params,
    })
  );
  return {
    items: (result.Items as T[]) || [],
    nextToken: result.LastEvaluatedKey
      ? JSON.stringify(result.LastEvaluatedKey)
      : undefined,
  };
}
