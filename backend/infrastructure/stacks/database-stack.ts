/**
 * Database Stack - DynamoDB Tables
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface OyMDatabaseStackProps extends cdk.StackProps {
  stage: string;
}

export interface OyMTables {
  users: dynamodb.Table;
  courses: dynamodb.Table;
  activeRoutes: dynamodb.Table;
  routeHistory: dynamodb.Table;
  trustedContacts: dynamodb.Table;
  reviews: dynamodb.Table;
  discourseSessions: dynamodb.Table;
  breadcrumbs: dynamodb.Table;
  emergencyAlerts: dynamodb.Table;
  parkingLocations: dynamodb.Table;
}

export class OyMDatabaseStack extends cdk.Stack {
  public readonly tables: OyMTables;

  constructor(scope: Construct, id: string, props: OyMDatabaseStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Users Table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `oym-users-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // Courses Table
    const coursesTable = new dynamodb.Table(this, 'CoursesTable', {
      tableName: `oym-courses-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    coursesTable.addGlobalSecondaryIndex({
      indexName: 'creator-index',
      partitionKey: { name: 'creatorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
    coursesTable.addGlobalSecondaryIndex({
      indexName: 'geohash-index',
      partitionKey: { name: 'geohash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Active Routes Table
    const activeRoutesTable = new dynamodb.Table(this, 'ActiveRoutesTable', {
      tableName: `oym-active-routes-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    activeRoutesTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });
    activeRoutesTable.addGlobalSecondaryIndex({
      indexName: 'awol-deadline-index',
      partitionKey: { name: 'awolStatus', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'awolDeadline', type: dynamodb.AttributeType.STRING },
    });

    // Route History Table
    const routeHistoryTable = new dynamodb.Table(this, 'RouteHistoryTable', {
      tableName: `oym-route-history-${stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Trusted Contacts Table
    const trustedContactsTable = new dynamodb.Table(this, 'TrustedContactsTable', {
      tableName: `oym-trusted-contacts-${stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Reviews Table
    const reviewsTable = new dynamodb.Table(this, 'ReviewsTable', {
      tableName: `oym-reviews-${stage}`,
      partitionKey: { name: 'courseId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    reviewsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // dis'Course' Sessions Table
    const discourseSessionsTable = new dynamodb.Table(this, 'DiscourseSessionsTable', {
      tableName: `oym-discourse-sessions-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    discourseSessionsTable.addGlobalSecondaryIndex({
      indexName: 'host-index',
      partitionKey: { name: 'hostUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Breadcrumbs Table (for offline GPS trails)
    const breadcrumbsTable = new dynamodb.Table(this, 'BreadcrumbsTable', {
      tableName: `oym-breadcrumbs-${stage}`,
      partitionKey: { name: 'routeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sequenceNumber', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Emergency Alerts Table
    const emergencyAlertsTable = new dynamodb.Table(this, 'EmergencyAlertsTable', {
      tableName: `oym-emergency-alerts-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    emergencyAlertsTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Parking Locations Table (WDIPA?)
    const parkingLocationsTable = new dynamodb.Table(this, 'ParkingLocationsTable', {
      tableName: `oym-parking-locations-${stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.tables = {
      users: usersTable,
      courses: coursesTable,
      activeRoutes: activeRoutesTable,
      routeHistory: routeHistoryTable,
      trustedContacts: trustedContactsTable,
      reviews: reviewsTable,
      discourseSessions: discourseSessionsTable,
      breadcrumbs: breadcrumbsTable,
      emergencyAlerts: emergencyAlertsTable,
      parkingLocations: parkingLocationsTable,
    };

    // Outputs
    new cdk.CfnOutput(this, 'UsersTableName', { value: usersTable.tableName });
    new cdk.CfnOutput(this, 'CoursesTableName', { value: coursesTable.tableName });
    new cdk.CfnOutput(this, 'ActiveRoutesTableName', { value: activeRoutesTable.tableName });
  }
}
