// TEMPLATE - Copy to environment.dart and fill in your values
// DO NOT COMMIT environment.dart TO VERSION CONTROL

class Environment {
  Environment._();

  // Mapbox - Get from https://account.mapbox.com/access-tokens/
  static const String mapboxAccessToken = 'YOUR_MAPBOX_TOKEN';

  // AWS Region
  static const String awsRegion = 'YOUR_REGION';

  // AppSync - Get from CDK deployment outputs
  static const String graphqlEndpoint = 'YOUR_APPSYNC_ENDPOINT';

  // CloudFront CDN - Get from CDK deployment outputs
  static const String mediaCdnUrl = 'YOUR_CLOUDFRONT_URL';

  // S3 Buckets - Get from CDK deployment outputs
  static const String mediaBucket = 'YOUR_S3_BUCKET';

  // App Config
  static const bool isDevelopment = true;
  static const String appName = 'on your Mark!';
}
