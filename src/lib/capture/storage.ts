/**
 * Object storage abstraction for captured screenshots/HTML snapshots and
 * generated preview assets. Defaults to local disk for development;
 * `STORAGE_DRIVER=s3` switches to an S3-compatible bucket without any
 * caller changing code — every agent module only depends on this interface.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface StorageDriver {
  /** Persist a buffer/string under `key` (e.g. "leads/<id>/homepage.png") and return a locator usable by `read`. */
  put(key: string, data: Buffer | string, contentType: string): Promise<string>;
  read(key: string): Promise<Buffer>;
  /** URL/path usable to display the asset (local: filesystem path; s3: signed or public URL). */
  locate(key: string): string;
}

class LocalStorageDriver implements StorageDriver {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private resolve(key: string): string {
    return join(this.baseDir, key);
  }

  async put(key: string, data: Buffer | string): Promise<string> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return key;
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  locate(key: string): string {
    return `/storage-files/${key}`;
  }
}

class S3StorageDriver implements StorageDriver {
  // Kept intentionally minimal: wire in @aws-sdk/client-s3 when a bucket is
  // actually provisioned. Left as an explicit stub rather than a partial
  // implementation so misconfiguration fails loudly instead of silently
  // writing nothing.
  async put(): Promise<string> {
    throw new Error(
      "STORAGE_DRIVER=s3 is selected but the S3 driver isn't implemented yet. " +
        "Add @aws-sdk/client-s3 and implement put/read/locate in src/lib/capture/storage.ts, " +
        "or set STORAGE_DRIVER=local for development.",
    );
  }
  async read(): Promise<Buffer> {
    throw new Error("S3 storage driver not implemented.");
  }
  locate(): string {
    throw new Error("S3 storage driver not implemented.");
  }
}

let driver: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (!driver) {
    const kind = process.env.STORAGE_DRIVER ?? "local";
    if (kind === "s3") {
      driver = new S3StorageDriver();
    } else {
      driver = new LocalStorageDriver(process.env.STORAGE_LOCAL_DIR ?? "./storage");
    }
  }
  return driver;
}
