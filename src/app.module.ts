import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RefactorController } from './controller/refactor/refactor.controller';
import { MigrationService } from './services/migration/migration.service';
import { FileService } from './services/file/file.service';
import { AnalyseService } from './services/analyse/analyse.service';
import { OpenaiService } from './services/openai/openai.service';

@Module({
  imports: [],
  controllers: [AppController, RefactorController],
  providers: [AppService, MigrationService, FileService, AnalyseService, OpenaiService],
})
export class AppModule {}
