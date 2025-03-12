import { Dependency } from './dependecy';
import { JavaFile } from './java-file';

export interface ProjectStructure {
  javaFiles: JavaFile[];
  dependencies: Dependency[];
}
