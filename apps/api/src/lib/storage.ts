import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export interface StoredFile {
  /** Provider-specific path persisted in driver_documents.storage_path */
  path: string;
}

export interface StorageProvider {
  save(folder: string, originalName: string, mimeType: string, data: Buffer): Promise<StoredFile>;
  read(path: string): Promise<Buffer>;
}

const BUCKET = "driver-documents";

class SupabaseStorage implements StorageProvider {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async save(folder: string, originalName: string, mimeType: string, data: Buffer) {
    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
    const path = `${folder}/${randomUUID()}${ext}`;
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, data, { contentType: mimeType });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return { path };
  }

  async read(path: string) {
    const { data, error } = await this.client.storage.from(BUCKET).download(path);
    if (error || !data) throw new Error(`Supabase download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
}

/** Local-disk fallback for development; files land under UPLOAD_DIR. */
class LocalStorage implements StorageProvider {
  constructor(private baseDir: string) {}

  private resolve(path: string): string {
    const full = normalize(join(this.baseDir, path));
    if (!full.startsWith(normalize(this.baseDir))) throw new Error("Invalid storage path");
    return full;
  }

  async save(folder: string, originalName: string, mimeType: string, data: Buffer) {
    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
    const path = `${folder}/${randomUUID()}${ext}`;
    const full = this.resolve(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return { path };
  }

  async read(path: string) {
    return readFile(this.resolve(path));
  }
}

export function createStorage(): StorageProvider {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return new LocalStorage(env.UPLOAD_DIR);
}
