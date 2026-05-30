import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export const FRONTEND_DEV_SERVER_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: FRONTEND_DEV_SERVER_PORT,
    strictPort: true,
    // 本番では Caddy がドメイン経由でプロキシするため、Vite の Host チェックを無効化。
    // この dev サーバは内部ネットワークからのみ到達可能（外部に直接公開しない）。
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testSetup.ts',
  },
});
