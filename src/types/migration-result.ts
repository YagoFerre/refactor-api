import { Dependency } from './dependecy';

export interface MigrationResult {
  success: boolean;
  outputPath: string;
  migratedFiles: number;
}

export interface CodeMigrationResult {
  code: string;
  newDependencies: Dependency[];
}

export interface FileMigrationResult {
  files: string[];
  dependencies: Dependency[];
}
