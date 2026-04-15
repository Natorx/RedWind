import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as iconv from 'iconv-lite';

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
export class PrinterService {
      private readonly logger = new Logger(PrinterService.name);
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
}
