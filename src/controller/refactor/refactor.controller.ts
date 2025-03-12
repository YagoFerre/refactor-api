import { Body, Controller, Post } from '@nestjs/common';
import { RequestDto } from 'src/dtos/request.dto';
import { MigrationService } from 'src/services/migration/migration.service';
import { MigrationResult } from 'src/types/migration-result';

@Controller('refactor')
export class RefactorController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post()
  async refactorProject(
    @Body() migrationRequest: RequestDto,
  ): Promise<MigrationResult> {
    return await this.migrationService.refactorProject(migrationRequest);
  }
}
