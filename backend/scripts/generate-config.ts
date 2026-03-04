/**
 * Generate Amplify configuration from CDK outputs
 * Run after deployment to create Flutter app configuration
 * 
 * Usage: npx ts-node scripts/generate-config.ts [stage]
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
const { execSync } = require('child_process') as typeof import('child_process');

const scriptDir = __dirname;
const stage = process.argv[2] || 'dev';

console.log(`Generating Amplify configuration for stage: ${stage}`);

// Get CloudFormation outputs
function getStackOutputs(stackName: string): Record<string, string> {
  try {
    const result = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs" --output json`,
      { encoding: 'utf-8' }
    ) as string;
    
    const outputs = JSON.parse(result) as Array<{ OutputKey: string; OutputValue: string }>;
    const outputMap: Record<string, string> = {};
    
    for (const output of outputs) {
      outputMap[output.OutputKey] = output.OutputValue;
    }
    
    return outputMap;
  } catch (error) {
    console.warn(`Could not get outputs for stack ${stackName}`);
    return {};
  }
}

// Collect outputs from all stacks
const authOutputs = getStackOutputs(`OyM-Auth-${stage}`);
const apiOutputs = getStackOutputs(`OyM-Api-${stage}`);
const storageOutputs = getStackOutputs(`OyM-Storage-${stage}`);

// Load template
const templatePath = path.join(scriptDir, '../amplify/amplifyconfiguration.template.json');
let config = fs.readFileSync(templatePath, 'utf-8');

// Replace placeholders
const replacements: Record<string, string> = {
  '${AWS_REGION}': process.env.AWS_REGION || 'us-east-1',
  '${USER_POOL_ID}': authOutputs.UserPoolId || '',
  '${USER_POOL_CLIENT_ID}': authOutputs.UserPoolClientId || '',
  '${IDENTITY_POOL_ID}': authOutputs.IdentityPoolId || '',
  '${APPSYNC_ENDPOINT}': apiOutputs.GraphQLApiUrl || '',
  '${API_KEY}': '', // API key needs to be retrieved separately
  '${MEDIA_BUCKET}': storageOutputs.MediaBucketName || '',
  '${PINPOINT_APP_ID}': '', // Set up separately if using analytics
};

for (const [placeholder, value] of Object.entries(replacements)) {
  config = config.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
}

// Write output for Flutter
const outputDir = path.join(scriptDir, '../../app/lib/core/config');
fs.mkdirSync(outputDir, { recursive: true });

const dartConfig = `// AUTO-GENERATED - DO NOT EDIT
// Generated from CDK deployment outputs

const amplifyConfig = '''
${config}
''';
`;

fs.writeFileSync(path.join(outputDir, 'amplify_config.dart'), dartConfig);

// Also write JSON for reference
fs.writeFileSync(
  path.join(scriptDir, `../amplify/amplifyconfiguration.${stage}.json`),
  config
);

console.log('Configuration generated successfully!');
console.log(`  - Dart config: app/lib/core/config/amplify_config.dart`);
console.log(`  - JSON config: backend/amplify/amplifyconfiguration.${stage}.json`);
