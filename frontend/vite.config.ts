import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export const FRONTEND_DEV_SERVER_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: FRONTEND_DEV_SERVER_PORT,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testSetup.ts',
  },
});
