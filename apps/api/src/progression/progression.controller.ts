import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ProgressionService } from './progression.service.js';
import { StatusScanDto } from './progression.types.js';

@Controller('status')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('levels')
  levels() {
    return this.progressionService.levelGuide();
  }

  @Post('scan')
  @HttpCode(200)
  async scan(@Body() dto: StatusScanDto) {
    return this.progressionService.scanStatus(dto);
  }
}
