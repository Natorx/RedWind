// posts.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './accounts.js'; // 假设已存在 Account 实体

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tag: string;

  @Column('jsonb', { nullable: true })
  images: string[];

  // 外键字段
  @Column({ type: 'uuid' })
  authorId: string;

  // 关系（多个帖子属于一个用户）
  @ManyToOne(() => Account, { eager: false }) // 不自动加载，靠 relations 控制
  @JoinColumn({ name: 'authorId' })
  author: Account;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
