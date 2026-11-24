import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // 第三个参数为空字符串时，loadEnv 会读取所有变量（含非 VITE_ 前缀），
  // 这里用于读取仅作用于开发代理的 VITE_PROXY_TARGET。
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080';

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      proxy: {
        // 契约 1.1：所有接口带 /api 前缀，直接透传（不 rewrite，后端同样以 /api 暴露）
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        // 契约 2.7：/file/download 是唯一没有 /api 前缀的路径，必须单独代理
        '/file': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Element Plus 全量引入（组件由后续模块页面按需使用，不做按需打包），
          // 拆成独立 vendor chunk，避免业务更新时缓存失效
          manualChunks: {
            'vendor-element-plus': ['element-plus', '@element-plus/icons-vue'],
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-axios': ['axios'],
          },
        },
      },
    },
  };
});
