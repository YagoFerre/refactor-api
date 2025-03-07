import { Module } from '@nestjs/common';
import { RefactorController } from './controller/refactor/refactor.controller';
import { MigrationService } from './services/migration/migration.service';
import { FileService } from './services/file/file.service';
import { AnalyseService } from './services/analyse/analyse.service';
import { OpenaiService } from './services/openai/openai.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [RefactorController],
  providers: [MigrationService, FileService, AnalyseService, OpenaiService],
})
export class AppModule {}
