import type { FastifyInstance } from 'fastify';
import indexController from './home.js';
import chatController from './chat.js';
import postController from './posts.js';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indexController, { prefix: '/' });
  fastify.register(chatController, { prefix: '/chat' });
  fastify.register(postController,{prefix:'/post'})
}
