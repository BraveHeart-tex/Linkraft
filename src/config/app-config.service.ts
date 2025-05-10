import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigSchema } from 'src/config/config.validation.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<ConfigSchema>) {}

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.configService.getOrThrow(key);
  }
}
