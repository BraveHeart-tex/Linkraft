import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigInput } from 'src/config/config.validation.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<ConfigInput>) {}

  getOrThrow<K extends keyof ConfigInput>(key: K): ConfigInput[K] {
    return this.configService.getOrThrow(key);
  }

  // Overload 1: No defaultValue → result can be undefined
  get<K extends keyof ConfigInput>(key: K): ConfigInput[K] | undefined;

  // Overload 2: With defaultValue → result is guaranteed to be defined
  get<K extends keyof ConfigInput>(
    key: K,
    defaultValue: NonNullable<ConfigInput[K]>
  ): NonNullable<ConfigInput[K]>;

  // Implementation
  get<K extends keyof ConfigInput>(
    key: K,
    defaultValue?: ConfigInput[K]
  ): ConfigInput[K] | undefined {
    const value = this.configService.get<ConfigInput[K]>(key);
    return value !== undefined ? value : defaultValue;
  }
}
