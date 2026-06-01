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
            // 根据你的数据结构，response.data 包含完整的响应
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

    if (loading) {
        return (
            <PageBox>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">加载中...</div>
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
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">任务列表</h1>
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div className='flex items-center'>
                                <h2 className="text-xl font-semibold mr-2">{task.title}</h2>
                                <span className="text-red-500 font-bold">¥{task.price}</span>
                              </div>
                                <span className={`px-2 py-1 rounded text-sm ${
                                    task.type === '线下' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {task.type}
                                </span>
                            </div>
                            <p className="text-gray-600 mb-2">{task.content}</p>
                            <div className="flex justify-between items-center text-sm text-gray-500">
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
                    ))}
                </div>
                {tasks.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        暂无任务数据
                    </div>
                )}
            </div>
        </PageBox>
    );
};

export default Task;