/**
 * Storage Stack - S3 Buckets
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface OyMStorageStackProps extends cdk.StackProps {
  stage: string;
}

export class OyMStorageStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly routesBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: OyMStorageStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // Media bucket (profile images, course images, etc.)
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `oym-media-${stage}-${this.account}`,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          maxAge: 3000,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: stage === 'prod',
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
    });

    // Routes/GPX data bucket
    this.routesBucket = new s3.Bucket(this, 'RoutesBucket', {
      bucketName: `oym-routes-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: stage === 'prod',
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
          prefix: 'temp/',
        },
      ],
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
    });

    // CloudFront Distribution for media
    this.distribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.mediaBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      comment: `OyM Media Distribution - ${stage}`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      exportName: `OyM-MediaBucket-${stage}`,
    });
    new cdk.CfnOutput(this, 'RoutesBucketName', {
      value: this.routesBucket.bucketName,
      exportName: `OyM-RoutesBucket-${stage}`,
    });
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      exportName: `OyM-MediaUrl-${stage}`,
    });
  }
}
