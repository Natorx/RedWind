import { Account } from "../tables/accounts.js"

export interface task {
    id:string
    title:string
    content:string
    price:number
    type:string
    progress:'未开始' | '进行中' | '已完成'
    account_id:string
    account:Account
    createdAt:Date
    updatedAt:Date
}