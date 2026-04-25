import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://nippo:nippo_password@localhost:5432/nippo_test_db',
      JWT_SECRET: 'test_jwt_secret_for_testing_only_32chars',
      NODE_ENV: 'test',
    },
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      shuffle: false,
    },
  },
})
