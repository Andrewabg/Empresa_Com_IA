import { defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  resolve: {
    alias: {
      '@custom': path.resolve(__dirname, './custom'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    
    
    
    
    
    
    
    
    
    
    
    testTimeout: 120_000,
    hookTimeout: 120_000,
    
    
    setupFiles: ['dotenv/config', './tests/setupTestEnv.ts'],
    
    
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
  },
})
