/**
 * Lambda Stack - All Lambda Functions
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import { OyMTables } from './database-stack';
import { OyMTopics, OyMQueues } from './notification-stack';

export interface OyMLambdaStackProps extends cdk.StackProps {
  stage: string;
  tables: OyMTables;
  userPool: cognito.UserPool;
  topics: OyMTopics;
  queues: OyMQueues;
  mediaBucket: s3.Bucket;
}

export interface OyMLambdaFunctions {
  userResolver: lambda.Function;
  courseResolver: lambda.Function;
  routeResolver: lambda.Function;
  safetyResolver: lambda.Function;
  discourseResolver: lambda.Function;
  reviewResolver: lambda.Function;
  emergencyAlert: lambda.Function;
  awolMonitor: lambda.Function;
  locationPing: lambda.Function;
  navigationService: lambda.Function;
}

export class OyMLambdaStack extends cdk.Stack {
  public readonly functions: OyMLambdaFunctions;

  constructor(scope: Construct, id: string, props: OyMLambdaStackProps) {
    super(scope, id, props);

    const { stage, tables, topics, queues, mediaBucket } = props;

    // Common Lambda environment variables
    const commonEnv = {
      STAGE: stage,
      USERS_TABLE: tables.users.tableName,
      COURSES_TABLE: tables.courses.tableName,
      ACTIVE_ROUTES_TABLE: tables.activeRoutes.tableName,
      ROUTE_HISTORY_TABLE: tables.routeHistory.tableName,
      TRUSTED_CONTACTS_TABLE: tables.trustedContacts.tableName,
      REVIEWS_TABLE: tables.reviews.tableName,
      DISCOURSE_SESSIONS_TABLE: tables.discourseSessions.tableName,
      BREADCRUMBS_TABLE: tables.breadcrumbs.tableName,
      EMERGENCY_ALERTS_TABLE: tables.emergencyAlerts.tableName,
      PARKING_LOCATIONS_TABLE: tables.parkingLocations.tableName,
      EMERGENCY_TOPIC_ARN: topics.emergency.topicArn,
      AWOL_TOPIC_ARN: topics.awol.topicArn,
      LOCATION_PING_TOPIC_ARN: topics.locationPing.topicArn,
      MEDIA_BUCKET: mediaBucket.bucketName,
    };

    const lambdaPath = path.join(__dirname, '../../lambda');

    // User Resolver Lambda
    const userResolver = new nodejs.NodejsFunction(this, 'UserResolver', {
      functionName: `oym-user-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/user/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Course Resolver Lambda
    const courseResolver = new nodejs.NodejsFunction(this, 'CourseResolver', {
      functionName: `oym-course-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/course/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Route Resolver Lambda
    const routeResolver = new nodejs.NodejsFunction(this, 'RouteResolver', {
      functionName: `oym-route-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/route/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Safety Resolver Lambda
    const safetyResolver = new nodejs.NodejsFunction(this, 'SafetyResolver', {
      functionName: `oym-safety-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/safety/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // dis'Course' Resolver Lambda
    const discourseResolver = new nodejs.NodejsFunction(this, 'DiscourseResolver', {
      functionName: `oym-discourse-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/discourse/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Review Resolver Lambda
    const reviewResolver = new nodejs.NodejsFunction(this, 'ReviewResolver', {
      functionName: `oym-review-resolver-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'resolvers/review/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Emergency Alert Lambda
    const emergencyAlert = new nodejs.NodejsFunction(this, 'EmergencyAlert', {
      functionName: `oym-emergency-alert-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'safety/emergency-alert/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // AWOL Monitor Lambda (scheduled)
    const awolMonitor = new nodejs.NodejsFunction(this, 'AwolMonitor', {
      functionName: `oym-awol-monitor-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'safety/awol-monitor/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Schedule AWOL Monitor to run every minute
    new events.Rule(this, 'AwolMonitorSchedule', {
      ruleName: `oym-awol-monitor-schedule-${stage}`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(awolMonitor)],
    });

    // Location Ping Lambda
    const locationPing = new nodejs.NodejsFunction(this, 'LocationPing', {
      functionName: `oym-location-ping-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'safety/location-ping/index.ts'),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Navigation Service Lambda
    const navigationService = new nodejs.NodejsFunction(this, 'NavigationService', {
      functionName: `oym-navigation-service-${stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(lambdaPath, 'services/navigation/index.ts'),
      environment: {
        ...commonEnv,
        MAPBOX_ACCESS_TOKEN: cdk.SecretValue.secretsManager('oym/mapbox-token').unsafeUnwrap(),
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Grant DynamoDB permissions
    const allTables = Object.values(tables);
    allTables.forEach((table) => {
      table.grantReadWriteData(userResolver);
      table.grantReadWriteData(courseResolver);
      table.grantReadWriteData(routeResolver);
      table.grantReadWriteData(safetyResolver);
      table.grantReadWriteData(discourseResolver);
      table.grantReadWriteData(reviewResolver);
      table.grantReadWriteData(emergencyAlert);
      table.grantReadWriteData(awolMonitor);
      table.grantReadWriteData(locationPing);
      table.grantReadData(navigationService);
    });

    // Grant SNS permissions
    topics.emergency.grantPublish(emergencyAlert);
    topics.emergency.grantPublish(awolMonitor);
    topics.awol.grantPublish(awolMonitor);
    topics.locationPing.grantPublish(locationPing);

    // Grant S3 permissions
    mediaBucket.grantReadWrite(userResolver);
    mediaBucket.grantReadWrite(courseResolver);

    this.functions = {
      userResolver,
      courseResolver,
      routeResolver,
      safetyResolver,
      discourseResolver,
      reviewResolver,
      emergencyAlert,
      awolMonitor,
      locationPing,
      navigationService,
    };
  }
}
