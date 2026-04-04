/**src/components/DrillGround.tsx
 * @Author: Fofow
 * @Date: 2026/4/2
 * @Description: 练习场组件 - 集成SQLite数据管理
 * @Copyright: Copyright (©)}) 2026 Fofow. All rights reserved.
 */
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// 定义用户类型
interface User {
  id: number;
  name: string;
  age: number;
}

// 操作状态类型
type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

const DrillGround: React.FC = () => {
  // 状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [operationStatus, setOperationStatus] = useState<{
    addUser: OperationStatus;
    deleteUser: OperationStatus;
    loadUsers: OperationStatus;
  }>({
    addUser: 'idle',
    deleteUser: 'idle',
    loadUsers: 'idle',
  });
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // 添加用户
  const handleAddUser = async () => {
    setOperationStatus((prev) => ({ ...prev, addUser: 'loading' }));
    try {
      await invoke('add_user', {
        name: 'teabos',
        age: 20,
      });
      setOperationStatus((prev) => ({ ...prev, addUser: 'success' }));
      showMessage('success', '用户添加成功');
      // 自动刷新用户列表
      setTimeout(() => loadUsers(), 500);
    } catch (error) {
      console.error('添加用户失败:', error);
      setOperationStatus((prev) => ({ ...prev, addUser: 'error' }));
      showMessage('error', '添加用户失败');
    } finally {
      setTimeout(() => {
        setOperationStatus((prev) => ({ ...prev, addUser: 'idle' }));
      }, 2000);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    setOperationStatus((prev) => ({ ...prev, loadUsers: 'loading' }));
    setLoading(true);
    try {
      const result = await invoke<User[]>('get_users');
      setUsers(result);
      setOperationStatus((prev) => ({ ...prev, loadUsers: 'success' }));
      if (result.length === 0) {
        showMessage('info', '暂无用户数据');
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      setOperationStatus((prev) => ({ ...prev, loadUsers: 'error' }));
      showMessage('error', '加载用户失败');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setOperationStatus((prev) => ({ ...prev, loadUsers: 'idle' }));
      }, 2000);
    }
  };

  // 删除用户
  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`确定要删除用户 "${name}" 吗？`)) return;

    setOperationStatus((prev) => ({ ...prev, deleteUser: 'loading' }));
    try {
      await invoke('delete_user', { id });
      setOperationStatus((prev) => ({ ...prev, deleteUser: 'success' }));
      showMessage('success', `用户 "${name}" 删除成功`);
      // 更新本地状态
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error) {
      console.error('删除用户失败:', error);
      setOperationStatus((prev) => ({ ...prev, deleteUser: 'error' }));
      showMessage('error', '删除用户失败');
    } finally {
      setTimeout(() => {
        setOperationStatus((prev) => ({ ...prev, deleteUser: 'idle' }));
      }, 2000);
    }
  };

  // 显示消息
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 操作按钮状态
  const isAdding = operationStatus.addUser === 'loading';
  const isDeleting = operationStatus.deleteUser === 'loading';
  const isLoadingUsers = operationStatus.loadUsers === 'loading';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* 消息提示 */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : message.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : message.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : null}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">练习场</h1>
          <p className="text-gray-600">集成SQLite数据库操作与功能演示</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 右侧：SQLite数据管理 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-5 h-5" />
                SQLite 用户管理
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  disabled={isAdding}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                    isAdding
                      ? 'bg-green-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isAdding ? '添加中...' : '添加用户'}
                </button>

                <button
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 ${
                    isLoadingUsers
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  {isLoadingUsers ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isLoadingUsers ? '加载中...' : '刷新列表'}
                </button>
              </div>
            </div>

            {/* 用户列表 */}
            <div className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">加载用户数据...</span>
                </div>
              ) : users.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          姓名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          年龄
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              #{user.id}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {user.age} 岁
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() =>
                                handleDeleteUser(user.id, user.name)
                              }
                              disabled={isDeleting}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                                isDeleting
                                  ? 'bg-red-300 cursor-not-allowed'
                                  : 'bg-red-500 hover:bg-red-600'
                              } text-white text-sm`}
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              {isDeleting ? '删除中...' : '删除'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    暂无用户数据
                  </h3>
                  <p className="text-gray-500 mb-6">
                    点击"添加用户"按钮创建第一条记录
                  </p>
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    添加示例用户
                  </button>
                </div>
              )}
            </div>

            {/* 统计信息 */}
            {users.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    共{' '}
                    <span className="font-semibold text-gray-800">
                      {users.length}
                    </span>{' '}
                    条记录
                  </div>
                  <div className="text-sm text-gray-600">
                    平均年龄:{' '}
                    <span className="font-semibold text-gray-800">
                      {users.length > 0
                        ? Math.round(
                            users.reduce((sum, user) => sum + user.age, 0) /
                              users.length,
                          )
                        : 0}{' '}
                      岁
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">功能说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">SQLite 集成</h4>
              <p className="text-sm text-gray-600">
                使用Rust的rusqlite库实现本地数据库操作
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">Tauri 通信</h4>
              <p className="text-sm text-gray-600">
                通过Tauri命令实现前端与Rust后端的双向通信
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-700 mb-2">实时操作</h4>
              <p className="text-sm text-gray-600">
                支持添加、查询、删除用户，操作后自动刷新数据
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillGround;
