import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post } from '../tables/posts.js';
import { TypeORMConfig } from '../config/orm.js';

export default async function postController(fastify: FastifyInstance) {
  // 获取所有帖子
  fastify.get(
    '/',
    async function (_request: FastifyRequest, reply: FastifyReply) {
      try {
        const postRepository = TypeORMConfig.getRepository(Post);
        const posts = await postRepository.find({
          order: { createdAt: 'DESC' },
        });
        reply.send(posts);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ message: '获取帖子列表失败' });
      }
    },
  );

  // 创建新帖子
  fastify.post<{ Body: Partial<Post> }>(
    '/setPosts',
    async (request, reply) => {
      try {
        const postRepository = TypeORMConfig.getRepository(Post);
        const newPost = postRepository.create(request.body);
        const result = await postRepository.save(newPost);
        reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        reply.status(400).send({ message: '创建帖子失败' });
      }
    },
  );

  // 更新帖子
  fastify.put<{ Params: { id: string }; Body: Partial<Post> }>(
    '/update/:id',
    async (request, reply) => {
      const { id } = request.params;
      const updateData = request.body;
      try {
        const postRepository = TypeORMConfig.getRepository(Post);
        const post = await postRepository.findOneBy({ id });
        if (!post) {
          return reply.status(404).send({ message: '帖子不存在' });
        }
        postRepository.merge(post, updateData);
        const updatedPost = await postRepository.save(post);
        reply.send(updatedPost);
      } catch (error) {
        fastify.log.error(error);
        reply.status(400).send({ message: '更新帖子失败' });
      }
    },
  );

  // 删除帖子
  fastify.delete<{ Params: { id: string } }>(
    '/remove/:id',
    async (request, reply) => {
      const { id } = request.params;
      try {
        const postRepository = TypeORMConfig.getRepository(Post);
        const post = await postRepository.findOneBy({ id });
        if (!post) {
          return reply.status(404).send({ message: '帖子不存在' });
        }
        await postRepository.remove(post);
        reply.status(204).send();
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ message: '删除帖子失败' });
      }
    },
  );
}
