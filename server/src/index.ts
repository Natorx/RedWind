import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { DataSources } from './config/orm.js';
import path from 'path';
import router from './router.js';

const server = fastify({
  logger: true,
});

await server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

await server.register(import('@fastify/static'), {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads',
  decorateReply: false,
});
await server.register(router);

// 修改这部分
try {
  await DataSources.initialize();
  console.log('✅ PGSql Connected!');
  
  await server.listen({
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3007,
  });
  
  // 这里会在服务器真正启动后打印
  console.log(`🚀 Redwind Fastify server running on port http://localhost:${process.env.PORT || 3007}`);
} catch (err) {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
}