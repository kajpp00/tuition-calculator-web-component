import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'TuitionCalculator',
      fileName: () => `tuition-calculator.js`,
      formats: ['iife'],
    }
  }
});
