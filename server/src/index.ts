import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import router from './router.js';
import { TypeORMConfig } from './config/orm.js';
import path from 'path';

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

await TypeORMConfig.initialize()
  .then(() => {
    console.log('✅ PGSql Connected!');
    return server.listen({
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 3007,
    });
  })
  .then(() => {
    console.log(
      `🚀 Redwind Fastify server running on port http://localhost:${process.env.PORT}`,
    );
  });
  