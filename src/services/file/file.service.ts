import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import * as fs from 'fs-extra';
import StreamZip from 'node-stream-zip';

@Injectable()
export class FileService {
  constructor(private httpService: HttpService) {}

  async downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'arraybuffer' }),
    );

    // escreve o arquivo zip da estrutura spring
    await fs.writeFile(outputPath, response.data);
  }

  async extractZip(zipPath: string, outputPath: string): Promise<void> {
    await fs.ensureDir(outputPath);

    return new Promise((resolve, reject) => {
      const zip = new StreamZip({
        file: zipPath,
        storeEntries: true,
      });

      zip.on('error', reject);

      zip.on('extract', () => {
        zip.close();
        resolve();
      });

      zip.extract(null, outputPath, () => {});
    });
  }
}
