# agent_api.py - AI Agent 接口层
import os
import sys
import json
import uuid
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from module.ai import deepseek_chat
from module.file_handler import (
    read_file, write_file, delete_file, list_files, 
    safe_path, ensure_example_dir, sync_menu_md
)
from module.cmd import get_skill_content, list_skill_files
from module.sql import save_messages_to_sqlite, clear_chat_history


class MessageRole(Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class Message:
    """消息数据类"""
    role: str
    content: str
    
    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


@dataclass
class FileOperation:
    """文件操作数据类"""
    action: str  # read, write, delete, list
    path: Optional[str] = None
    content: Optional[str] = None
    success: bool = False
    result: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ChatResponse:
    """对话响应数据类"""
    message: str
    file_operations: List[Dict[str, Any]]
    need_rerun: bool
    session_id: str
    usage: Optional[Dict[str, int]] = None


class AgentAPI:
    """
    AI Agent 接口类
    提供对话、文件操作、技能管理等核心功能
    """
    
    def __init__(self, skill_enabled: bool = True, active_skill: str = "default.skill.md"):
        """
        初始化 Agent
        
        Args:
            skill_enabled: 是否启用技能
            active_skill: 激活的技能文件名
        """
        self.skill_enabled = skill_enabled
        self.active_skill = active_skill
        self.session_id = str(uuid.uuid4())
        self.messages: List[Message] = []
        self._init_system_message()
        
        # 确保必要目录存在
        ensure_example_dir()
        
    def _init_system_message(self):
        """初始化系统消息"""
        system_content = (
            "你是一个聪明、友好的助手，擅长编写和维护代码。你可以请求操作项目根目录下的 example 文件夹中的文件。\n"
            "当用户要求修改、查看、分析文件时，请主动使用读取标签获取文件内容，不要要求用户提供。\n"
            "读取文件格式：<READ FILE path=\"文件名.后缀\">\n"
            "（不要在里面放入任何内容，程序会自动读取并返回给你）\n"
            "写入文件格式：<WRITE FILE path=\"文件名.后缀\">\n代码内容\n</WRITE FILE>\n"
            "无需经过用户确认，文件会自动保存。\n"
            "其他操作（列表、删除）也请使用对应标记。\n\n"
            "⚠️ 重要规则：\n"
            "- 当用户要求新增功能、修改代码时，请直接读取文件，根据现有代码风格自行设计合理的实现，然后直接输出写入标签，不得询问用户任何细节。\n"
            "- 如果你已经读取过某个文件，它的内容会通过系统消息提供给你，不需要再次读取。\n"
            "- 请一次性完成读取 -> 修改 -> 写入的全部步骤，不要分多轮对话。"
        )
        self.messages.append(Message(role=MessageRole.SYSTEM.value, content=system_content))
    
    def reset_conversation(self):
        """重置对话（清空历史，保留系统消息）"""
        self.messages = [self.messages[0]]  # 只保留第一条系统消息
        self.session_id = str(uuid.uuid4())
    
    def clear_history(self):
        """清空数据库中的历史记录"""
        clear_chat_history()
        self.reset_conversation()
    
    def set_skill(self, skill_name: str, enabled: bool = True) -> bool:
        """
        设置技能
        
        Args:
            skill_name: 技能文件名
            enabled: 是否启用
            
        Returns:
            是否设置成功
        """
        if enabled:
            skills = list_skill_files()
            if skill_name in skills:
                self.active_skill = skill_name
                self.skill_enabled = True
                return True
            return False
        else:
            self.skill_enabled = False
            return True
    
    def get_available_skills(self) -> List[str]:
        """获取可用的技能列表"""
        return list_skill_files()
    
    def get_current_skill(self) -> Optional[str]:
        """获取当前技能"""
        return self.active_skill if self.skill_enabled else None
    
    def send_message(self, user_input: str, auto_execute_ops: bool = True) -> ChatResponse:
        """
        发送消息并获取回复
        
        Args:
            user_input: 用户输入
            auto_execute_ops: 是否自动执行文件操作
            
        Returns:
            ChatResponse 对象
        """
        # 1. 组装用户消息（添加技能内容）
        if self.skill_enabled and self.active_skill:
            skill_content = get_skill_content(self.active_skill)
            if skill_content:
                enriched = skill_content + "\n\n" + user_input
                self.messages.append(Message(role=MessageRole.USER.value, content=enriched))
            else:
                self.messages.append(Message(role=MessageRole.USER.value, content=user_input))
        else:
            self.messages.append(Message(role=MessageRole.USER.value, content=user_input))
        
        # 2. 调用 AI
        messages_dict = [m.to_dict() for m in self.messages]
        assistant_reply = deepseek_chat(messages_dict)
        
        if assistant_reply is None:
            assistant_reply = ""
        
        self.messages.append(Message(role=MessageRole.ASSISTANT.value, content=assistant_reply))
        
        # 3. 处理文件操作
        file_ops = self._parse_and_execute_ops(assistant_reply, auto_execute_ops)
        
        need_rerun = any(op.success and op.action == 'read' for op in file_ops)
        
        # 4. 如果需要重新运行（有读取操作），再次调用 AI
        if need_rerun and auto_execute_ops:
            messages_dict = [m.to_dict() for m in self.messages]
            second_reply = deepseek_chat(messages_dict)
            if second_reply:
                self.messages.append(Message(role=MessageRole.ASSISTANT.value, content=second_reply))
                # 处理第二次回复中的文件操作
                second_ops = self._parse_and_execute_ops(second_reply, auto_execute_ops)
                file_ops.extend(second_ops)
                assistant_reply = second_reply
        
        # 5. 保存到数据库
        save_messages_to_sqlite([m.to_dict() for m in self.messages], self.session_id)
        
        return ChatResponse(
            message=assistant_reply,
            file_operations=[asdict(op) for op in file_ops if op.success],
            need_rerun=need_rerun,
            session_id=self.session_id
        )
    
    def _parse_and_execute_ops(self, text: str, auto_execute: bool) -> List[FileOperation]:
        """
        解析并执行文件操作
        
        Args:
            text: AI 回复文本
            auto_execute: 是否自动执行
            
        Returns:
            文件操作列表
        """
        ops = self._parse_file_operations(text)
        results = []
        
        for action, path, content in ops:
            op = FileOperation(action=action, path=path, content=content)
            if not auto_execute:
                results.append(op)
                continue
            
            try:
                if action == 'read':
                    if path:
                        result = read_file(path)
                        op.success = True
                        op.result = result
                        # 注入文件内容到消息
                        file_msg = Message(
                            role=MessageRole.SYSTEM.value,
                            content=f"[文件读取结果] 以下为文件 {path} 的内容：\n```\n{result}\n```"
                        )
                        self.messages.append(file_msg)
                
                elif action == 'write':
                    if path and content is not None:
                        result = write_file(path, content)
                        op.success = True
                        op.result = result
                        # 同步项目结构
                        sync_menu_md()
                
                elif action == 'delete':
                    if path:
                        result = delete_file(path)
                        op.success = True
                        op.result = result
                        sync_menu_md()
                
                elif action == 'list':
                    files = list_files()
                    result = '\n'.join(files) if files else "(example 目录为空)"
                    op.success = True
                    op.result = result
                    
            except Exception as e:
                op.error = str(e)
            
            results.append(op)
        
        return results
    
    def _parse_file_operations(self, text: str) -> List[Tuple[str, Optional[str], Optional[str]]]:
        """解析文本中的文件操作标签"""
        import re
        
        def clean_path(path: str) -> str:
            path = path.strip()
            if path.startswith('example/') or path.startswith('example\\'):
                path = path[len('example/'):]
            return path
        
        ops = []
        
        # 写操作
        pattern_write = re.compile(r'<WRITE[ _]FILE\s+path="([^"]+)"\s*>(.*?)</WRITE[ _]FILE\s*>', re.DOTALL)
        for m in pattern_write.finditer(text):
            path = clean_path(m.group(1))
            content = m.group(2).strip()
            ops.append(('write', path, content))
        
        # 读取操作
        pattern_read = re.compile(r'<READ[ _]FILE\s+path="([^"]+)"\s*/?\s*>', re.DOTALL)
        for m in pattern_read.finditer(text):
            path = clean_path(m.group(1))
            ops.append(('read', path, None))
        
        # 列表操作
        pattern_list = re.compile(r'<LIST\b[^>]*/?\s*>', re.DOTALL)
        if pattern_list.search(text):
            ops.append(('list', None, None))
        
        # 删除操作
        pattern_delete = re.compile(r'<DELETE[ _]FILE\s+path="([^"]+)"\s*/?\s*>', re.DOTALL)
        for m in pattern_delete.finditer(text):
            path = clean_path(m.group(1))
            ops.append(('delete', path, None))
        
        return ops
    
    def execute_file_operation(self, action: str, path: str = None, content: str = None) -> FileOperation:
        """
        手动执行文件操作
        
        Args:
            action: 操作类型 (read/write/delete/list)
            path: 文件路径
            content: 写入内容（仅 write 需要）
            
        Returns:
            FileOperation 对象
        """
        op = FileOperation(action=action, path=path, content=content)
        
        try:
            if action == 'read':
                if not path:
                    raise ValueError("读取操作需要提供 path")
                result = read_file(path)
                op.success = True
                op.result = result
            elif action == 'write':
                if not path:
                    raise ValueError("写入操作需要提供 path")
                if content is None:
                    raise ValueError("写入操作需要提供 content")
                result = write_file(path, content)
                op.success = True
                op.result = result
            elif action == 'delete':
                if not path:
                    raise ValueError("删除操作需要提供 path")
                result = delete_file(path)
                op.success = True
                op.result = result
            elif action == 'list':
                files = list_files()
                result = '\n'.join(files) if files else "(example 目录为空)"
                op.success = True
                op.result = result
            else:
                raise ValueError(f"不支持的操作类型: {action}")
        except Exception as e:
            op.error = str(e)
        
        return op
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """获取对话历史"""
        return [m.to_dict() for m in self.messages]
    
    def save_conversation(self, filepath: str = None):
        """保存对话到文件"""
        if filepath is None:
            filepath = f"conversation_{self.session_id}.json"
        
        data = {
            "session_id": self.session_id,
            "messages": [m.to_dict() for m in self.messages],
            "skill_enabled": self.skill_enabled,
            "active_skill": self.active_skill
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def load_conversation(self, filepath: str):
        """从文件加载对话"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.session_id = data.get("session_id", str(uuid.uuid4()))
        self.skill_enabled = data.get("skill_enabled", True)
        self.active_skill = data.get("active_skill", "default.skill.md")
        self.messages = [Message(**msg) for msg in data.get("messages", [])]
        
        if not self.messages:
            self._init_system_message()


# 便捷函数
def create_agent(skill_enabled: bool = True, active_skill: str = "default.skill.md") -> AgentAPI:
    """创建 Agent 实例的便捷函数"""
    return AgentAPI(skill_enabled=skill_enabled, active_skill=active_skill)