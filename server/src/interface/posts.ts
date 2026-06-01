import { Account } from "../tables/accounts.js"

export interface post {
    id:string
    title:string
    content:string
    tag:string
    images:string[]
    authorId:string
    author:Account
    createdAt:Date
    updatedAt:Date
}