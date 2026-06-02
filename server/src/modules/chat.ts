import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Server, Socket } from 'socket.io';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
  type: 'public' | 'private';
  target?: string; // 私聊目标用户名
}

// 好友系统相关类型
interface FriendRequest {
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

// 内存存储
const onlineUsers = new Map<string, string>(); // socketId -> username
const userSockets = new Map<string, string>(); // username -> socketId (便于私聊推送)
const messageHistory: ChatMessage[] = []; // 公共消息历史
const friendsMap = new Map<string, string[]>(); // username -> friendUsernames
const pendingRequests = new Map<string, FriendRequest[]>(); // username -> incoming requests

export default async function chatModule(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  // 工具函数：向特定用户发送事件
  const sendToUser = (username: string, event: string, data: any) => {
    const targetSocketId = userSockets.get(username);
    if (targetSocketId) {
      io.to(targetSocketId).emit(event, data);
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log(`✅ 用户连接成功，Socket ID: ${socket.id}`);

    // === 加入聊天（必须首先触发） ===
    socket.on('join', (username: string) => {
      onlineUsers.set(socket.id, username);
      userSockets.set(username, socket.id);

      // 发送公共历史消息
      socket.emit('history', messageHistory);

      // 更新在线用户列表
      io.emit('userList', Array.from(onlineUsers.values()));

      // 广播系统消息
      io.emit('message', {
        username: '系统',
        message: `${username} 加入了聊天室`,
        timestamp: Date.now(),
        type: 'public',
      });

      // 发送好友列表和待处理请求
      const friends = friendsMap.get(username) || [];
      socket.emit('friendList', friends);
      const requests = pendingRequests.get(username) || [];
      socket.emit('friendRequests', requests);

      // 通知该用户的好友（上线通知）
      friends.forEach((friend) => {
        sendToUser(friend, 'message', {
          username: '系统',
          message: `${username} 上线了`,
          timestamp: Date.now(),
          type: 'public',
        });
      });

      console.log(
        `📢 ${username} 加入了聊天室，当前在线人数: ${onlineUsers.size}`,
      );
    });

    // === 发送公共消息 ===
    socket.on('sendMessage', (messageText: string) => {
      const username = onlineUsers.get(socket.id);
      if (!username) {
        socket.emit('error', '请先加入聊天室');
        return;
      }

      const chatMessage: ChatMessage = {
        username,
        message: messageText,
        timestamp: Date.now(),
        type: 'public',
      };

      messageHistory.push(chatMessage);
      if (messageHistory.length > 100) messageHistory.shift();

      io.emit('message', chatMessage); // 广播给所有人
      console.log(`💬 ${username}: ${messageText}`);
    });

    // === 发送私聊消息 ===
    socket.on(
      'privateMessage',
      ({ target, message }: { target: string; message: string }) => {
        const sender = onlineUsers.get(socket.id);
        if (!sender) {
          socket.emit('error', '请先加入聊天室');
          return;
        }

        // 检查是否为好友
        const friends = friendsMap.get(sender) || [];
        if (!friends.includes(target)) {
          socket.emit('error', `你不是 ${target} 的好友，无法私聊`);
          return;
        }

        const privateMsg: ChatMessage = {
          username: sender,
          message,
          timestamp: Date.now(),
          type: 'private',
          target,
        };

        // 发送给接收者
        sendToUser(target, 'privateMessage', privateMsg);
        // 同时发送给自己（target 保持为接收者不变）
        socket.emit('privateMessage', privateMsg);

        console.log(`🔒 ${sender} -> ${target}: ${message}`);
      },
    );

    // === 输入状态（仅公共聊天室使用） ===
    socket.on('typing', (isTyping: boolean) => {
      const username = onlineUsers.get(socket.id);
      if (username) {
        socket.broadcast.emit('userTyping', { username, isTyping });
      }
    });

    // === 添加好友 ===
    socket.on('addFriend', (targetUsername: string) => {
      const username = onlineUsers.get(socket.id);
      if (!username) return socket.emit('error', '请先加入聊天室');
      if (targetUsername === username)
        return socket.emit('error', '不能添加自己为好友');

      // 检查目标是否存在（在线用户中）
      if (!userSockets.has(targetUsername)) {
        return socket.emit('error', '用户不存在或未在线');
      }

      // 检查是否已经是好友
      const myFriends = friendsMap.get(username) || [];
      if (myFriends.includes(targetUsername)) {
        return socket.emit('error', '该用户已经是你的好友');
      }

      // 检查是否已有待处理的请求
      const myPending = pendingRequests.get(username) || [];
      if (
        myPending.some((r) => r.to === targetUsername && r.status === 'pending')
      ) {
        return socket.emit('error', '你已经向该用户发送过好友请求');
      }

      // 创建请求
      const request: FriendRequest = {
        from: username,
        to: targetUsername,
        status: 'pending',
        timestamp: Date.now(),
      };

      // 保存到目标用户的待处理列表
      const targetRequests = pendingRequests.get(targetUsername) || [];
      targetRequests.push(request);
      pendingRequests.set(targetUsername, targetRequests);

      // 通知目标用户
      sendToUser(targetUsername, 'newFriendRequest', request);
      socket.emit('message', {
        username: '系统',
        message: `已向 ${targetUsername} 发送好友请求`,
        timestamp: Date.now(),
        type: 'public',
      });
    });

    // === 处理好友请求（接受/拒绝） ===
    socket.on(
      'handleFriendRequest',
      ({ from, accepted }: { from: string; accepted: boolean }) => {
        const username = onlineUsers.get(socket.id);
        if (!username) return;

        const targetRequests = pendingRequests.get(username) || [];
        const requestIdx = targetRequests.findIndex(
          (r) => r.from === from && r.status === 'pending',
        );
        if (requestIdx === -1)
          return socket.emit('error', '该请求不存在或已处理');

        const request = targetRequests[requestIdx];
        if (accepted) {
          request.status = 'accepted';

          // 双方添加好友
          const myFriends = friendsMap.get(username) || [];
          const hisFriends = friendsMap.get(from) || [];
          if (!myFriends.includes(from)) myFriends.push(from);
          if (!hisFriends.includes(username)) hisFriends.push(username);
          friendsMap.set(username, myFriends);
          friendsMap.set(from, hisFriends);

          // 通知双方
          sendToUser(from, 'friendList', friendsMap.get(from) || []);
          socket.emit('friendList', myFriends);
          sendToUser(from, 'message', {
            username: '系统',
            message: `${username} 接受了你的好友请求`,
            timestamp: Date.now(),
            type: 'public',
          });
          socket.emit('message', {
            username: '系统',
            message: `你和 ${from} 已成为好友`,
            timestamp: Date.now(),
            type: 'public',
          });
        } else {
          request.status = 'rejected';
          sendToUser(from, 'message', {
            username: '系统',
            message: `${username} 拒绝了你的好友请求`,
            timestamp: Date.now(),
            type: 'public',
          });
        }

        // 更新待处理列表（移除该请求）
        targetRequests.splice(requestIdx, 1);
        pendingRequests.set(username, targetRequests);
        socket.emit('friendRequests', targetRequests);
      },
    );

    // === 获取好友列表（可以在需要时刷新） ===
    socket.on('getFriendList', () => {
      const username = onlineUsers.get(socket.id);
      if (username) {
        socket.emit('friendList', friendsMap.get(username) || []);
      }
    });

    // === 断开连接 ===
    socket.on('disconnect', () => {
      const username = onlineUsers.get(socket.id);
      if (username) {
        onlineUsers.delete(socket.id);
        userSockets.delete(username); // 注意：如果同一用户多设备登录，这里会有问题，简化处理

        io.emit('message', {
          username: '系统',
          message: `${username} 离开了聊天室`,
          timestamp: Date.now(),
          type: 'public',
        });
        io.emit('userList', Array.from(onlineUsers.values()));

        // 通知好友
        const friends = friendsMap.get(username) || [];
        friends.forEach((friend) => {
          sendToUser(friend, 'message', {
            username: '系统',
            message: `${username} 下线了`,
            timestamp: Date.now(),
            type: 'public',
          });
        });
        console.log(
          `👋 ${username} 离开了聊天室，当前在线人数: ${onlineUsers.size}`,
        );
      }
    });
  });

  // HTTP 统计信息端点
  fastify.get(
    '/chat/stats',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        onlineUsers: onlineUsers.size,
        userList: Array.from(onlineUsers.values()),
        totalMessages: messageHistory.length,
      });
    },
  );

  fastify.addHook('onClose', (_, done) => {
    io.close();
    done();
  });

  console.log('💬 聊天控制器已加载（含好友和私聊）');
}
