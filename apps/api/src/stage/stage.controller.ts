import { Body, Controller, Get, Put } from '@nestjs/common';
import { StaffOnly } from '../auth/decorators/staff-only.decorator.js';
import { StageService } from './stage.service.js';
import { SetStageDto } from './stage.types.js';

@Controller('stage')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Get()
  getStage() {
    return this.stageService.getStage();
  }

  @Put()
  @StaffOnly()
  setStage(@Body() dto: SetStageDto) {
    return this.stageService.setStage(dto.nodeId);
  }
}
