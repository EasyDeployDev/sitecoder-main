import { mkdir as fsMkdir } from "node:fs/promises";

/**
 * Create a directory (and parents) if it does not already exist.
 * Equivalent to `mkdir -p`.
 */
export async function mkdir(
  path: string,
  options?: { mode?: number },
): Promise<void> {
  await fsMkdir(path, { recursive: true, mode: options?.mode });
}

export default mkdir;
