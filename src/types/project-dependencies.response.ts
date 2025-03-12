export class ProjectDependenciesResponse {
  groupId: string;
  artifactId: string;
  version: string | null;
  scope?: string;
  description?: string;
}
