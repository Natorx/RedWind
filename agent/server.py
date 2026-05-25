# api_server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple

# 导入您的 AgentAPI
from module.api import AgentAPI, create_agent

app = FastAPI(title="AI Agent API")

# 或者更精确的配置（推荐）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",  # 你的 React 开发服务器端口
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:1420",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# 存储 Agent 实例（每个会话一个）
agents: Dict[str, AgentAPI] = {}

# 请求/响应模型
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    auto_execute: bool = True

class ChatResponse(BaseModel):
    message: str
    session_id: str
    file_operations: List[Dict[str, Any]]
    need_rerun: bool

class ResetRequest(BaseModel):
    session_id: str

class SkillRequest(BaseModel):
    session_id: str
    skill_name: str
    enabled: bool = True

# 修改这里：将 tuple[AgentAPI, str] 改为 Tuple[AgentAPI, str]
def get_or_create_agent(session_id: Optional[str] = None) -> Tuple[AgentAPI, str]:
    """获取或创建 Agent 实例"""
    if session_id and session_id in agents:
        return agents[session_id], session_id
    
    # 创建新 Agent
    agent = create_agent(skill_enabled=True, active_skill="default.skill.md")
    new_session_id = agent.session_id
    
    if session_id:
        # 如果提供了 session_id 但不存在，使用新的
        agents[new_session_id] = agent
        return agent, new_session_id
    else:
        agents[new_session_id] = agent
        return agent, new_session_id

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """发送消息"""
    agent, session_id = get_or_create_agent(request.session_id)
    
    response = agent.send_message(
        request.message, 
        auto_execute_ops=request.auto_execute
    )
    
    # 更新 agents 字典中的会话
    agents[session_id] = agent
    
    return ChatResponse(
        message=response.message,
        session_id=response.session_id,
        file_operations=response.file_operations,
        need_rerun=response.need_rerun
    )

@app.post("/api/reset")
async def reset_session(request: ResetRequest):
    """重置会话"""
    if request.session_id in agents:
        agents[request.session_id].reset_conversation()
        return {"status": "success", "message": "Session reset"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/api/skills")
async def get_skills():
    """获取可用技能列表"""
    agent = create_agent()
    skills = agent.get_available_skills()
    return {"skills": skills}

@app.post("/api/skill/switch")
async def switch_skill(request: SkillRequest):
    """切换技能"""
    if request.session_id not in agents:
        raise HTTPException(status_code=404, detail="Session not found")
    
    agent = agents[request.session_id]
    success = agent.set_skill(request.skill_name, request.enabled)
    
    if success:
        return {"status": "success", "message": f"Skill switched to {request.skill_name}"}
    else:
        raise HTTPException(status_code=400, detail="Skill not found")

@app.delete("/api/history")
async def clear_history(request: ResetRequest):
    """清空历史记录"""
    if request.session_id in agents:
        agents[request.session_id].clear_history()
        return {"status": "success", "message": "History cleared"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)