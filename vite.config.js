import { defineConfig } from 'vite'

export default defineConfig({
  // Configuration de base - GitHub Pages nécessite le nom du repo
  base: process.env.NODE_ENV === 'production' ? '/gamejam-outrage/' : './',
  
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
    minify: 'esbuild', // Utiliser esbuild au lieu de terser
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