import { Injectable } from '@nestjs/common';

import { RequestDto } from 'src/dtos/request.dto';

import { Dependency } from 'src/types/dependecy';
import { ProjectStructure } from 'src/types/project-structure';
import { AnalyseService } from '../analyse/analyse.service';

import { FileService } from '../file/file.service';
import { OpenaiService } from '../openai/openai.service';

import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  FileMigrationResult,
  MigrationResult,
} from 'src/types/migration-result';

@Injectable()
export class MigrationService {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly fileService: FileService,
    private readonly analyseService: AnalyseService,
  ) {}

  async refactorProject(
    migrationRequest: RequestDto,
  ): Promise<MigrationResult> {
    // temporário
    const tempDir: string = await fs.mkdtemp(
      path.join(os.tmpdir(), 'java-migration-'),
    );

    try {
      // baixa a estrutura do spring boot
      const springBootProjectPath = await this.fetchSpringBootTemplate(
        migrationRequest,
        tempDir,
      );

      // analisa projeto e retorna
      const projectStructure = await this.analyseService.analyzeJavaProject(
        migrationRequest.projectPath,
      );

      const migrationResults = await this.refactorSourceFiles(
        projectStructure,
        migrationRequest,
        springBootProjectPath,
      );

      // copiar o projeto refatorado para um local de saída
      const outputDir = path.join(
        process.cwd(),
        'projetos-refatorados',
        migrationRequest.projectName,
      );
      await fs.ensureDir(outputDir);
      await fs.copy(springBootProjectPath, outputDir);

      return {
        success: true,
        outputPath: outputDir,
        migratedFiles: migrationResults.files.length,
      };
    } catch (error) {
      console.error('Erro no processo de migração:', error);
      throw error;
    } finally {
      await fs.remove(tempDir);
    }
  }

  private async fetchSpringBootTemplate(
    migrationRequest: RequestDto,
    tempDir: string,
  ): Promise<string> {
    const springInitUrl = `https://start.spring.io/starter.zip?type=maven-project&language=java&bootVersion=3.2.0&baseDir=${migrationRequest.projectName}&groupId=${migrationRequest.groupId}&artifactId=${migrationRequest.projectName}&name=${migrationRequest.projectName}&description=${encodeURIComponent(migrationRequest.description)}&packageName=${migrationRequest.packageName}&packaging=jar&javaVersion=${migrationRequest.javaVersion}&dependencies=${migrationRequest.dependencies}`;

    // baixa a estrutura do spring
    const zipFilePath = path.join(tempDir, 'spring-boot-template.zip');
    await this.fileService.downloadFile(springInitUrl, zipFilePath);

    // extrai a estrutura do spring
    const extractPath = path.join(tempDir, 'spring-boot-project');
    await this.fileService.extractZip(zipFilePath, extractPath);

    return path.join(extractPath, migrationRequest.projectName);
  }

  private async refactorSourceFiles(
    projectStructure: ProjectStructure,
    migrationRequest: RequestDto,
    springBootProjectPath: string,
  ): Promise<FileMigrationResult> {
    const migratedFiles: string[] = [];
    const newDependencies: Dependency[] = [];

    const dependencyTracker: Set<string> = new Set();

    // array [{}: JavaFiles]
    for (const file of projectStructure.javaFiles) {
      const sourceCode = await fs.readFile(file.path, 'utf-8');
      const relativePath = path.relative(
        migrationRequest.projectPath,
        file.path,
      );

      // IA para refatorar o código java
      const result = await this.openaiService.refactorJavaCode(
        sourceCode,
        relativePath,
        migrationRequest.javaVersion,
        projectStructure.dependencies,
      );

      const targetPath = this.getTargetPath(
        springBootProjectPath,
        migrationRequest,
        relativePath,
      );

      // cria o caminho caso não exista
      await fs.ensureDir(path.dirname(targetPath));
      migratedFiles.push(targetPath);

      // adiciona o novo arquivo migrado
      await fs.writeFile(targetPath, result.code);

      // array [{}: Dependency]
      for (const dependency of result.newDependencies) {
        const key = `${dependency.groupId}:${dependency.artifactId}`;

        if (!dependencyTracker.has(key)) {
          dependencyTracker.add(key);
          newDependencies.push(dependency);
        }
      }
    }

    return { files: migratedFiles, dependencies: newDependencies };
  }

  private getTargetPath(
    springBootProjectPath: string,
    request: RequestDto,
    relativePath: string,
  ): string {
    const srcMainJava = path.join(springBootProjectPath, 'src', 'main', 'java');

    if (
      relativePath.includes('src/main/java') ||
      relativePath.includes('src\\main\\main')
    ) {
      // extrair apenas a parte do caminho apos src/main/java
      const parts: string[] = relativePath.split(
        /[\/\\]src[\/\\]main[\/\\]java[\/\\]/,
      );

      if (parts.length > 1) {
        return path.join(srcMainJava, parts[1]);
      }

      const filename = path.basename(relativePath);

      if (filename.endsWith('.java')) {
        const packagePath = request.packageName.replace(/\./g, path.sep);
        return path.join(srcMainJava, packagePath, filename);
      }

      if (
        relativePath.includes('src/main/resources') ||
        relativePath.includes('src\\main\\resources')
      ) {
        // parts = ["", "value"]; 0, 1 index
        const parts: string[] = relativePath.split(
          /[\/\\]src[\/\\]main[\/\\]resources[\/\\]/,
        );

        if (parts.length > 1) {
          return path.join(
            springBootProjectPath,
            'src',
            'main',
            'resources',
            parts[1],
          );
        }
      }
    }

    return path.join(springBootProjectPath, relativePath);
  }

  private async updateDependencies(
    springBootProjectPath: string,
    projectStructure: ProjectStructure,
    detectedDependencies: Dependency[],
  ): Promise<void> {
    const pomPath = path.join(springBootProjectPath, 'pom.xml');
    const pomContent = await fs.readFile(pomPath, 'utf-8');

    const allDependencies: Dependency[] = [
      ...projectStructure.dependencies,
      ...detectedDependencies,
    ];

    // OpenAI para atualizar as dependências
    const updatedPomContent = await this.openaiService.updatePomDependencies(
      pomContent,
      allDependencies,
    );

    await fs.writeFile(pomPath, updatedPomContent);

    // readme de dependências para revisão
    const dependenciesReportPath = path.join(
      springBootProjectPath,
      'dependencies-report.md',
    );
    let reportContent = '# Relatório de Dependências\n\n';

    reportContent += '## Dependências Originais\n\n';
    for (const dep of projectStructure.dependencies) {
      reportContent += `- **${dep.groupId}:${dep.artifactId}${dep.version ? ':' + dep.version : ''}**\n`;
      if (dep.scope) {
        reportContent += `  - Escopo: ${dep.scope}\n`;
      }
    }

    reportContent += '\n## Novas Dependências Detectadas\n\n';
    for (const dep of detectedDependencies) {
      reportContent += `- **${dep.groupId}:${dep.artifactId}:${dep.version || 'latest'}**\n`;
      if (dep.description) {
        reportContent += `  - ${dep.description}\n`;
      }
    }

    await fs.writeFile(dependenciesReportPath, reportContent);
  }
}
