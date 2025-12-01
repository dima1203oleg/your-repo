import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      server: {
          port: 3002,
          host: '0.0.0.0',
          proxy: {
            '/api': {
              target: 'http://localhost:8001',
              changeOrigin: true,
              secure: false,
              rewrite: (p) => p
            }
          }
      },
      plugins: [
        react({
          jsxImportSource: 'react',
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: ['es2020', 'chrome80', 'firefox78', 'safari13'],
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ui: ['lucide-react'],
              charts: ['recharts'],
              utils: ['axios'],
            },
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId;
              if (facadeModuleId) {
                const fileName = path.basename(facadeModuleId, path.extname(facadeModuleId));
                return `assets/${fileName}-[hash].js`;
              }
              return 'assets/[name]-[hash].js';
            },
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name?.split('.') || [];
              let ext = info[info.length - 1] || '';
              if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
                ext = 'media';
              } else if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name || '')) {
                ext = 'img';
              } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
                ext = 'fonts';
              }
              return `assets/${ext}/[name]-[hash].[ext]`;
            },
          },
        },
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction,
            pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
            passes: 2,
          },
          mangle: {
            properties: {
              regex: /^_/, // Only mangle private properties
            },
          },
          format: {
            comments: false,
          },
        },
        sourcemap: !isProduction,
        reportCompressedSize: true,
        chunkSizeWarningLimit: 1000,
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'axios',
          'lucide-react',
        ],
        exclude: [
          'recharts', // Large chart library
        ],
      },
      css: {
        modules: {
          localsConvention: 'camelCase',
        },
        postcss: {
          plugins: [
            autoprefixer,
            ...(isProduction ? [cssnano] : []),
          ],
        },
        devSourcemap: !isProduction,
      },
      envPrefix: 'VITE_',
      preview: {
        port: 4173,
        host: true,
      },
    };
});
