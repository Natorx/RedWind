import { Controller, Post, Body, Get, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppService } from './app.service';

export class PrintDto {
  text: string;
  ip?: string;
  port?: number;
}

export class TestConnectionDto {
  ip?: string;
  port?: number;
}

@Controller('app')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly printerService: AppService) {}

  @Post('print')
  async print(@Body() printDto: PrintDto) {
    this.logger.log(`收到打印请求: ${printDto.text?.substring(0, 50)}...`);
    
    if (!printDto.text || printDto.text.trim() === '') {
      throw new HttpException(
        {
          success: false,
          message: '请输入要打印的文本内容',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.printerService.printGB18030({
      text: printDto.text,
      ip: printDto.ip,
      port: printDto.port,
    });

    if (!result.success) {
      throw new HttpException(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }

  @Get('test')
  async testConnection(@Query() query: TestConnectionDto) {
    const ip = query.ip || '192.168.101.8';
    const port = query.port || 9100;
    
    this.logger.log(`测试打印机连接: ${ip}:${port}`);
    
    const isConnected = await this.printerService.testConnection(ip, port);
    
    return {
      success: isConnected,
      message: isConnected ? '打印机连接正常' : '无法连接到打印机',
      ip,
      port,
    };
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'printer-service',
      timestamp: new Date().toISOString(),
    };
  }
}