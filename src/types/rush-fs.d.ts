// Type declarations for @rush-fs/core
// API-aligned with Node.js fs/promises

declare module "@rush-fs/core" {
  import { Stats, Dirent } from "node:fs";

  export interface FileHandle {
    fd: number;
  }

  export interface ReadDirOptions {
    recursive?: boolean;
    withFileTypes?: boolean;
  }

  export interface MkDirOptions {
    recursive?: boolean;
    mode?: number | string;
  }

  export interface RmOptions {
    recursive?: boolean;
    force?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  }

  export interface StatOptions {
    bigint?: boolean;
  }

  export interface ReadFileOptions {
    encoding?: BufferEncoding | null;
    flag?: string;
  }

  export interface WriteFileOptions {
    encoding?: BufferEncoding | null;
    mode?: number | string;
    flag?: string;
  }

  export interface AccessOptions {
    mode?: number;
  }

  export interface CopyFileOptions {
    mode?: number;
  }

  // Re-export Node.js types for compatibility
  export { Stats, Dirent };

  // Core APIs
  export function readdir(
    path: string,
    options?: ReadDirOptions | BufferEncoding | null,
  ): Promise<string[] | Dirent[]>;

  export function mkdir(
    path: string,
    options?: MkDirOptions | string | null,
  ): Promise<string | undefined>;

  export function readFile(
    path: string | FileHandle,
    options?: ReadFileOptions | BufferEncoding | null,
  ): Promise<string | Buffer>;

  export function writeFile(
    path: string | FileHandle,
    data:
      | string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | Stream,
    options?: WriteFileOptions | BufferEncoding | null,
  ): Promise<void>;

  export function unlink(path: string): Promise<void>;

  export function stat(path: string, options?: StatOptions): Promise<Stats>;

  export function rm(path: string, options?: RmOptions): Promise<void>;

  export function copyFile(
    src: string,
    dest: string,
    mode?: number,
  ): Promise<void>;

  export function access(path: string, mode?: number): Promise<void>;

  export function rename(oldPath: string, newPath: string): Promise<void>;

  export function chmod(path: string, mode: number): Promise<void>;

  export function chown(path: string, uid: number, gid: number): Promise<void>;

  export function lstat(path: string, options?: StatOptions): Promise<Stats>;

  export function readlink(path: string): Promise<string>;

  export function symlink(target: string, path: string): Promise<void>;

  export function appendFile(
    path: string | FileHandle,
    data: string | Uint8Array,
    options?: WriteFileOptions | BufferEncoding | null,
  ): Promise<void>;

  export function truncate(path: string, len?: number): Promise<void>;

  export function open(
    path: string,
    flags?: string,
    mode?: number,
  ): Promise<FileHandle>;
}
