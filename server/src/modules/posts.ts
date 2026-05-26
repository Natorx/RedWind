import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { TypeORMConfig } from '../config/orm.js';
import { Post } from '../tables/posts.js';
import { authenticate } from '../hooks/auth.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export default async function postModule(fastify: FastifyInstance) {
  // 注册 multipart 插件
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 单文件最大 5MB
      files: 6, // 最多 6 个文件
    },
  });

  // 获取所有帖子（公开，无需登录）
  fastify.get('/', async function (_request: FastifyRequest, reply: FastifyReply) {
    try {
      const postRepository = TypeORMConfig.getRepository(Post);
      const posts = await postRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['author'], // 加载作者信息
      });

      const prefix = process.env.FILE_PREFIX || '';
      const postsWithPrefix = posts.map((post) => ({
        ...post,
        images: post.images ? post.images.map((url) => `${prefix}${url}`) : [],
        // 返回安全的作者信息（只暴露 id 和 username）
        author: post.author
          ? { id: post.author.id, username: post.author.username }
          : null,
      }));

      reply.send(postsWithPrefix);
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ message: '获取帖子列表失败' });
    }
  });

  // 创建帖子（需要登录）
  fastify.post('/setPosts', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const body: any = {};
      const imagesUrls: string[] = [];

      const parts: any = request.parts();
      for await (const part of parts) {
        if (part.file) {
          // 保存文件
          const ext = path.extname(part.filename) || '.jpg';
          const fileName = `${randomUUID()}${ext}`;
          const yearMonth = new Date().toISOString().slice(0, 7);
          const dir = path.join(UPLOAD_DIR, yearMonth);
          await mkdir(dir, { recursive: true });
          const filePath = path.join(dir, fileName);
          const buffer = await part.toBuffer();
          await writeFile(filePath, buffer);
          imagesUrls.push(`/uploads/${yearMonth}/${fileName}`);
        } else {
          // 文本字段
          body[part.fieldname] = part.value;
        }
      }

      const postRepository = TypeORMConfig.getRepository(Post);
      const newPost = postRepository.create({
        title: body.title,
        content: body.content,
        tag: body.tag || null,
        images: imagesUrls,
        authorId: userId, // 绑定作者
      });
      const result = await postRepository.save(newPost);
      reply.status(201).send(result);
    } catch (error) {
      fastify.log.error(error);
      reply.status(400).send({ message: '创建帖子失败' });
    }
  });

  // 更新帖子（需要登录且为作者本人）
  fastify.put<{ Params: { id: string } }>('/edit/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user!.id;
      const body: any = {};
      let imagesUrls: string[] | undefined;

      const parts: any = request.parts();
      for await (const part of parts) {
        if (part.file) {
          const ext = path.extname(part.filename) || '.jpg';
          const fileName = `${randomUUID()}${ext}`;
          const yearMonth = new Date().toISOString().slice(0, 7);
          const dir = path.join(UPLOAD_DIR, yearMonth);
          await mkdir(dir, { recursive: true });
          const filePath = path.join(dir, fileName);
          const buffer = await part.toBuffer();
          await writeFile(filePath, buffer);
          if (!imagesUrls) imagesUrls = [];
          imagesUrls.push(`/uploads/${yearMonth}/${fileName}`);
        } else {
          body[part.fieldname] = part.value;
        }
      }

      const postRepository = TypeORMConfig.getRepository(Post);
      const post = await postRepository.findOneBy({ id });
      if (!post) {
        return reply.status(404).send({ message: '帖子不存在' });
      }
      // 权限检查：只能更新自己的帖子
      if (post.authorId !== userId) {
        return reply.status(403).send({ message: '无权修改他人帖子' });
      }

      const updateData: any = {};
      if (body.title) updateData.title = body.title;
      if (body.content) updateData.content = body.content;
      if (body.tag !== undefined) updateData.tag = body.tag;
      if (imagesUrls) updateData.images = imagesUrls;

      postRepository.merge(post, updateData);
      const updatedPost = await postRepository.save(post);
      reply.send(updatedPost);
    } catch (error) {
      fastify.log.error(error);
      reply.status(400).send({ message: '更新帖子失败' });
    }
  });

  // 删除帖子（需要登录且为作者本人）
  fastify.delete<{ Params: { id: string } }>('/remove/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.id;
    try {
      const postRepository = TypeORMConfig.getRepository(Post);
      const post = await postRepository.findOneBy({ id });
      if (!post) {
        return reply.status(404).send({ message: '帖子不存在' });
      }
      // 权限检查：只能删除自己的帖子
      if (post.authorId !== userId) {
        return reply.status(403).send({ message: '无权删除他人帖子' });
      }
      await postRepository.remove(post);
      reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ message: '删除帖子失败' });
    }
  });
}
