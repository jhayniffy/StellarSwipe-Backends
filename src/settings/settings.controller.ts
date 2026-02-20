import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':userId')
  async getSettings(@Param('userId') userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Put(':userId')
  async updateSettings(
    @Param('userId') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(userId, updateSettingsDto);
  }

  @Put(':userId/reset')
  async resetSettings(@Param('userId') userId: string) {
    return this.settingsService.resetSettings(userId);
  }

  @Delete(':userId')
  async deleteSettings(@Param('userId') userId: string) {
    await this.settingsService.deleteSettings(userId);
    return { message: 'Settings deleted successfully' };
  }

  @Get('defaults/all')
  async getDefaults() {
    return this.settingsService.getDefaultSettings();
  }
}
