// db_read.js - 使用 sql.js 读取 chat-history.db 并保存为 chat_history.json
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join('../', 'chat-history.db');
const jsonPath = path.join(__dirname, 'chat_history.json');

async function readDatabase() {
    try {
        // 读取数据库文件为 Buffer
        const fileBuffer = fs.readFileSync(dbPath);

        // 初始化 SQL.js
        const SQL = await initSqlJs();
        const db = new SQL.Database(fileBuffer);

        // 查询所有消息，按会话和 ID 排序
        const stmt = db.prepare(`
            SELECT session_id, role, content, created_at 
            FROM chat_messages 
            ORDER BY session_id, id
        `);

        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        if (rows.length === 0) {
            console.log('📭 数据库为空，没有聊天记录。');
            db.close();
            // 写入空数组
            fs.writeFileSync(jsonPath, JSON.stringify([], null, 2), 'utf-8');
            console.log(`已保存空记录到 ${jsonPath}`);
            return;
        }

        // 按 session_id 分组
        const sessions = {};
        rows.forEach(row => {
            const { session_id, role, content, created_at } = row;
            if (!sessions[session_id]) {
                sessions[session_id] = [];
            }
            sessions[session_id].push({ role, content, created_at });
        });

        // 转换为数组格式便于 JSON 存储
        const sessionsArray = Object.entries(sessions).map(([sessionId, messages], index) => ({
            session_id: sessionId,
            session_index: index + 1,
            messages: messages.map((msg, idx) => ({
                index: idx + 1,
                role: msg.role,
                content: msg.content,
                created_at: msg.created_at
            }))
        }));

        console.log(`📋 共找到 ${Object.keys(sessions).length} 个对话会话，${rows.length} 条消息。\n`);

        // 控制台输出（保持原有显示）
        Object.entries(sessions).forEach(([sessionId, messages], index) => {
            console.log(`══════════════════════════ 会话 ${index + 1} ══════════════════════════`);
            console.log(`会话 ID: ${sessionId}\n`);

            messages.forEach((msg, idx) => {
                const roleLabel = {
                    'system': '⚙️ 系统',
                    'user': '🧑 用户',
                    'assistant': '🤖 助手'
                }[msg.role] || msg.role;

                console.log(`${roleLabel} [${idx + 1}]: ${msg.content}`);
                if (msg.role === 'assistant') {
                    console.log(`    ⏱️ ${msg.created_at}`);
                }
            });
            console.log('');
        });

        // 保存为 JSON 文件
        fs.writeFileSync(jsonPath, JSON.stringify(sessionsArray, null, 2), 'utf-8');
        console.log(`✅ 数据已保存至 ${jsonPath}`);

        db.close();
        console.log('✅ 读取完成。');
    } catch (err) {
        console.error('❌ 读取数据库时出错:', err.message);
        process.exit(1);
    }
}

readDatabase();
