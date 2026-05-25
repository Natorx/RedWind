# file_handler.py - 安全的文件操作工具，限定在项目根目录的 example 文件夹内

import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMPLE_DIR = os.path.join(BASE_DIR, 'example')


def ensure_example_dir():
    os.makedirs(EXAMPLE_DIR, exist_ok=True)


def safe_path(filename: str) -> str:
    """
    返回安全的绝对路径，并确保不会逃逸到 example 目录外。
    同时禁止 filename 指向 example 目录本身（如空字符串或 "."）。
    """
    full_path = os.path.realpath(os.path.join(EXAMPLE_DIR, filename))
    example_real = os.path.realpath(EXAMPLE_DIR)

    if not full_path.startswith(example_real):
        raise ValueError(f"不允许的路径：{filename} 不在 example 目录内")
    # 禁止指向 example 目录本身
    if full_path == example_real:
        raise ValueError(f"不允许操作 example 目录本身，请指定具体文件名")
    # 禁止指向目录（即文件名是目录名）
    if os.path.exists(full_path) and os.path.isdir(full_path):
        raise ValueError(f"不允许操作目录：{filename}，请指定具体文件")
    return full_path


def write_file(filename: str, content: str, mode: str = 'w') -> str:
    ensure_example_dir()
    path = safe_path(filename)
    # 确保父目录存在（例如子目录）
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, mode, encoding='utf-8') as f:
        f.write(content)
    return f"文件已写入: {path}"


def read_file(filename: str) -> str:
    path = safe_path(filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"文件不存在: {path}")
    # 安全路径已确保不是目录，此处双重保险
    if os.path.isdir(path):
        raise ValueError(f"不允许读取目录: {filename}")
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def list_files() -> list:
    ensure_example_dir()
    # 递归列出所有文件（相对路径）
    files = []
    for root, dirs, filenames in os.walk(EXAMPLE_DIR):
        for fname in filenames:
            rel_path = os.path.relpath(os.path.join(root, fname), EXAMPLE_DIR)
            files.append(rel_path)
    return files


def delete_file(filename: str) -> str:
    path = safe_path(filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"文件不存在: {path}")
    # 安全路径已确保不是目录，但额外检查
    if os.path.isdir(path):
        raise ValueError(f"不允许删除目录: {filename}")
    os.remove(path)
    return f"文件已删除: {path}"

