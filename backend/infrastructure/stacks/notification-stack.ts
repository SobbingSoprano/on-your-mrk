/**
 * Notification Stack - SNS Topics and SQS Queues
 */

import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface OyMNotificationStackProps extends cdk.StackProps {
  stage: string;
}

export interface OyMTopics {
  emergency: sns.Topic;
  awol: sns.Topic;
  locationPing: sns.Topic;
  routeUpdates: sns.Topic;
}

export interface OyMQueues {
  emergencyProcessing: sqs.Queue;
  awolProcessing: sqs.Queue;
  notificationDelivery: sqs.Queue;
}

export class OyMNotificationStack extends cdk.Stack {
  public readonly topics: OyMTopics;
  public readonly queues: OyMQueues;

  constructor(scope: Construct, id: string, props: OyMNotificationStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Dead Letter Queue for failed notifications
    const dlq = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: `oym-notification-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Emergency Processing Queue
    const emergencyProcessingQueue = new sqs.Queue(this, 'EmergencyProcessingQueue', {
      queueName: `oym-emergency-processing-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // AWOL Processing Queue
    const awolProcessingQueue = new sqs.Queue(this, 'AwolProcessingQueue', {
      queueName: `oym-awol-processing-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Notification Delivery Queue
    const notificationDeliveryQueue = new sqs.Queue(this, 'NotificationDeliveryQueue', {
      queueName: `oym-notification-delivery-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 5,
      },
    });

    // Emergency Topic
    const emergencyTopic = new sns.Topic(this, 'EmergencyTopic', {
      topicName: `oym-emergency-${stage}`,
      displayName: 'OyM Emergency Alerts',
    });
    emergencyTopic.addSubscription(
      new subscriptions.SqsSubscription(emergencyProcessingQueue)
    );

    // AWOL Topic
    const awolTopic = new sns.Topic(this, 'AwolTopic', {
      topicName: `oym-awol-${stage}`,
      displayName: 'OyM AWOL Alerts',
    });
    awolTopic.addSubscription(
      new subscriptions.SqsSubscription(awolProcessingQueue)
    );

    // Location Ping Topic
    const locationPingTopic = new sns.Topic(this, 'LocationPingTopic', {
      topicName: `oym-location-ping-${stage}`,
      displayName: 'OyM Location Pings',
    });

    // Route Updates Topic (for real-time sync)
    const routeUpdatesTopic = new sns.Topic(this, 'RouteUpdatesTopic', {
      topicName: `oym-route-updates-${stage}`,
      displayName: 'OyM Route Updates',
    });

    this.topics = {
      emergency: emergencyTopic,
      awol: awolTopic,
      locationPing: locationPingTopic,
      routeUpdates: routeUpdatesTopic,
    };

    this.queues = {
      emergencyProcessing: emergencyProcessingQueue,
      awolProcessing: awolProcessingQueue,
      notificationDelivery: notificationDeliveryQueue,
    };

    // Outputs
    new cdk.CfnOutput(this, 'EmergencyTopicArn', {
      value: emergencyTopic.topicArn,
      exportName: `OyM-EmergencyTopic-${stage}`,
    });
    new cdk.CfnOutput(this, 'AwolTopicArn', {
      value: awolTopic.topicArn,
      exportName: `OyM-AwolTopic-${stage}`,
    });
  }
}
