import type { FastifyInstance } from 'fastify';
import indedxModule from './modules/home.js';
import chatModule from './modules/chat.js';
import postModule from './modules/posts.js';
import accountModule from './modules/account.js';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indedxModule, { prefix: '/' })
  fastify.register(chatModule, { prefix: '/chat' })
  fastify.register(postModule,{prefix:'/post'})
  fastify.register(accountModule,{prefix:'/account'})
}
