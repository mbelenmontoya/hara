// Environment Variable Validation
// Ensures all required environment variables are set at startup

/**
 * Required environment variables for the application
 * Missing any of these will cause the app to fail fast with a clear error
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

/**
 * Optional environment variables (will warn if missing but won't fail)
 */
const OPTIONAL_ENV_VARS = [
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
] as const

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variables are missing
 * @returns void - succeeds silently if all variables are present
 *
 * Note: Skips validation in test environment to avoid breaking tests
 */
export function validateEnv(): void {
  // Skip validation in test environment or when explicitly disabled
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.SKIP_ENV_VALIDATION === 'true'
  ) {
    return
  }

  const missing: string[] = []
  const missingOptional: string[] = []

  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  // Check optional variables (for warning)
  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      missingOptional.push(key)
    }
  }

  // Fail if required vars are missing
  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      '',
      ...missing.map((key) => `  - ${key}`),
      '',
      'These variables must be set in your .env.local file.',
      'See README.md for setup instructions.',
      '',
    ].join('\n')

    throw new Error(errorMessage)
  }

  // Warn if optional vars are missing (but don't fail)
  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Optional environment variables not set:')
    missingOptional.forEach((key) => {
      console.warn(`  - ${key}`)
    })
    console.warn('Some features may not work without these variables.')
    console.warn('See README.md for details.\n')
  }
}

/**
 * Get a required environment variable with type safety
 * @param key - Environment variable key
 * @returns The environment variable value (guaranteed to exist)
 * @throws Error if variable is not set
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(
      `Environment variable ${key} is required but not set. See README.md for setup instructions.`
    )
  }

  return value
}

/**
 * Get an optional environment variable with a default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue
}
