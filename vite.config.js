// 离线 zip 需在 file:// 下运行：输出单个 IIFE 经典脚本，去掉 type=module/crossorigin
const classic = { name: 'classic-script', transformIndexHtml: { order: 'post', handler: h => h.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, '') } };
export default { base: './', plugins: [classic], build: { outDir: 'dist', modulePreload: false, target: 'es2018', chunkSizeWarningLimit: 2000,
  rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } } };
