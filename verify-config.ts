import { configSchema } from './src/config/schemas/config.schema';

function validate(env: any) {
  const { error } = configSchema.validate(env, { abortEarly: false, allowUnknown: true });
  if (error) {
    console.error('Validation failed:', error.details.map(d => d.message).join(', '));
    return false;
  }
  console.log('Validation successful!');
  return true;
}

const validDevEnv = {
  NODE_ENV: 'development',
  PORT: 3000,
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: 5432,
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'password',
  DATABASE_NAME: 'stellarswipe',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  STELLAR_NETWORK: 'testnet',
  STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
  STELLAR_SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  JWT_SECRET: 'a'.repeat(32),
  XAI_API_KEY: 'test-key'
};

const validMainnetEnv = {
  ...validDevEnv,
  NODE_ENV: 'mainnet',
  STELLAR_NETWORK: 'public',
  STELLAR_HORIZON_URL: 'https://horizon.stellar.org',
  STELLAR_SOROBAN_RPC_URL: 'https://soroban-rpc.stellar.org',
  STELLAR_NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
};

const invalidEnv = {
  NODE_ENV: 'invalid', // should fail
  // missing required fields
};

console.log('Testing Valid Dev Env:');
validate(validDevEnv);

console.log('\nTesting Valid Mainnet Env:');
validate(validMainnetEnv);

console.log('\nTesting Invalid Env:');
validate(invalidEnv);
