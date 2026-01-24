import { UserSettingsData } from '../entities/user-settings.entity';

export class SettingsResponseDto {
  userId: string;
  settings: UserSettingsData;
  updatedAt: Date;
}
