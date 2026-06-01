// modules/sse/index.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// 存储所有连接的客户端
const clients = new Set<FastifyReply>();

export default async function noticeModule(fastify: FastifyInstance) {
  // SSE 连接端点
  fastify.get('/sse', async (request: FastifyRequest, reply: FastifyReply) => {
    // 设置 SSE headers
    reply.raw.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // 保存客户端连接
    clients.add(reply);
    console.log(`客户端连接，当前连接数: ${clients.size}`);

    // 客户端断开时清理
    request.raw.on('close', () => {
      clients.delete(reply);
      console.log(`客户端断开，当前连接数: ${clients.size}`);
    });
  });

  // 每分钟推送消息
  setInterval(() => {
    const message = `data: ${JSON.stringify({ message: '过了一分钟', timestamp: Date.now() })}\n\n`;

    console.log(`推送消息给 ${clients.size} 个客户端`);

    // 推送给所有连接的客户端
    for (const client of clients) {
      try {
        client.raw.write(message);
      } catch (error) {
        clients.delete(client);
      }
    }
  }, 60000); // 60000毫秒 = 1分钟
}
