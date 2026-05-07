import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post } from '../tables/posts.js';

export default async function postController(fastify: FastifyInstance) {
  fastify.get(
    '/posts',
    async function (_request: FastifyRequest, reply: FastifyReply) {
      reply.send([]);
    },
  );
  fastify.post<{ Body: Partial<Post> }>('/setPosts', async (request, reply) => {
    reply.status(201).send(request.body);
  });
  fastify.put<{ Params: { id: string }; Body: Partial<Post> }>(
    '/posts/:id',
    async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;
      reply.send({ id, ...updateData });
    },
  );

  // 删除帖子
  fastify.delete<{ Params: { id: string } }>(
    '/posts/:id',
    async (request, reply) => {
      const { id } = request.params;
      reply.status(204).send();
    },
  );
}
