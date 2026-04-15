/* 打印模块和爬虫模块暂时放一起 */

import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as iconv from 'iconv-lite';
import axios from 'axios';
import * as cherrio from 'cheerio';
import { VideoInfo } from 'interface/crawler.interface';
import { cleanStatsText } from 'utils/text';

export interface PrintOptions {
  text: string;
  ip?: string;
  port?: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
  preview?: string;
  error?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly DEFAULT_IP = '192.168.101.8';
  private readonly DEFAULT_PORT = 9100;
  private readonly TIMEOUT = 3000;

  async printGB18030(options: PrintOptions): Promise<PrintResult> {
    const { text, ip = this.DEFAULT_IP, port = this.DEFAULT_PORT } = options;

    if (!text || text.trim() === '') {
      return {
        success: false,
        message: '请输入要打印的文本内容',
      };
    }

    // 将文本转为GB18030
    const gbBuffer = iconv.encode(text, 'gb18030');
    const client = new net.Socket();

    return new Promise((resolve) => {
      // 设置超时
      client.setTimeout(this.TIMEOUT, () => {
        client.destroy();
        this.logger.error(`连接打印机超时 ${ip}:${port}`);
        resolve({
          success: false,
          message: '打印失败',
          error: '连接超时',
        });
      });

      client.connect(port, ip, () => {
        this.logger.log(`连接打印机成功 ${ip}:${port}`);

        try {
          // 1. 初始化打印机
          client.write('\x1B\x40');

          // 2. 设置GB18030编码
          client.write('\x1B\x74\x17');

          // 3. 发送中文文本
          client.write(gbBuffer);
          client.write('\n\n\n');

          // 4. 切纸
          client.write('\x1D\x56\x41\x00');

          setTimeout(() => {
            client.end();
            this.logger.log(`打印任务完成: ${text.substring(0, 50)}...`);
            resolve({
              success: true,
              message: `打印成功: ${text.substring(0, 50)}...`,
              preview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            });
          }, 500);
        } catch (error) {
          this.logger.error(`打印错误: ${error.message}`);
          client.destroy();
          resolve({
            success: false,
            message: '打印失败',
            error: error.message,
          });
        }
      });

      client.on('error', (err) => {
        this.logger.error(`连接错误: ${err.message}`);
        resolve({
          success: false,
          message: '打印失败',
          error: `连接失败: ${err.message}`,
        });
      });
    });
  }

  // 测试打印机连接
  async testConnection(
    ip: string = this.DEFAULT_IP,
    port: number = this.DEFAULT_PORT,
  ): Promise<boolean> {
    const client = new net.Socket();

    return new Promise((resolve) => {
      client.setTimeout(2000, () => {
        client.destroy();
        resolve(false);
      });

      client.connect(port, ip, () => {
        client.end();
        resolve(true);
      });

      client.on('error', () => {
        resolve(false);
      });
    });
  }

async getBiliVideos(): Promise<VideoInfo[]> {
  try {
    const response = await axios.get('https://www.bilibili.com', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        Referer: 'https://www.bilibili.com/',
      },
    });

    const $ = cherrio.load(response.data);
    const videos: VideoInfo[] = [];

    // 查找视频卡片容器
    const container = $('.container.is-version8');

    if (container.length === 0) {
      console.log('未找到 .container.is-version8 容器');
      return [];
    }

    console.log(`找到容器，开始提取视频...`);

    // 查找所有视频卡片
    container.find('.bili-video-card__wrap').each((index, element) => {
      const $card = $(element);

      // 1. 获取标题
      const titleElement = $card.find('.bili-video-card__info--tit a');
      const title = titleElement.text().trim();
      const videoLink = titleElement.attr('href');

      // 2. 获取封面图片
      const coverElement = $card.find('.bili-video-card__image--link img');
      let coverUrl = coverElement.attr('src') || coverElement.attr('data-src');

      // 处理封面URL（补全协议）
      if (coverUrl && coverUrl.startsWith('//')) {
        coverUrl = 'https:' + coverUrl;
      }

      // 3. 获取作者
      const authorElement = $card.find('.bili-video-card__info--author');
      const author = authorElement.text().trim();

      // 4. 获取播放量（在 bili-video-card__stats--text 中）
      let views = '';
      const viewsElement = $card.find('.bili-video-card__stats--text');
      if (viewsElement.length > 0) {
        views = viewsElement.text().trim();
      } else {
        // 备选选择器
        const viewsAltElement = $card.find('.bili-video-card__stats__item');
        if (viewsAltElement.length > 0) {
          views = viewsAltElement.first().text().trim();
        }
      }

      // 5. 获取评论数（在 bili-video-card__stats--item 中）
      let comments = '';
      const commentsElements = $card.find('.bili-video-card__stats--item');
      if (commentsElements.length > 0) {
        // 通常播放量是第一个，评论是第二个
        if (commentsElements.length >= 2) {
          comments = $(commentsElements[1]).text().trim();
        } else {
          comments = commentsElements.text().trim();
        }
      } else {
        // 备选选择器
        const commentsAltElement = $card.find('.bili-video-card__stats__item');
        if (commentsAltElement.length >= 2) {
          comments = $(commentsAltElement[1]).text().trim();
        }
      }

      // 清理播放量和评论数据（去除"万"、"·"等符号）
      views = cleanStatsText(views);
      comments = cleanStatsText(comments);

      // 只添加有效数据
      if (title && coverUrl) {
        videos.push({
          title: title,
          coverUrl: coverUrl,
          link: videoLink
            ? videoLink.startsWith('//')
              ? 'https:' + videoLink
              : videoLink
            : '',
          author: author || '未知作者',
          views: views || '0播放',
          comments: comments || '0评论',
        });

        console.log(`\n视频 ${index + 1}:`);
        console.log(`  标题: ${title}`);
        console.log(`  作者: ${author || '未知'}`);
        console.log(`  播放量: ${views || '0'}`);
        console.log(`  评论数: ${comments || '0'}`);
        console.log(`  封面: ${coverUrl}`);
        console.log(`  链接: ${videoLink}`);
      }
    });

    console.log(`\n总共提取到 ${videos.length} 个视频`);
    return videos;
  } catch (error) {
    console.error('爬取失败:', error);
    return [];
  }
}

}
