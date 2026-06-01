// Task.tsx
import { useEffect, useState } from 'react';
import PageBox from '../components/PageBox';
import { taskApi } from '../apis/task';

// 定义数据类型
interface User {
    id: string;
    username: string;
}

interface TaskItem {
    id: string;
    title: string;
    content: string;
    price: string;
    type: string;
    progress: '未开始' | '进行中' | '已完成';
    user: User;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse {
    success: boolean;
    data: TaskItem[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

// 进度状态对应的样式和文本
const progressConfig = {
    '未开始': { 
        color: 'bg-neutral-600 text-neutral-300',
        icon: '⚪'
    },
    '进行中': { 
        color: 'bg-blue-600/70 text-blue-200',
        icon: '🔵'
    },
    '已完成': { 
        color: 'bg-green-600/70 text-green-200',
        icon: '✅'
    }
};

const Task: React.FC = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await taskApi.get();
            const apiResponse: ApiResponse = response.data;
            
            if (apiResponse.success) {
                setTasks(apiResponse.data);
            } else {
                setError('获取任务失败');
            }
        } catch (err) {
            setError('请求失败，请检查网络连接');
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    // 获取进度显示文本和样式
    const getProgressDisplay = (progress: TaskItem['progress']) => {
        const config = progressConfig[progress];
        return {
            text: progress,
            color: config.color,
            icon: config.icon
        };
    };

    if (loading) {
        return (
            <PageBox>
                <div className="flex justify-center items-center h-64">
                    <div className="text-neutral-400">加载中...</div>
                </div>
            </PageBox>
        );
    }

    if (error) {
        return (
            <PageBox>
                <div className="text-red-500 text-center p-4">{error}</div>
            </PageBox>
        );
    }

    return (
        <PageBox>
            <div className="flex flex-col justify-center items-start w-full p-6 relative">
                
                <div className="w-full z-10 space-y-4">
                    {tasks.map((task) => {
                        const progressDisplay = getProgressDisplay(task.progress);
                        return (
                            <div key={task.id} className="bg-neutral-800/30 backdrop-blur-sm rounded-xl p-4 border border-neutral-700/50 shadow-lg hover:border-red-500/30 transition-all duration-300">
                                <div className="flex justify-between items-start mb-3">
                                    <div className='flex items-center gap-3 flex-wrap'>
                                        <h2 className="text-xl font-semibold text-white">{task.title}</h2>
                                        <span className="text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded">
                                            ¥{task.price}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-sm ${progressDisplay.color}`}>
                                            {progressDisplay.icon} {progressDisplay.text}
                                        </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-sm ${
                                        task.type === '线下' ? 'bg-orange-600/70 text-orange-200' : 'bg-purple-600/70 text-purple-200'
                                    }`}>
                                        {task.type === '线下' ? '📍 线下' : '🌐 线上'}
                                    </span>
                                </div>
                                <p className="text-neutral-300 mb-3 leading-relaxed">{task.content}</p>
                                <div className="flex justify-between items-center text-sm text-neutral-400">
                                    <div>
                                        <span className="font-medium">发布者：</span>
                                        {task.user.username}
                                    </div>
                                    <div>
                                        <span className="font-medium">发布时间：</span>
                                        {new Date(task.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="bg-neutral-800/30 backdrop-blur-sm rounded-xl p-8 text-center text-neutral-500 border border-neutral-700/50">
                            暂无任务数据
                        </div>
                    )}
                </div>
            </div>
        </PageBox>
    );
};

export default Task;