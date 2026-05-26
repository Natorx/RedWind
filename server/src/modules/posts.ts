import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { TypeORMConfig } from '../config/orm.js';
import { Post } from '../tables/posts.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export default async function postController(fastify: FastifyInstance) {
  // 注册 multipart 插件
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 5 * 1024 * 1024, // 单文件最大 5MB
      files: 6, // 最多 6 个文件（多文件时）
    },
  });

  // 获取所有帖子
fastify.get('/', async function (_request: FastifyRequest, reply: FastifyReply) {
    try {
      const postRepository = TypeORMConfig.getRepository(Post);
      const posts = await postRepository.find({ order: { createdAt: 'DESC' } });

      const prefix = process.env.FILE_PREFIX || '';
      const postsWithPrefix = posts.map((post) => ({
        ...post,
        images: post.images
          ? post.images.map((url) => `${prefix}${url}`)
          : [],
      }));

      reply.send(postsWithPrefix);
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ message: '获取帖子列表失败' });
    }
  });


  // -----------------------------------------------------------------
  // 创建帖子（支持 multipart）
  // -----------------------------------------------------------------
// 创建帖子
fastify.post('/setPosts', async (request, reply) => {
  try {
    const body: any = {};
    const imagesUrls: string[] = [];

    const parts: any = request.parts(); // 转为 any
    for await (const part of parts) {
      if (part.file) {
        // 是文件
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
    });
    const result = await postRepository.save(newPost);
    reply.status(201).send(result);
  } catch (error) {
    fastify.log.error(error);
    reply.status(400).send({ message: '创建帖子失败' });
  }
});

// 更新帖子
fastify.put<{ Params: { id: string } }>('/edit/:id', async (request, reply) => {
  try {
    const { id } = request.params;
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


  // 删除帖子
  fastify.delete<{ Params: { id: string } }>('/remove/:id', async (request, reply) => {
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
  });
}
