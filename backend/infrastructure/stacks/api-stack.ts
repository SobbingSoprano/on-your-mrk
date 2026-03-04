/**
 * API Stack - AWS AppSync GraphQL API
 */

import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import { OyMLambdaFunctions } from './lambda-stack';
import { OyMTables } from './database-stack';

export interface OyMApiStackProps extends cdk.StackProps {
  stage: string;
  lambdaFunctions: OyMLambdaFunctions;
  userPool: cognito.UserPool;
  tables: OyMTables;
}

export class OyMApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: OyMApiStackProps) {
    super(scope, id, props);

    const { stage, lambdaFunctions, userPool, tables } = props;

    // Create AppSync API
    this.api = new appsync.GraphqlApi(this, 'OyMApi', {
      name: `oym-api-${stage}`,
      definition: appsync.Definition.fromFile(
        path.join(__dirname, '../../graphql/schema.graphql')
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              name: 'default',
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
            },
          },
        ],
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR,
      },
      xrayEnabled: true,
    });

    // Create Lambda Data Sources
    const userResolverDS = this.api.addLambdaDataSource(
      'UserResolverDS',
      lambdaFunctions.userResolver
    );
    const courseResolverDS = this.api.addLambdaDataSource(
      'CourseResolverDS',
      lambdaFunctions.courseResolver
    );
    const routeResolverDS = this.api.addLambdaDataSource(
      'RouteResolverDS',
      lambdaFunctions.routeResolver
    );
    const safetyResolverDS = this.api.addLambdaDataSource(
      'SafetyResolverDS',
      lambdaFunctions.safetyResolver
    );
    const discourseResolverDS = this.api.addLambdaDataSource(
      'DiscourseResolverDS',
      lambdaFunctions.discourseResolver
    );
    const reviewResolverDS = this.api.addLambdaDataSource(
      'ReviewResolverDS',
      lambdaFunctions.reviewResolver
    );

    // ==================== USER RESOLVERS ====================
    userResolverDS.createResolver('GetUserResolver', {
      typeName: 'Query',
      fieldName: 'getUser',
    });
    userResolverDS.createResolver('GetCurrentUserResolver', {
      typeName: 'Query',
      fieldName: 'getCurrentUser',
    });
    userResolverDS.createResolver('UpdateUserProfileResolver', {
      typeName: 'Mutation',
      fieldName: 'updateUserProfile',
    });
    userResolverDS.createResolver('UpdateSafetySettingsResolver', {
      typeName: 'Mutation',
      fieldName: 'updateSafetySettings',
    });

    // ==================== COURSE RESOLVERS ====================
    courseResolverDS.createResolver('GetCourseResolver', {
      typeName: 'Query',
      fieldName: 'getCourse',
    });
    courseResolverDS.createResolver('ListCoursesResolver', {
      typeName: 'Query',
      fieldName: 'listCourses',
    });
    courseResolverDS.createResolver('SearchCoursesResolver', {
      typeName: 'Query',
      fieldName: 'searchCourses',
    });
    courseResolverDS.createResolver('GetNearbyCoursesResolver', {
      typeName: 'Query',
      fieldName: 'getNearbyCourses',
    });
    courseResolverDS.createResolver('CreateCourseResolver', {
      typeName: 'Mutation',
      fieldName: 'createCourse',
    });
    courseResolverDS.createResolver('UpdateCourseResolver', {
      typeName: 'Mutation',
      fieldName: 'updateCourse',
    });
    courseResolverDS.createResolver('DeleteCourseResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteCourse',
    });

    // ==================== ROUTE RESOLVERS ====================
    routeResolverDS.createResolver('GetActiveRouteResolver', {
      typeName: 'Query',
      fieldName: 'getActiveRoute',
    });
    routeResolverDS.createResolver('GetUserActiveRouteResolver', {
      typeName: 'Query',
      fieldName: 'getUserActiveRoute',
    });
    routeResolverDS.createResolver('StartRouteResolver', {
      typeName: 'Mutation',
      fieldName: 'startRoute',
    });
    routeResolverDS.createResolver('UpdateRouteLocationResolver', {
      typeName: 'Mutation',
      fieldName: 'updateRouteLocation',
    });
    routeResolverDS.createResolver('PauseRouteResolver', {
      typeName: 'Mutation',
      fieldName: 'pauseRoute',
    });
    routeResolverDS.createResolver('ResumeRouteResolver', {
      typeName: 'Mutation',
      fieldName: 'resumeRoute',
    });
    routeResolverDS.createResolver('CompleteRouteResolver', {
      typeName: 'Mutation',
      fieldName: 'completeRoute',
    });
    routeResolverDS.createResolver('CancelRouteResolver', {
      typeName: 'Mutation',
      fieldName: 'cancelRoute',
    });

    // ==================== SAFETY RESOLVERS ====================
    safetyResolverDS.createResolver('GetTrustedContactsResolver', {
      typeName: 'Query',
      fieldName: 'getTrustedContacts',
    });
    safetyResolverDS.createResolver('AddTrustedContactResolver', {
      typeName: 'Mutation',
      fieldName: 'addTrustedContact',
    });
    safetyResolverDS.createResolver('RemoveTrustedContactResolver', {
      typeName: 'Mutation',
      fieldName: 'removeTrustedContact',
    });
    safetyResolverDS.createResolver('TriggerEmergencyResolver', {
      typeName: 'Mutation',
      fieldName: 'triggerEmergency',
    });
    safetyResolverDS.createResolver('SendLocationPingResolver', {
      typeName: 'Mutation',
      fieldName: 'sendLocationPing',
    });
    safetyResolverDS.createResolver('UpdateAwolStatusResolver', {
      typeName: 'Mutation',
      fieldName: 'updateAwolStatus',
    });
    safetyResolverDS.createResolver('SaveBreadcrumbResolver', {
      typeName: 'Mutation',
      fieldName: 'saveBreadcrumb',
    });
    safetyResolverDS.createResolver('SaveParkingLocationResolver', {
      typeName: 'Mutation',
      fieldName: 'saveParkingLocation',
    });
    safetyResolverDS.createResolver('ClearParkingLocationResolver', {
      typeName: 'Mutation',
      fieldName: 'clearParkingLocation',
    });

    // ==================== DISCOURSE RESOLVERS ====================
    discourseResolverDS.createResolver('GetDiscourseSessionResolver', {
      typeName: 'Query',
      fieldName: 'getDiscourseSession',
    });
    discourseResolverDS.createResolver('ListDiscourseSessionsResolver', {
      typeName: 'Query',
      fieldName: 'listDiscourseSessions',
    });
    discourseResolverDS.createResolver('CreateDiscourseSessionResolver', {
      typeName: 'Mutation',
      fieldName: 'createDiscourseSession',
    });
    discourseResolverDS.createResolver('JoinDiscourseSessionResolver', {
      typeName: 'Mutation',
      fieldName: 'joinDiscourseSession',
    });
    discourseResolverDS.createResolver('LeaveDiscourseSessionResolver', {
      typeName: 'Mutation',
      fieldName: 'leaveDiscourseSession',
    });
    discourseResolverDS.createResolver('StartDiscourseSessionResolver', {
      typeName: 'Mutation',
      fieldName: 'startDiscourseSession',
    });
    discourseResolverDS.createResolver('UpdateSegmentStatusResolver', {
      typeName: 'Mutation',
      fieldName: 'updateSegmentStatus',
    });
    discourseResolverDS.createResolver('EndDiscourseSessionResolver', {
      typeName: 'Mutation',
      fieldName: 'endDiscourseSession',
    });

    // ==================== REVIEW RESOLVERS ====================
    reviewResolverDS.createResolver('GetCourseReviewsResolver', {
      typeName: 'Query',
      fieldName: 'getCourseReviews',
    });
    reviewResolverDS.createResolver('CreateReviewResolver', {
      typeName: 'Mutation',
      fieldName: 'createReview',
    });
    reviewResolverDS.createResolver('UpdateReviewResolver', {
      typeName: 'Mutation',
      fieldName: 'updateReview',
    });
    reviewResolverDS.createResolver('DeleteReviewResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteReview',
    });

    // Outputs
    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      exportName: `OyM-GraphQLApiUrl-${stage}`,
    });
    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: this.api.apiId,
      exportName: `OyM-GraphQLApiId-${stage}`,
    });
  }
}
