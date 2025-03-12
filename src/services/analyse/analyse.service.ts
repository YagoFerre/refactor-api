import { Injectable } from '@nestjs/common';

import { Dependency } from 'src/types/dependecy';
import { JavaFile } from 'src/types/java-file';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { ProjectStructure } from 'src/types/project-structure';

@Injectable()
export class AnalyseService {
  async analyzeJavaProject(projectPath: string): Promise<ProjectStructure> {
    const javaFiles: JavaFile[] = await this.findJavaFiles(projectPath);
    const dependencies: Dependency[] =
      await this.extractMavenDependency(projectPath);

    return {
      javaFiles,
      dependencies,
    };
  }

  private async findJavaFiles(dir: string): Promise<JavaFile[]> {
    const files: JavaFile[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true }); // retorna um array da classe Dirent nodejs com methods

    // percorrer cada arquivo
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name); // caminho completo do arquivo

      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'target' &&
        entry.name !== 'build'
      ) {
        await this.findJavaFiles(fullPath);
      }

      if (entry.isFile() && entry.name.endsWith('.java')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const fileStats = await fs.stat(fullPath);

        files.push({
          path: fullPath,
          name: entry.name,
          size: fileStats.size,
          packageInfo: this.extractPackage(content),
          imports: this.extractImports(content),
        });
      }
    }

    return files;
  }

  // vai extrair o package do arquivo .java
  private extractPackage(content: string): string | null {
    const packageMatch = content.match(/package\s+([\w.]+);/);
    return packageMatch ? packageMatch[1] : null;
  }

  private extractImports(content: string): string[] {
    const importMatches = [...content.matchAll(/import\s+([\w.]+);/g)];
    return importMatches.map((match) => match[1]);
  }

  private async extractMavenDependency(
    pomXmlPath: string,
  ): Promise<Dependency[]> {
    try {
      const content = await fs.readFile(pomXmlPath, 'utf-8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(content);

      const dependencies: Dependency[] = [];

      for (const dep of result.project.dependencies[0].dependency) {
        dependencies.push({
          groupId: dep.groupId[0],
          artifactId: dep.artifactId[0],
          version: dep.version ? dep.version[0] : null,
          scope: dep.scope ? dep.scope[0] : 'compile',
        });
      }

      return dependencies;
    } catch (error) {
      console.error('Erro ao extrair dependências Maven:', error);
      return [];
    }
  }
}
