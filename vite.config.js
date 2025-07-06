import { defineConfig } from 'vite'

export default defineConfig({
  // Configuration de base
  base: './',
  
  // Configuration du serveur de développement
  server: {
    port: 3000,
    host: true,
    open: true
  },
  
  // Configuration du build
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  
  // Optimisation des dépendances
  optimizeDeps: {
    include: ['three']
  },
  
  // Configuration pour le développement
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
}) 