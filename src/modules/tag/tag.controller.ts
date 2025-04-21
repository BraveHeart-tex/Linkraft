import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('tags')
@UseGuards(AuthGuard)
export class TagController {}
