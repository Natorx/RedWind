# cmd.py - 处理退出、技能管理等命令
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR = os.path.join(BASE_DIR, 'skills')
DEFAULT_SKILL = 'default.skill.md'

def ensure_config_dir():
    os.makedirs(CONFIG_DIR, exist_ok=True)

def list_skill_files() -> list:
    if not os.path.isdir(CONFIG_DIR):
        return []
    files = [f for f in os.listdir(CONFIG_DIR) if f.endswith('.skill.md')]
    return sorted(files)

def init_skill_file():
    ensure_config_dir()
    if not list_skill_files():
        # 没有任何 skill 文件时创建默认的
        default_path = os.path.join(CONFIG_DIR, DEFAULT_SKILL)
        default_content = """# 技能配置

- 当前无自定义技能。
- 你可以编辑此文件来定义 AI 的个性化能力，例如：
  - 回答问题时优先使用中文
  - 擅长编写 Python 代码
  - 能够分析 Markdown 文档
  - 等等...
"""
        with open(default_path, 'w', encoding='utf-8') as f:
            f.write(default_content)
        print(f"已创建默认技能配置文件: {default_path}")

def get_skill_content(skill_file: str = None) -> str:
    if skill_file is None:
        return ""
    path = os.path.join(CONFIG_DIR, skill_file)
    if not os.path.isfile(path):
        return ""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ""

def is_exit_command(text: str) -> bool:
    return text.strip().lower() in ("exit", "quit")

def is_clear_command(text: str) -> bool:
    """判断是否为清空数据库指令"""
    return text.strip().lower() in ("clear", "reset", "drop")


def handle_skill_command(text: str, current_enabled: bool, current_skill: str = None):
    if text.strip().lower() != "skill":
        return (False, current_enabled, current_skill)

    # 确保至少有一个 skill 文件存在
    init_skill_file()

    skill_files = list_skill_files()
    print("\n=== 技能管理 ===")
    print(f"当前技能状态: {'开启' if current_enabled else '关闭'}")
    if current_skill:
        print(f"当前选中的技能文件: {current_skill}")
    else:
        print("当前未选择技能文件")
    print("可用技能文件:")
    if not skill_files:
        print("   (无)")
    else:
        for i, f in enumerate(skill_files, 1):
            print(f"  {i}. {f}")

    if not skill_files:
        print("技能已禁用。\n")
        return (True, False, None)

    # 直接询问用户选择
    print("输入0不启用，空默认使用default")
    prompt = "输入序号启用: "
    choice = input(prompt).strip()

    if choice == "0":
        new_enabled = False
        new_skill = None
        print("技能已禁用。")
    elif choice == "":
        # 空输入 -> 默认使用 default.skill.md
        default_filename = "default.skill.md"
        if default_filename in skill_files:
            new_enabled = True
            new_skill = default_filename
            print(f"已启用{new_skill}")
        elif skill_files:
            new_enabled = True
            new_skill = skill_files[0]
            print(f"未找到{default_filename}，默认使用: {new_skill}")
            print(f"已启用{new_skill}")
        else:
            new_enabled = False
            new_skill = None
            print("没有可用技能文件，技能已禁用。")
    elif choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(skill_files):
            new_enabled = True
            new_skill = skill_files[idx]
            print(f"技能已启用，使用技能文件: {new_skill}")
        else:
            print("无效序号，技能已禁用。")
            new_enabled = False
            new_skill = None
    else:
        # 其他输入（字母等）视为不启用
        new_enabled = False
        new_skill = None
        print("技能已禁用。")

    print()
    return (True, new_enabled, new_skill)

