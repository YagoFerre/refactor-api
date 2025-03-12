export interface JavaFile {
  path: string;
  name: string;
  size: number;
  packageInfo: string | null;
  imports: string[];
}
