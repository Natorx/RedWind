// modules/task.module.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { TypeORMConfig } from "../config/orm.js";
import { Task } from "../tables/tasks.js";
import { Account } from "../tables/accounts.js";

// 定义请求体类型
interface CreateTaskBody {
  title: string;
  content: string;
  price: number;
  type: string;
  account_id: string;
}

interface UpdateTaskBody {
  title?: string;
  content?: string;
  price?: number;
  type?: string;
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
  fastify.post<{ Body: CreateTaskBody }>('/tasks', async (request: FastifyRequest<{ Body: CreateTaskBody }>, reply: FastifyReply) => {
    try {
      const { title, content, price, type, account_id } = request.body;

      // 验证必填字段
      if (!title || !content || !price || !type || !account_id) {
        return reply.code(400).send({
          success: false,
          message: '缺少必填字段: title, content, price, type, account_id'
        });
      }

      // 检查用户是否存在
      const account = await accountRepository.findOne({ where: { id: account_id } });
      if (!account) {
        return reply.code(404).send({
          success: false,
          message: '用户不存在'
        });
      }

      // 创建任务
      const task = taskRepository.create({
        title,
        content,
        price,
        type,
        account_id
      });

      await taskRepository.save(task);

      // 查询刚创建的任务（带用户信息）
      const savedTask = await taskRepository.findOne({
        where: { id: task.id },
        relations: ['account']
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
          user: {
            id: savedTask?.account.id,
            username: savedTask?.account.username
          },
          createdAt: savedTask?.createdAt
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  });

  // ========== 2. 查询所有任务 (Read - All) ==========
  fastify.get<{ Querystring: GetTaskQuery }>('/tasks', async (request: FastifyRequest<{ Querystring: GetTaskQuery }>, reply: FastifyReply) => {
    try {
      const { page = 1, pageSize = 10, account_id } = request.query;

      // 构建查询条件
      const queryBuilder = taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.account', 'account')
        .select([
          'task.id',
          'task.title',
          'task.content',
          'task.price',
          'task.type',
          'task.createdAt',
          'task.updatedAt',
          'account.id',
          'account.username'
        ]);

      // 如果指定了account_id，只查询该用户的任务
      if (account_id) {
        queryBuilder.where('task.account_id = :account_id', { account_id });
      }

      // 分页查询
      const [tasks, total] = await queryBuilder
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .orderBy('task.createdAt', 'DESC')
        .getManyAndCount();

      // 格式化返回数据（带上用户名）
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        content: task.content,
        price: task.price,
        type: task.type,
        user: {
          id: task.account.id,
          username: task.account.username
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));

      return reply.send({
        success: true,
        data: formattedTasks,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  });

  // ========== 3. 查询单个任务 (Read - One) ==========
  fastify.get<{ Params: GetTaskParams }>('/tasks/:id', async (request: FastifyRequest<{ Params: GetTaskParams }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const task = await taskRepository.findOne({
        where: { id },
        relations: ['account']
      });

      if (!task) {
        return reply.code(404).send({
          success: false,
          message: '任务不存在'
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
          user: {
            id: task.account.id,
            username: task.account.username
          },
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  });

  // ========== 4. 更新任务 (Update) ==========
  fastify.put<{ Params: GetTaskParams; Body: UpdateTaskBody }>('/tasks/:id', async (request: FastifyRequest<{ Params: GetTaskParams; Body: UpdateTaskBody }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { title, content, price, type } = request.body;

      // 查找任务
      const task = await taskRepository.findOne({
        where: { id },
        relations: ['account']
      });

      if (!task) {
        return reply.code(404).send({
          success: false,
          message: '任务不存在'
        });
      }

      // 更新字段
      if (title) task.title = title;
      if (content) task.content = content;
      if (price) task.price = price;
      if (type) task.type = type;

      await taskRepository.save(task);

      // 返回更新后的数据
      const updatedTask = await taskRepository.findOne({
        where: { id },
        relations: ['account']
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
          user: {
            id: updatedTask?.account.id,
            username: updatedTask?.account.username
          },
          updatedAt: updatedTask?.updatedAt
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  });

  // ========== 5. 删除任务 (Delete) ==========
  fastify.delete<{ Params: GetTaskParams }>('/tasks/:id', async (request: FastifyRequest<{ Params: GetTaskParams }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      // 查找任务
      const task = await taskRepository.findOne({
        where: { id },
        relations: ['account']
      });

      if (!task) {
        return reply.code(404).send({
          success: false,
          message: '任务不存在'
        });
      }

      // 保存用户信息用于返回
      const taskInfo = {
        id: task.id,
        title: task.title,
        user: {
          id: task.account.id,
          username: task.account.username
        }
      };

      // 删除任务
      await taskRepository.remove(task);

      return reply.send({
        success: true,
        message: '任务删除成功',
        data: taskInfo
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  });
}