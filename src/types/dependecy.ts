export interface Dependency {
  groupId: string;
  artifactId: string;
  version: string | null;
  scope?: string;
  description?: string;
}
