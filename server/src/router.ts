import type { FastifyInstance } from 'fastify';
import indexController from './controller/home.ts';
import chatController from './controller/chat.ts';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indexController, { prefix: '/' });
  fastify.register(chatController, { prefix: '/chat' });
}
