# test_api.py - 测试接口层
from module.api import create_agent


def test_basic_chat():
    """测试基础对话"""
    print("=" * 50)
    print("测试 1: 基础对话")
    print("=" * 50)
    
    agent = create_agent()
    response = agent.send_message("你好，请介绍一下你自己")
    print(f"用户: 你好，请介绍一下你自己")
    print(f"AI: {response.message[:200]}...")
    print()


def test_file_operations():
    """测试文件操作"""
    print("=" * 50)
    print("测试 2: 文件操作")
    print("=" * 50)
    
    agent = create_agent()
    
    # 写入文件
    print("写入文件...")
    response = agent.send_message("创建一个名为 test.py 的文件，内容是 print('Hello World')")
    print(f"AI 回复: {response.message[:200]}...")
    
    # 查看文件操作结果
    for op in response.file_operations:
        print(f"文件操作: {op}")
    
    # 列出文件
    print("\n列出文件...")
    list_result = agent.execute_file_operation('list')
    print(f"文件列表:\n{list_result.result}")
    
    # 读取文件
    print("\n读取文件...")
    read_result = agent.execute_file_operation('read', path='test.py')
    if read_result.success:
        print(f"文件内容:\n{read_result.result}")


def test_skill_system():
    """测试技能系统"""
    print("=" * 50)
    print("测试 3: 技能系统")
    print("=" * 50)
    
    agent = create_agent()
    
    # 获取可用技能
    skills = agent.get_available_skills()
    print(f"可用技能: {skills}")
    
    # 切换技能
    if skills:
        agent.set_skill(skills[0], True)
        print(f"当前技能: {agent.get_current_skill()}")


def test_conversation_persistence():
    """测试对话持久化"""
    print("=" * 50)
    print("测试 4: 对话持久化")
    print("=" * 50)
    
    agent = create_agent()
    
    # 发送几条消息
    agent.send_message("我叫小明")
    agent.send_message("我喜欢编程")
    
    # 保存对话
    filepath = agent.save_conversation("test_conversation.json")
    print(f"对话已保存到: {filepath}")
    
    # 创建新 agent 并加载对话
    new_agent = create_agent()
    new_agent.load_conversation(filepath)
    
    # 检查历史
    history = new_agent.get_conversation_history()
    print(f"加载的对话历史包含 {len(history)} 条消息")
    
    # 继续对话
    response = new_agent.send_message("我叫什么名字？")
    print(f"AI 回答: {response.message}")


def main():
    """运行所有测试"""
    print("\n🚀 开始测试 Agent API\n")
    
    try:
        test_basic_chat()
    except Exception as e:
        print(f"基础对话测试失败: {e}")
    
    try:
        test_file_operations()
    except Exception as e:
        print(f"文件操作测试失败: {e}")
    
    try:
        test_skill_system()
    except Exception as e:
        print(f"技能系统测试失败: {e}")
    
    try:
        test_conversation_persistence()
    except Exception as e:
        print(f"对话持久化测试失败: {e}")
    
    print("\n✅ 测试完成")


if __name__ == "__main__":
    main()