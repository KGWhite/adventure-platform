import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { StaffOnly } from '../auth/decorators/staff-only.decorator.js';
import { StageService } from './stage.service.js';
import { ClearStationDto, SetStageDto } from './stage.types.js';

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

  @Post('clear')
  @StaffOnly()
  @HttpCode(204)
  clearStation(@Body() dto: ClearStationDto) {
    this.stageService.clearStation(dto.nodeId);
  }
}
