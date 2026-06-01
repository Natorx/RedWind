import type { FastifyInstance } from 'fastify';
import indedxModule from './modules/home.js';
import chatModule from './modules/chat.js';
import postModule from './modules/posts.js';
import accountModule from './modules/accounts.js';
import taskModule from './modules/tasks.js';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indedxModule, { prefix: '/' })
  fastify.register(chatModule, { prefix: '/chat' })
  fastify.register(postModule,{prefix:'/post'})
  fastify.register(accountModule,{prefix:'/account'})
  fastify.register(taskModule,{prefix:'/task'})
}
