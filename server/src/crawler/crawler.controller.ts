import { Controller, Get } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { VideoInfo } from 'interface/crawler.interface';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get('bili')
  async getBiliData(): Promise<VideoInfo[]> {
    return await this.crawlerService.getBiliVideos();
  }
}
