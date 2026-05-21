import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/prototypes-angels-demons/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
