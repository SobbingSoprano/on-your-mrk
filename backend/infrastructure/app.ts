#!/usr/bin/env node
/**
 * on your Mark! - AWS CDK Application Entry Point
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OyMDatabaseStack } from './stacks/database-stack';
import { OyMAuthStack } from './stacks/auth-stack';
import { OyMApiStack } from './stacks/api-stack';
import { OyMLambdaStack } from './stacks/lambda-stack';
import { OyMStorageStack } from './stacks/storage-stack';
import { OyMNotificationStack } from './stacks/notification-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stage = app.node.tryGetContext('stage') || 'dev';

// Database Stack - DynamoDB tables
const databaseStack = new OyMDatabaseStack(app, `OyM-Database-${stage}`, {
  env,
  stage,
});

// Storage Stack - S3 buckets for media
const storageStack = new OyMStorageStack(app, `OyM-Storage-${stage}`, {
  env,
  stage,
});

// Auth Stack - Cognito User Pool
const authStack = new OyMAuthStack(app, `OyM-Auth-${stage}`, {
  env,
  stage,
});

// Notification Stack - SNS Topics, SQS Queues
const notificationStack = new OyMNotificationStack(app, `OyM-Notifications-${stage}`, {
  env,
  stage,
});

// Lambda Stack - All Lambda functions
const lambdaStack = new OyMLambdaStack(app, `OyM-Lambda-${stage}`, {
  env,
  stage,
  tables: databaseStack.tables,
  userPool: authStack.userPool,
  topics: notificationStack.topics,
  queues: notificationStack.queues,
  mediaBucket: storageStack.mediaBucket,
});

// API Stack - AppSync and API Gateway
const apiStack = new OyMApiStack(app, `OyM-Api-${stage}`, {
  env,
  stage,
  lambdaFunctions: lambdaStack.functions,
  userPool: authStack.userPool,
  tables: databaseStack.tables,
});

// Add dependencies
lambdaStack.addDependency(databaseStack);
lambdaStack.addDependency(authStack);
lambdaStack.addDependency(notificationStack);
lambdaStack.addDependency(storageStack);
apiStack.addDependency(lambdaStack);

// Tags
cdk.Tags.of(app).add('Project', 'on-your-mark');
cdk.Tags.of(app).add('Stage', stage);
