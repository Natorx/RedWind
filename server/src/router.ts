import type { FastifyInstance } from 'fastify';
import indexController from './controller/home.js';
import chatController from './controller/chat.js';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indexController, { prefix: '/' });
  fastify.register(chatController, { prefix: '/chat' });
}
