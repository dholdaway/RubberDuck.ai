import fs from "fs/promises";
import path from "path";

export interface StorageProvider {
  save(fileName: string, data: Buffer): Promise<string>;
  getUrl(filePath: string): string;
  delete(filePath: string): Promise<void>;
  read(filePath: string): Promise<Buffer>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
  }

  async save(fileName: string, data: Buffer): Promise<string> {
    await fs.mkdir(this.basePath, { recursive: true });
    const filePath = path.join(this.basePath, fileName);
    await fs.writeFile(filePath, data);
    return filePath;
  }

  getUrl(filePath: string): string {
    return `/api/audio-notes/file/${encodeURIComponent(path.basename(filePath))}`;
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }

  async read(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}

// Factory — swap implementation here when moving to S3
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "local":
      return new LocalStorageProvider();
    // case "s3":
    //   return new S3StorageProvider();
    default:
      return new LocalStorageProvider();
  }
}

export const storage = createStorageProvider();
