// modules/task.module.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TypeORMConfig } from '../config/orm.js';
import { Task } from '../tables/tasks.js';
import { Account } from '../tables/accounts.js';
import { authenticate } from '../hooks/auth.js';

interface CreateTaskBody {
  title: string;
  content: string;
  price: number;
  type: string;
  account_id: string;
  progress?: '未开始' | '进行中' | '已完成'; // ✅ 添加 progress
}

interface UpdateTaskBody {
  title?: string;
  content?: string;
  price?: number;
  type?: string;
  progress?: '未开始' | '进行中' | '已完成'; // ✅ 添加 progress
}

interface GetTaskQuery {
  page?: number;
  pageSize?: number;
  account_id?: string;
}

interface GetTaskParams {
  id: string;
}

export default async function taskModule(fastify: FastifyInstance) {
  // 获取任务仓库
  const taskRepository = TypeORMConfig.getRepository(Task);
  const accountRepository = TypeORMConfig.getRepository(Account);

  // ========== 1. 创建任务 (Create) ==========
  fastify.post<{ Body: Omit<CreateTaskBody, 'account_id'> }>(
    '/tasks',
    { preHandler: authenticate }, // ✅ 添加认证中间件
    async (
      request: FastifyRequest<{ Body: Omit<CreateTaskBody, 'account_id'> }>,
      reply: FastifyReply,
    ) => {
      try {
        // ✅ 从认证信息中获取用户ID，而不是从请求体
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            message: '未授权，请先登录',
          });
        }

        const { title, content, price, type, progress } = request.body;

        // 验证必填字段
        if (!title || !content || !price || !type) {
          return reply.code(400).send({
            success: false,
            message: '缺少必填字段: title, content, price, type',
          });
        }

        // 检查用户是否存在
        const account = await accountRepository.findOne({
          where: { id: userId },
        });
        if (!account) {
          return reply.code(404).send({
            success: false,
            message: '用户不存在',
          });
        }

        // 创建任务（使用认证的用户ID）
        const task = taskRepository.create({
          title,
          content,
          price,
          type,
          account_id: userId, // ✅ 使用从JWT获取的用户ID
          progress: progress || '未开始',
        });

        await taskRepository.save(task);

        // 查询刚创建的任务（带用户信息）
        const savedTask = await taskRepository.findOne({
          where: { id: task.id },
          relations: ['account'],
        });

        return reply.code(201).send({
          success: true,
          message: '任务创建成功',
          data: {
            id: savedTask?.id,
            title: savedTask?.title,
            content: savedTask?.content,
            price: savedTask?.price,
            type: savedTask?.type,
            progress: savedTask?.progress,
            user: {
              id: savedTask?.account.id,
              username: savedTask?.account.username,
            },
            createdAt: savedTask?.createdAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: '服务器内部错误',
        });
      }
    },
  );

  // ========== 2. 查询所有任务 (Read - All) ==========
  fastify.get<{ Querystring: GetTaskQuery }>(
    '/tasks',
    async (request, reply) => {
      try {
        const { page = 1, pageSize = 10, account_id } = request.query;

        const queryBuilder = taskRepository
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.account', 'account')
          .select([
            'task.id',
            'task.title',
            'task.content',
            'task.price',
            'task.type',
            'task.progress', // ✅ 添加 progress
            'task.createdAt',
            'task.updatedAt',
            'account.id',
            'account.username',
          ]);

        if (account_id) {
          queryBuilder.where('task.account_id = :account_id', { account_id });
        }

        const [tasks, total] = await queryBuilder
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .orderBy('task.createdAt', 'DESC')
          .getManyAndCount();

        const formattedTasks = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          content: task.content,
          price: task.price,
          type: task.type,
          progress: task.progress, // ✅ 添加 progress
          user: {
            id: task.account.id,
            username: task.account.username,
          },
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }));

        return reply.send({
          success: true,
          data: formattedTasks,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: '服务器内部错误',
        });
      }
    },
  );

  // ========== 3. 查询单个任务 (Read - One) ==========
  fastify.get<{ Params: GetTaskParams }>(
    '/tasks/:id',
  
    async (request, reply) => {
      try {
        const { id } = request.params;

        const task = await taskRepository.findOne({
          where: { id },
          relations: ['account'],
        });

        if (!task) {
          return reply.code(404).send({
            success: false,
            message: '任务不存在',
          });
        }

        return reply.send({
          success: true,
          data: {
            id: task.id,
            title: task.title,
            content: task.content,
            price: task.price,
            type: task.type,
            progress: task.progress, // ✅ 添加 progress
            user: {
              id: task.account.id,
              username: task.account.username,
            },
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: '服务器内部错误',
        });
      }
    },
  );

  // ========== 4. 更新任务 (Update) ==========
  fastify.put<{ Params: GetTaskParams; Body: UpdateTaskBody }>(
    '/tasks/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { title, content, price, type, progress } = request.body; // ✅ 添加 progress

        const task = await taskRepository.findOne({
          where: { id },
          relations: ['account'],
        });

        if (!task) {
          return reply.code(404).send({
            success: false,
            message: '任务不存在',
          });
        }

        // 更新字段
        if (title) task.title = title;
        if (content) task.content = content;
        if (price) task.price = price;
        if (type) task.type = type;
        if (progress) task.progress = progress; // ✅ 添加 progress

        await taskRepository.save(task);

        const updatedTask = await taskRepository.findOne({
          where: { id },
          relations: ['account'],
        });

        return reply.send({
          success: true,
          message: '任务更新成功',
          data: {
            id: updatedTask?.id,
            title: updatedTask?.title,
            content: updatedTask?.content,
            price: updatedTask?.price,
            type: updatedTask?.type,
            progress: updatedTask?.progress, // ✅ 添加 progress
            user: {
              id: updatedTask?.account.id,
              username: updatedTask?.account.username,
            },
            updatedAt: updatedTask?.updatedAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: '服务器内部错误',
        });
      }
    },
  );

  // ========== 5. 删除任务 (Delete) ==========
  fastify.delete<{ Params: GetTaskParams }>(
    '/tasks/:id',
    async (
      request: FastifyRequest<{ Params: GetTaskParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        // 查找任务
        const task = await taskRepository.findOne({
          where: { id },
          relations: ['account'],
        });

        if (!task) {
          return reply.code(404).send({
            success: false,
            message: '任务不存在',
          });
        }

        // 保存用户信息用于返回
        const taskInfo = {
          id: task.id,
          title: task.title,
          user: {
            id: task.account.id,
            username: task.account.username,
          },
        };

        // 删除任务
        await taskRepository.remove(task);

        return reply.send({
          success: true,
          message: '任务删除成功',
          data: taskInfo,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: '服务器内部错误',
        });
      }
    },
  );
}