def sync_menu_md():
    """同步 example 目录结构到 docs/menu.md（并打印调试信息）"""
    docs_dir = os.path.join(BASE_DIR, 'docs')
    os.makedirs(docs_dir, exist_ok=True)
    
    file_list = list_files()
    lines = ["# Project Structure", ""]
    if file_list:
        lines.append("## example/")
        for f in file_list:
            lines.append(f"- {f}")
    else:
        lines.append("(example directory is empty)")
    
    menu_path = os.path.join(docs_dir, 'menu.md')
    content = '\n'.join(lines)
    
    # 打印调试信息（看看生成的内容和路径）
    print(f"\n[debug] syncing menu.md -> {menu_path}")
    print(f"[debug] content to write:\n{content}\n")
    
    with open(menu_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ 项目结构已同步到 {menu_path}")
    return menu_path

def handle_file_operations(text: str, messages: list):
    """
    解析并执行文件操作。
    对于读取操作：自动执行，内容注入到 messages 中，并返回 True（表示需要再次调用 AI）。
    对于写/删/列操作：询问用户，空回车同意，其他拒绝。
    返回 (changed, new_messages)，changed 表示是否需要重新调用 AI。
    """
    ops = parse_file_operations(text)
    print(f"[DEBUG] handle_file_operations called, ops count: {len(ops)}")
    if not ops:
        return False, messages

    print("\n--- 检测到文件操作请求 ---")
    need_rerun = False  # 是否有读取操作需要触发下一轮 AI 回答

    for op in ops:
        action, path, content = op

        if action == 'read':
            already_read = any(
                msg.get("role") == "system" and f"[文件读取结果] 以下为文件 {path} 的内容" in msg.get("content", "")
                for msg in messages
            )
            if already_read:
                print(f"  ⚠️ 文件 {path} 已经读取过，跳过重复读取。")
                continue
            try:
                result = read_file(path)
                print(f"  📖 已自动读取文件: {path}")
                print(f"文件内容如下：\n{result}")
                file_msg = {
                    "role": "system",
                    "content": f"[文件读取结果] 以下为文件 {path} 的内容：\n```\n{result}\n```"
                }
                messages.append(file_msg)
                need_rerun = True   # 读取成功，触发自动重试
            except Exception as e:
                print(f"  ❌ 读取失败: {e}")
                file_msg = {
                    "role": "system",
                    "content": f"[文件读取结果] 无法读取文件 {path}，原因: {e}。请根据需要创建或处理。"
                }
                messages.append(file_msg)
                need_rerun = True   # 即使失败也让AI知道情况并继续

        elif action == 'write':
            print(f"\nAI 请求写入文件: {path}")
            print("内容预览:")
            preview = content[:300] + "..." if len(content) > 300 else content
            print(preview)
            ans = input("是否授权此操作？(按回车同意，输入任意字符拒绝): ").strip()
            if ans == "":
                try:
                    result = write_file(path, content)
                    print(f"  ✅ 操作成功: {result}")
                    menu_path = sync_menu_md()
                    if os.path.exists(menu_path):
                        with open(menu_path, 'r', encoding='utf-8') as f:
                            menu_content = f.read()
                        file_msg = {
                            "role": "system",
                            "content": f"[项目结构同步] 当前项目文件结构：\n{menu_content}"
                        }
                        messages.append(file_msg)
                        print("  📂 项目结构已更新并注入对话。")
                except Exception as e:
                    print(f"  ❌ 操作失败: {e}")
            else:
                print("  ⏭️ 操作已取消。")

        elif action == 'delete':
            print(f"\nAI 请求删除文件: {path}")
            ans = input("是否授权此操作？(按回车同意，输入任意字符拒绝): ").strip()
            if ans == "":
                try:
                    result = delete_file(path)
                    print(f"  ✅ 操作成功: {result}")
                    menu_path = sync_menu_md()
                    if os.path.exists(menu_path):
                        with open(menu_path, 'r', encoding='utf-8') as f:
                            menu_content = f.read()
                        file_msg = {
                            "role": "system",
                            "content": f"[项目结构同步] 当前项目文件结构：\n{menu_content}"
                        }
                        messages.append(file_msg)
                        print("  📂 项目结构已更新并注入对话。")
                except Exception as e:
                    print(f"  ❌ 操作失败: {e}")
            else:
                print("  ⏭️ 操作已取消。")

        elif action == 'list':
            print("\nAI 请求列出 example 目录下的所有文件")
            # 自动执行（不再询问授权？根据之前设计，列表操作仍需要授权。但此处可按回车同意）
            ans = input("是否授权此操作？(按回车同意，输入任意字符拒绝): ").strip()
            if ans == "":
                try:
                    files = list_files()
                    result = '\n'.join(files) if files else "(example 目录为空)"
                    print(f"  📂 目录列表:\n{result}")   # 直接显示给用户
                    # 同时注入系统消息供 AI 参考
                    file_msg = {
                        "role": "system",
                        "content": f"[文件列表结果] example 目录下的文件：\n{result}"
                    }
                    messages.append(file_msg)   # 注意：需要将 messages 传入并修改
                except Exception as e:
                    print(f"  ❌ 操作失败: {e}")
            else:
                print("  ⏭️ 操作已取消。")


    print("--- 文件操作处理完毕 ---\n")
    return need_rerun, messages

def parse_file_operations(text: str) -> list:
    def clean_path(path: str) -> str:
        path = path.strip()
        if path.startswith('example/') or path.startswith('cexample\\'):
            path = path[len('example/'):]
        return path

    ops = []
    # 写操作：更宽容的正则，允许 path 属性前后有空格，允许自闭合？但写操作需要成对
    pattern_write = re.compile(r'<WRITE[ _]FILE\s+path="([^"]+)"\s*>(.*?)</WRITE[ _]FILE\s*>', re.DOTALL)
    for m in pattern_write.finditer(text):
        path = clean_path(m.group(1))
        content = m.group(2).strip()
        ops.append(('write', path, content))

    # 读取操作（支持自闭合或无闭合）
    pattern_read = re.compile(r'<READ[ _]FILE\s+path="([^"]+)"\s*/?\s*>', re.DOTALL)
    for m in pattern_read.finditer(text):
        path = clean_path(m.group(1))
        ops.append(('read', path, None))

    # 列表操作（泛化）
    pattern_list = re.compile(r'<LIST\b[^>]*/?\s*>', re.DOTALL)
    if pattern_list.search(text):
        ops.append(('list', None, None))

    # 删除操作
    pattern_delete = re.compile(r'<DELETE[ _]FILE\s+path="([^"]+)"\s*/?\s*>', re.DOTALL)
    for m in pattern_delete.finditer(text):
        path = clean_path(m.group(1))
        ops.append(('delete', path, None))

    # 调试：打印解析结果
    print(f"[DEBUG] parse_file_operations found {len(ops)} operation(s): {[(op[0], op[1]) for op in ops]}")

    return ops