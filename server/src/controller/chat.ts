import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Server } from "socket.io";

// 声明消息类型
interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

// 存储在线用户和消息历史（内存存储，生产环境应使用 Redis）
const onlineUsers = new Map<string, string>(); // socketId -> username
const messageHistory: ChatMessage[] = [];

export default async function chatController(fastify: FastifyInstance) {
  // 创建 Socket.IO 服务器，挂载到 Fastify 的 HTTP 服务器上
  const io = new Server(fastify.server, {
    cors: {
      origin: "*", // 开发环境允许所有源，生产环境需要配置具体域名
      methods: ["GET", "POST"],
    },
    path: "/socket.io", // Socket.IO 路径
  });

  // Socket.IO 连接处理
  io.on("connection", (socket) => {
    console.log(`✅ 用户连接成功，Socket ID: ${socket.id}`);

    // 1. 用户加入聊天
    socket.on("join", (username: string) => {
      // 保存用户名
      onlineUsers.set(socket.id, username);
      
      // 广播新用户加入消息
      const systemMessage: ChatMessage = {
        username: "系统",
        message: `${username} 加入了聊天室`,
        timestamp: Date.now(),
      };
      
      // 发送历史消息给新用户
      socket.emit("history", messageHistory);
      
      // 广播用户列表给所有在线用户
      io.emit("userList", Array.from(onlineUsers.values()));
      
      // 广播系统消息
      io.emit("message", systemMessage);
      
      console.log(`📢 ${username} 加入了聊天室，当前在线人数: ${onlineUsers.size}`);
    });

    // 2. 用户发送消息
    socket.on("sendMessage", (messageText: string) => {
      const username = onlineUsers.get(socket.id);
      
      if (!username) {
        socket.emit("error", "请先加入聊天室");
        return;
      }
      
      const chatMessage: ChatMessage = {
        username,
        message: messageText,
        timestamp: Date.now(),
      };
      
      // 保存到历史记录（最多保留100条）
      messageHistory.push(chatMessage);
      if (messageHistory.length > 100) {
        messageHistory.shift();
      }
      
      // 广播消息给所有用户
      io.emit("message", chatMessage);
      
      console.log(`💬 ${username}: ${messageText}`);
    });

    // 3. 用户正在输入
    socket.on("typing", (isTyping: boolean) => {
      const username = onlineUsers.get(socket.id);
      if (username) {
        // 广播输入状态给除自己外的其他用户
        socket.broadcast.emit("userTyping", {
          username,
          isTyping,
        });
      }
    });

    // 4. 用户断开连接
    socket.on("disconnect", () => {
      const username = onlineUsers.get(socket.id);
      
      if (username) {
        onlineUsers.delete(socket.id);
        
        // 广播用户离开消息
        const systemMessage: ChatMessage = {
          username: "系统",
          message: `${username} 离开了聊天室`,
          timestamp: Date.now(),
        };
        
        io.emit("message", systemMessage);
        io.emit("userList", Array.from(onlineUsers.values()));
        
        console.log(`👋 ${username} 离开了聊天室，当前在线人数: ${onlineUsers.size}`);
      } else {
        console.log(`❌ 用户断开连接，Socket ID: ${socket.id}`);
      }
    });
  });

  // 可选：提供一个 HTTP 端点来获取统计信息
  fastify.get("/chat/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      onlineUsers: onlineUsers.size,
      userList: Array.from(onlineUsers.values()),
      totalMessages: messageHistory.length,
    });
  });

  // 关闭 Socket.IO 连接（当 Fastify 关闭时）
  fastify.addHook("onClose", (_, done) => {
    io.close();
    done();
  });
  
  console.log("💬 聊天控制器已加载");
}