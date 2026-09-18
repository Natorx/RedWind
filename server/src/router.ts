import type { FastifyInstance } from 'fastify';
import indedxModule from './modules/home.js';
import accountModule from './modules/accounts.js';
import noticeModule from './modules/notice.js';

export default async function router(fastify: FastifyInstance) {
  fastify.register(indedxModule, { prefix: '/' })
  fastify.register(accountModule,{prefix:'/account'})
  fastify.register(noticeModule,{prefix:'/notice'})
}
