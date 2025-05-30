import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigSchema } from 'src/config/config.validation.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<ConfigSchema>) {}

  getOrThrow<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.configService.getOrThrow(key);
  }

  // Overload 1: No defaultValue → result can be undefined
  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] | undefined;

  // Overload 2: With defaultValue → result is guaranteed to be defined
  get<K extends keyof ConfigSchema>(
    key: K,
    defaultValue: NonNullable<ConfigSchema[K]>
  ): NonNullable<ConfigSchema[K]>;

  // Implementation
  get<K extends keyof ConfigSchema>(
    key: K,
    defaultValue?: ConfigSchema[K]
  ): ConfigSchema[K] | undefined {
    const value = this.configService.get<ConfigSchema[K]>(key);
    return value !== undefined ? value : defaultValue;
  }
}
