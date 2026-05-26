import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { TypeORMConfig } from '../config/orm.js';
import { Account } from '../tables/account.js';

export default async function accountModule(fastify: FastifyInstance) {
  // 注册用户
  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { username, password } = request.body as {
          username: string;
          password: string;
        };

        if (!username || !password) {
          return reply.status(400).send({ message: '用户名和密码不能为空' });
        }

        const accountRepository = TypeORMConfig.getRepository(Account);

        // 检查用户名是否已存在
        const existing = await accountRepository.findOneBy({ username });
        if (existing) {
          return reply.status(409).send({ message: '用户名已存在' });
        }

        // 加密密码
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newAccount = accountRepository.create({
          username,
          password: hashedPassword,
        });

        const savedAccount = await accountRepository.save(newAccount);

        // 返回时隐藏密码
        const { password: _, ...safeAccount } = savedAccount;
        reply.status(201).send(safeAccount);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ message: '注册失败' });
      }
    },
  );

  // 可选：获取用户信息（根据 id）
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const accountRepository = TypeORMConfig.getRepository(Account);
      const account = await accountRepository.findOneBy({ id });
      if (!account) {
        return reply.status(404).send({ message: '用户不存在' });
      }
      const { password: _, ...safeAccount } = account;
      reply.send(safeAccount);
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ message: '查询用户失败' });
    }
  });

  // 登录用户
  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { username, password } = request.body as {
          username: string;
          password: string;
        };

        if (!username || !password) {
          return reply.status(400).send({ message: '用户名和密码不能为空' });
        }

        const accountRepository = TypeORMConfig.getRepository(Account);

        // 查找用户（需要拿到密码用于比对）
        const account = await accountRepository.findOne({
          where: { username },
          select: ['id', 'username', 'password'], // 明确包含 password
        });

        if (!account) {
          return reply.status(401).send({ message: '用户名或密码错误' });
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(
          password,
          account.password,
        );
        if (!isPasswordValid) {
          return reply.status(401).send({ message: '用户名或密码错误' });
        }

        // 生成 JWT token（建议将 JWT_SECRET 放在环境变量中）
        const token = jwt.sign(
          { id: account.id, username: account.username },
          process.env.JWT_SECRET || 'your-secret-key', // ⚠️ 务必替换为安全的密钥
          { expiresIn: '7d' }, // 7天有效期，可根据需要调整
        );

        // 返回 token 和用户信息（不含密码）
        const { password: _, ...safeAccount } = account;
        return reply.send({
          message: '登录成功',
          token,
          user: safeAccount,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ message: '登录失败' });
      }
    },
  );
}
