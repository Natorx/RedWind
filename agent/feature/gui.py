# gui_simple.py - 简易 GUI 客户端（修复版）
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import threading
from datetime import datetime
import json

# 添加项目根目录到路径
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from module.api import create_agent, AgentAPI


class SimpleAgentGUI:
    """简易 AI Agent GUI"""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("AI Agent Assistant")
        self.root.geometry("900x700")
        self.root.minsize(700, 500)
        
        # 先创建 UI（包含 status_var）
        self.setup_ui()
        
        # 然后初始化 Agent
        self.agent: AgentAPI = None
        self.init_agent()
        
        # 绑定关闭事件
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def init_agent(self):
        """初始化 Agent"""
        try:
            self.agent = create_agent(skill_enabled=True)
            self.status_var.set("就绪 ✅")
            # 初始化完成后刷新技能和文件列表
            self.refresh_skills()
            self.refresh_file_list()
        except Exception as e:
            messagebox.showerror("初始化错误", f"无法初始化 Agent:\n{str(e)}")
            self.status_var.set("错误 ❌")
    
    def setup_ui(self):
        """设置 UI 布局"""
        # 主框架
        main_frame = ttk.Frame(self.root, padding="5")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # 顶部工具栏
        toolbar = ttk.Frame(main_frame)
        toolbar.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        # 技能管理
        ttk.Label(toolbar, text="技能:").pack(side=tk.LEFT, padx=(0, 5))
        self.skill_var = tk.StringVar(value="default.skill.md")
        self.skill_combo = ttk.Combobox(toolbar, textvariable=self.skill_var, width=20)
        self.skill_combo.pack(side=tk.LEFT, padx=(0, 10))
        
        self.skill_enabled_var = tk.BooleanVar(value=True)
        self.skill_toggle = ttk.Checkbutton(
            toolbar, text="启用技能", variable=self.skill_enabled_var,
            command=self.toggle_skill
        )
        self.skill_toggle.pack(side=tk.LEFT, padx=(0, 10))
        
        ttk.Separator(toolbar, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=5)
        
        # 操作按钮
        ttk.Button(toolbar, text="清空对话", command=self.clear_conversation).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="保存对话", command=self.save_conversation).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="加载对话", command=self.load_conversation).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="刷新文件列表", command=self.refresh_file_list).pack(side=tk.LEFT, padx=2)
        
        # 聊天显示区域
        chat_frame = ttk.LabelFrame(main_frame, text="对话记录", padding="5")
        chat_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        chat_frame.columnconfigure(0, weight=1)
        chat_frame.rowconfigure(0, weight=1)
        
        self.chat_display = scrolledtext.ScrolledText(
            chat_frame, wrap=tk.WORD, font=("微软雅黑", 10), state=tk.DISABLED
        )
        self.chat_display.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置聊天显示区域的标签样式
        self.chat_display.tag_config("user", foreground="#2c3e50", font=("微软雅黑", 10, "bold"))
        self.chat_display.tag_config("assistant", foreground="#27ae60", font=("微软雅黑", 10, "bold"))
        self.chat_display.tag_config("system", foreground="#7f8c8d", font=("微软雅黑", 9, "italic"))
        self.chat_display.tag_config("error", foreground="#e74c3c")
        
        # 文件列表区域
        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(5, 0), pady=5)
        main_frame.columnconfigure(1, weight=0)
        
        file_frame = ttk.LabelFrame(right_frame, text="example 文件列表", padding="5")
        file_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        file_frame.columnconfigure(0, weight=1)
        file_frame.rowconfigure(0, weight=1)
        
        self.file_listbox = tk.Listbox(file_frame, height=15, width=30)
        self.file_listbox.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        file_scrollbar = ttk.Scrollbar(file_frame, orient=tk.VERTICAL, command=self.file_listbox.yview)
        file_scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.file_listbox.config(yscrollcommand=file_scrollbar.set)
        
        # 文件操作按钮
        file_btn_frame = ttk.Frame(file_frame)
        file_btn_frame.grid(row=1, column=0, columnspan=2, pady=5)
        
        ttk.Button(file_btn_frame, text="查看文件", command=self.view_selected_file).pack(side=tk.LEFT, padx=2)
        ttk.Button(file_btn_frame, text="删除文件", command=self.delete_selected_file).pack(side=tk.LEFT, padx=2)
        
        # 输入区域
        input_frame = ttk.Frame(main_frame)
        input_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(5, 0))
        input_frame.columnconfigure(0, weight=1)
        
        self.input_text = scrolledtext.ScrolledText(input_frame, height=4, wrap=tk.WORD, font=("微软雅黑", 10))
        self.input_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 绑定 Enter 发送（Shift+Enter 换行）
        self.input_text.bind("<Return>", self.on_enter_pressed)
        self.input_text.bind("<Shift-Return>", lambda e: None)  # 允许 Shift+Enter 换行
        
        # 按钮区域
        button_frame = ttk.Frame(input_frame)
        button_frame.grid(row=0, column=1, sticky=(tk.N, tk.E), padx=(5, 0))
        
        self.send_btn = ttk.Button(button_frame, text="发送", command=self.send_message, width=10)
        self.send_btn.pack(pady=(0, 5))
        
        self.stop_btn = ttk.Button(button_frame, text="停止", command=self.stop_generation, width=10, state=tk.DISABLED)
        self.stop_btn.pack()
        
        # 状态栏（必须在最后创建，因为后面会用到）
        self.status_var = tk.StringVar(value="初始化中...")
        status_bar = ttk.Label(main_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_bar.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(5, 0))
        
        # 显示欢迎消息
        self.append_chat("系统", "欢迎使用 AI Agent Assistant！\n输入消息开始对话，支持文件读写操作。", "system")
        
    def refresh_skills(self):
        """刷新技能列表"""
        if self.agent:
            try:
                skills = self.agent.get_available_skills()
                self.skill_combo['values'] = skills
                if skills and self.agent.get_current_skill() in skills:
                    self.skill_var.set(self.agent.get_current_skill())
                elif skills:
                    self.skill_var.set(skills[0])
            except Exception as e:
                print(f"刷新技能列表失败: {e}")
    
    def toggle_skill(self):
        """切换技能启用状态"""
        if self.agent:
            enabled = self.skill_enabled_var.get()
            skill = self.skill_var.get() if enabled else None
            if skill and enabled:
                self.agent.set_skill(skill, True)
            else:
                self.agent.set_skill("", False)
            status = "启用" if enabled else "禁用"
            self.append_chat("系统", f"技能已{status}", "system")
    
    def refresh_file_list(self):
        """刷新文件列表"""
        if self.agent:
            try:
                result = self.agent.execute_file_operation('list')
                self.file_listbox.delete(0, tk.END)
                if result.success and result.result:
                    files = result.result.split('\n')
                    for f in files:
                        if f and f != "(example 目录为空)":
                            self.file_listbox.insert(tk.END, f)
            except Exception as e:
                print(f"刷新文件列表失败: {e}")
    
    def view_selected_file(self):
        """查看选中的文件"""
        selection = self.file_listbox.curselection()
        if not selection:
            messagebox.showinfo("提示", "请先选择一个文件")
            return
        
        filename = self.file_listbox.get(selection[0])
        
        try:
            result = self.agent.execute_file_operation('read', path=filename)
            if result.success:
                # 在新窗口中显示文件内容
                view_window = tk.Toplevel(self.root)
                view_window.title(f"查看文件: {filename}")
                view_window.geometry("600x500")
                
                text_area = scrolledtext.ScrolledText(view_window, wrap=tk.WORD, font=("Consolas", 10))
                text_area.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
                text_area.insert(tk.END, result.result)
                text_area.config(state=tk.DISABLED)
            else:
                messagebox.showerror("错误", f"读取文件失败:\n{result.error}")
        except Exception as e:
            messagebox.showerror("错误", str(e))
    
    def delete_selected_file(self):
        """删除选中的文件"""
        selection = self.file_listbox.curselection()
        if not selection:
            messagebox.showinfo("提示", "请先选择一个文件")
            return
        
        filename = self.file_listbox.get(selection[0])
        
        if messagebox.askyesno("确认删除", f"确定要删除文件 {filename} 吗？"):
            try:
                result = self.agent.execute_file_operation('delete', path=filename)
                if result.success:
                    self.append_chat("系统", f"✅ 已删除文件: {filename}", "system")
                    self.refresh_file_list()
                else:
                    messagebox.showerror("错误", f"删除失败:\n{result.error}")
            except Exception as e:
                messagebox.showerror("错误", str(e))
    
    def append_chat(self, sender: str, message: str, msg_type: str = "assistant"):
        """在聊天显示区域添加消息"""
        self.chat_display.config(state=tk.NORMAL)
        
        # 添加时间戳
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # 添加发送者标识
        self.chat_display.insert(tk.END, f"\n[{timestamp}] ", "system")
        self.chat_display.insert(tk.END, f"{sender}:\n", msg_type)
        
        # 添加消息内容
        self.chat_display.insert(tk.END, f"{message}\n", "system")
        
        # 添加分隔线
        self.chat_display.insert(tk.END, "-" * 50 + "\n", "system")
        
        # 自动滚动到底部
        self.chat_display.see(tk.END)
        self.chat_display.config(state=tk.DISABLED)
    
    def send_message(self):
        """发送消息"""
        user_input = self.input_text.get("1.0", tk.END).strip()
        if not user_input:
            return
        
        # 清空输入框
        self.input_text.delete("1.0", tk.END)
        
        # 显示用户消息
        self.append_chat("你", user_input, "user")
        
        # 禁用发送按钮，显示加载状态
        self.send_btn.config(state=tk.DISABLED, text="发送中...")
        self.stop_btn.config(state=tk.NORMAL)
        self.status_var.set("AI 正在思考... 🤔")
        
        # 在新线程中发送消息，避免阻塞 UI
        thread = threading.Thread(target=self._do_send_message, args=(user_input,))
        thread.daemon = True
        thread.start()
    
    def _do_send_message(self, user_input: str):
        """实际发送消息的逻辑（在后台线程中执行）"""
        try:
            # 更新技能设置
            if self.skill_enabled_var.get():
                skill = self.skill_var.get()
                self.agent.set_skill(skill, True)
            else:
                self.agent.set_skill("", False)
            
            # 发送消息
            response = self.agent.send_message(user_input, auto_execute_ops=True)
            
            # 在主线程中更新 UI
            self.root.after(0, self._on_message_received, response)
            
        except Exception as e:
            self.root.after(0, self._on_message_error, str(e))
    
    def _on_message_received(self, response):
        """消息接收完成后的回调"""
        # 显示 AI 回复
        self.append_chat("AI", response.message, "assistant")
        
        # 显示文件操作信息
        for op in response.file_operations:
            if isinstance(op, dict):
                action = op.get('action')
                path = op.get('path')
                if action == 'read':
                    self.append_chat("系统", f"📖 已读取文件: {path}", "system")
                elif action == 'write':
                    self.append_chat("系统", f"✏️ 已写入文件: {path}", "system")
                elif action == 'delete':
                    self.append_chat("系统", f"🗑️ 已删除文件: {path}", "system")
        
        # 刷新文件列表
        self.refresh_file_list()
        
        # 恢复 UI 状态
        self.send_btn.config(state=tk.NORMAL, text="发送")
        self.stop_btn.config(state=tk.DISABLED)
        self.status_var.set("就绪 ✅")
    
    def _on_message_error(self, error_msg: str):
        """消息发送错误回调"""
        self.append_chat("系统", f"❌ 错误: {error_msg}", "error")
        self.send_btn.config(state=tk.NORMAL, text="发送")
        self.stop_btn.config(state=tk.DISABLED)
        self.status_var.set("错误 ❌")
    
    def stop_generation(self):
        """停止生成（目前只是 UI 状态恢复）"""
        self.send_btn.config(state=tk.NORMAL, text="发送")
        self.stop_btn.config(state=tk.DISABLED)
        self.status_var.set("已停止")
        self.append_chat("系统", "⏹️ 已停止生成", "system")
    
    def clear_conversation(self):
        """清空对话"""
        if messagebox.askyesno("确认", "确定要清空所有对话记录吗？"):
            if self.agent:
                self.agent.clear_history()
            self.chat_display.config(state=tk.NORMAL)
            self.chat_display.delete("1.0", tk.END)
            self.chat_display.config(state=tk.DISABLED)
            self.append_chat("系统", "🗑️ 对话已清空", "system")
            self.status_var.set("对话已清空")
    
    def save_conversation(self):
        """保存对话"""
        if not self.agent:
            messagebox.showerror("错误", "Agent 未初始化")
            return
            
        filepath = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filepath:
            try:
                result = self.agent.save_conversation(filepath)
                messagebox.showinfo("成功", f"对话已保存到:\n{result}")
                self.status_var.set("对话已保存 💾")
            except Exception as e:
                messagebox.showerror("错误", f"保存失败:\n{str(e)}")
    
    def load_conversation(self):
        """加载对话"""
        if not self.agent:
            messagebox.showerror("错误", "Agent 未初始化")
            return
            
        filepath = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filepath:
            try:
                self.agent.load_conversation(filepath)
                
                # 更新 UI
                self.chat_display.config(state=tk.NORMAL)
                self.chat_display.delete("1.0", tk.END)
                self.chat_display.config(state=tk.DISABLED)
                
                # 显示加载的消息
                for msg in self.agent.get_conversation_history():
                    if msg['role'] == 'system':
                        continue
                    self.append_chat(msg['role'], msg['content'], msg['role'])
                
                self.refresh_skills()
                self.refresh_file_list()
                messagebox.showinfo("成功", "对话已加载")
                self.status_var.set("对话已加载 📂")
                
            except Exception as e:
                messagebox.showerror("错误", f"加载失败:\n{str(e)}")
    
    def on_enter_pressed(self, event):
        """处理 Enter 键按下事件"""
        # 如果没有按下 Shift，则发送消息
        if not (event.state & 0x0001):  # Shift 键状态
            self.send_message()
            return "break"  # 阻止默认的换行行为
    
    def on_closing(self):
        """关闭窗口时的处理"""
        if messagebox.askokcancel("退出", "确定要退出吗？"):
            self.root.destroy()
    
    def run(self):
        """运行 GUI"""
        self.root.mainloop()


def main():
    """主函数"""
    app = SimpleAgentGUI()
    app.run()


if __name__ == "__main__":
    main()