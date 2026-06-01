import { request } from "./requests"

export const taskApi = {
    // 获取所有任务
    get:() => {
        return request.get('/task/tasks')
    }
}