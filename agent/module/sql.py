import sqlite3
import os

def save_messages_to_sqlite(messages: list, session_id: str):
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chat-history.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    data_to_insert = [(session_id, msg.get("role", ""), msg.get("content", "")) for msg in messages]
    cursor.executemany("INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)", data_to_insert)
    conn.commit()
    conn.close()
    print(f"对话记录已保存至 {db_path}，共 {len(messages)} 条消息。")

def clear_chat_history():
    """删除 chat_history.db 中所有记录"""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chat-history.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # 先确保表存在（防止尚未创建）
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # 清空表
    cursor.execute("DELETE FROM chat_messages")
    conn.commit()
    conn.close()
    print(f"✅ 数据库 {db_path} 中的对话记录已全部清除。")