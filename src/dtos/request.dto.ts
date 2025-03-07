import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestDto {
  @IsString()
  @IsNotEmpty()
  projectPath: string;

  @IsString()
  @IsNotEmpty()
  projectName: string;

  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsOptional()
  description: string = '';

  @IsString()
  @IsNotEmpty()
  packageName: string;

  @IsString()
  @IsNotEmpty()
  javaVersion: string = '21';

  @IsString()
  @IsNotEmpty()
  dependencies: string = 'web,data-jpa,lombok,actuator';
}
