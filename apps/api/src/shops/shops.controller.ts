import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ShopsService } from './shops.service.js';
import { PurchaseDto, ShopScanDto } from './shops.types.js';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get(':shopId')
  async getShop(@Param('shopId') shopId: string) {
    return this.shopsService.getShop(shopId);
  }

  @Post(':shopId/scan')
  @HttpCode(200)
  async scan(@Param('shopId') shopId: string, @Body() dto: ShopScanDto) {
    return this.shopsService.scan(shopId, dto);
  }

  @Post(':shopId/purchases')
  async purchase(@Param('shopId') shopId: string, @Body() dto: PurchaseDto) {
    return this.shopsService.purchase(shopId, dto);
  }
}
