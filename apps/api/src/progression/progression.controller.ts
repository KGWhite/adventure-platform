import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ProgressionService } from './progression.service.js';
import { StatusScanDto } from './progression.types.js';

@Controller('status')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Post('scan')
  @HttpCode(200)
  async scan(@Body() dto: StatusScanDto) {
    return this.progressionService.scanStatus(dto);
  }
}
