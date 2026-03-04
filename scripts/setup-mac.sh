#!/bin/bash
# on your Mark! - Mac Setup Script
# Run this after cloning the repo on your MacBook Pro

set -e

echo "🏃 Setting up on your Mark! for macOS..."
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter not found. Install from https://docs.flutter.dev/get-started/install/macos"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install with: brew install node"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "⚠️  AWS CLI not found. Install with: brew install awscli"
    echo "   You can continue, but won't be able to deploy backend changes."
fi

echo "✅ Prerequisites OK"
echo ""

# Get the script directory and move to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# Backend setup
echo "📦 Setting up backend..."
cd backend
npm install
echo "✅ Backend dependencies installed"
cd ..

# Flutter setup
echo "📱 Setting up Flutter app..."
cd app
flutter pub get

# Create config files if they don't exist
if [ ! -f "lib/core/config/environment.dart" ]; then
    echo ""
    echo "⚠️  Creating environment.dart - YOU MUST EDIT THIS FILE!"
    cp lib/core/config/environment.example.dart lib/core/config/environment.dart
fi

if [ ! -f "lib/amplifyconfiguration.dart" ]; then
    echo ""
    echo "⚠️  Creating amplifyconfiguration.dart - YOU MUST EDIT THIS FILE!"
    cat > lib/amplifyconfiguration.dart << 'EOF'
// Generated Amplify Configuration - dev environment
// DO NOT COMMIT THIS FILE TO VERSION CONTROL

const amplifyconfig = '''{
  "UserAgent": "aws-amplify-cli/2.0",
  "Version": "1.0",
  "api": {
    "plugins": {
      "awsAPIPlugin": {
        "oymApi": {
          "endpointType": "GraphQL",
          "endpoint": "YOUR_APPSYNC_ENDPOINT",
          "region": "us-east-2",
          "authorizationType": "AMAZON_COGNITO_USER_POOLS"
        }
      }
    }
  },
  "auth": {
    "plugins": {
      "awsCognitoAuthPlugin": {
        "UserAgent": "aws-amplify-cli/0.1.0",
        "Version": "0.1.0",
        "IdentityManager": {
          "Default": {}
        },
        "CredentialsProvider": {
          "CognitoIdentity": {
            "Default": {
              "PoolId": "YOUR_IDENTITY_POOL_ID",
              "Region": "us-east-2"
            }
          }
        },
        "CognitoUserPool": {
          "Default": {
            "PoolId": "YOUR_USER_POOL_ID",
            "AppClientId": "YOUR_USER_POOL_CLIENT_ID",
            "Region": "us-east-2"
          }
        },
        "Auth": {
          "Default": {
            "authenticationFlowType": "USER_SRP_AUTH",
            "socialProviders": [],
            "usernameAttributes": ["EMAIL"],
            "signupAttributes": ["EMAIL"],
            "passwordProtectionSettings": {
              "passwordPolicyMinLength": 8,
              "passwordPolicyCharacters": [
                "REQUIRES_LOWERCASE",
                "REQUIRES_UPPERCASE",
                "REQUIRES_NUMBERS"
              ]
            },
            "mfaConfiguration": "OFF",
            "mfaTypes": [],
            "verificationMechanisms": ["EMAIL"]
          }
        }
      }
    }
  },
  "storage": {
    "plugins": {
      "awsS3StoragePlugin": {
        "bucket": "YOUR_S3_BUCKET",
        "region": "us-east-2",
        "defaultAccessLevel": "protected"
      }
    }
  }
}''';
EOF
fi

cd ..

# iOS setup
echo ""
echo "🍎 Setting up iOS..."
cd app
if [ -d "ios" ]; then
    cd ios
    pod install --repo-update || echo "⚠️  CocoaPods failed - you may need to run 'pod install' manually"
    cd ..
fi
cd ..

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "⚠️  IMPORTANT: Edit these files with your credentials:"
echo ""
echo "1. app/lib/core/config/environment.dart"
echo "   - Add your Mapbox token"
echo ""
echo "2. app/lib/amplifyconfiguration.dart"
echo "   - Add your AWS Cognito/AppSync values"
echo ""
echo "Your current AWS deployment values:"
echo "  Region:           us-east-2"
echo "  UserPoolId:       us-east-2_4TMK6ZkEw"
echo "  UserPoolClientId: 604ra5vcs63vtrumm06gdu3dma"
echo "  IdentityPoolId:   us-east-2:e9f40e34-a338-4199-ba5e-b04f80d53674"
echo "  GraphQL API:      https://2durs45npzcqjisfeo3icksosy.appsync-api.us-east-2.amazonaws.com/graphql"
echo "  S3 Bucket:        oym-media-dev-668319989887"
echo "  CDN:              https://d2x7rbog9vnm2i.cloudfront.net"
echo ""
echo "To run the app:"
echo "  cd app"
echo "  flutter run -d ios"
echo ""
