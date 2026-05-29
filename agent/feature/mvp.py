# mvp.py - 主对话程序，集成 file_handler 和命令模块
import os
import uuid
from module.file_handler import handle_file_operations
from module.cmd import is_exit_command, handle_skill_command, get_skill_content, init_skill_file, is_clear_command
from module.ai import deepseek_chat
from module.sql import save_messages_to_sqlite, clear_chat_history
from module.config import load_config

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    # 确保 config 目录和默认技能文件存在
    init_skill_file()
    config = load_config(BASE_DIR)
    skill_enabled = config['skill_enabled']
    active_skill = "default.skill.md"  # 默认使用的技能文件

    system_msg = {
        "role": "system",
        "content": (
            "你是一个聪明、友好的助手，擅长编写和维护代码。你可以请求操作项目根目录下的 example 文件夹中的文件。\n"
            "当用户要求修改、查看、分析文件时，请主动使用读取标签获取文件内容，不要要求用户提供。\n"
            "读取文件格式：<READ FILE path=\"文件名.后缀\">\n"
            "（不要在里面放入任何内容，程序会自动读取并返回给你）\n"
            "写入文件格式：<WRITE FILE path=\"文件名.后缀\">\n代码内容\n</WRITE FILE>\n"
            "无需经过用户确认，文件会自动保存。\n"
            "其他操作（列表、删除）也请使用对应标记。\n\n"
            "⚠️ 重要规则：\n"
            "- 当用户要求新增功能、修改代码时，请直接读取文件，根据现有代码风格自行设计合理的实现（例如新增一条GET /api/hello接口），然后直接输出写入标签，不得询问用户任何细节。\n"
            "- 如果你已经读取过某个文件，它的内容会通过系统消息提供给你，不需要再次读取。\n"
            "- 请一次性完成读取 -> 修改 -> 写入的全部步骤，不要分多轮对话。"
        )
    }

    messages = [system_msg]
    session_id = str(uuid.uuid4())
    print("-- DeepSeek Agent MVP ---")
    print("已进入对话，对话ID:",session_id)
    print("exit/quit 退出")
    print("clear 清空对话历史数据")
    print("skill 查看/切换技能")
    print("------------------------------\n")

    while True:
        user_input = input("你: ").strip()
        if not user_input:
            continue

        # 1. 退出
        if is_exit_command(user_input):
            break

        # 2. 清空数据库指令（新增加）
        if is_clear_command(user_input):
            confirm = input("⚠️ 确认清除所有对话历史数据？(输入 yes 确认): ").strip().lower()
            if confirm == "yes":
                clear_chat_history()
                # 重置会话：保留系统消息，生成新 session_id
                messages = [system_msg]
                session_id = str(uuid.uuid4())
                print("已重置对话上下文，可开始新的对话。")
            else:
                print("操作已取消。")
            continue

        # 2. skill 命令
        handled, skill_enabled, active_skill = handle_skill_command(
            user_input, skill_enabled, active_skill
        )
        if handled:
            continue

        # 3. 组装用户消息
        if skill_enabled and active_skill:
            skill_content = get_skill_content(active_skill)
            if skill_content:
                enriched = skill_content + "\n\n" + user_input
                messages.append({"role": "user", "content": enriched})
            else:
                messages.append({"role": "user", "content": user_input})
        else:
            messages.append({"role": "user", "content": user_input})

        # 4. 第一次调用 AI
        print("deepseek-v4-flash: ", end="", flush=True)
        assistant_reply = deepseek_chat(messages)
        if assistant_reply is None:
            assistant_reply = ""
        messages.append({"role": "assistant", "content": assistant_reply})

        # 5. 处理第一次回复中的文件操作（自动读取、写入等）
        if assistant_reply:
            need_rerun, messages = handle_file_operations(assistant_reply, messages)

            # 如果发生了读取操作，则自动再调用一次 AI，让 AI 基于文件内容完成操作
            if need_rerun:
                print("（AI正在根据文件内容回复...）")
                print("deepseek-v4-flash: ", end="", flush=True)
                second_reply = deepseek_chat(messages)
                if second_reply is None:
                    second_reply = ""
                messages.append({"role": "assistant", "content": second_reply})

                # 处理第二次回复中的文件操作（通常包含写入请求）
                if second_reply:
                    handle_file_operations(second_reply, messages)
                # 注意：不再继续递归，避免无限循环

    save_messages_to_sqlite(messages, session_id)

if __name__ == "__main__":
    main()
