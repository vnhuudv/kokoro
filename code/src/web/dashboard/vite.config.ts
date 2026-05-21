import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/test-setup.ts')],
    root: resolve(__dirname, '../../..'),
    include: [
      'tests/unit/web/dashboard/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
  },
  server: { port: 5173 },
});
