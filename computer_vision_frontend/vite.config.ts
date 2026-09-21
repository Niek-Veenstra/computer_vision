import { defineConfig } from 'vite'
import vue from 'unplugin-vue/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  plugins: [
    VueRouter({ dts: 'src/typed-router.d.ts' }),
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dts: 'src/auto-imports.d.ts',
    }),
    vueDevTools(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
