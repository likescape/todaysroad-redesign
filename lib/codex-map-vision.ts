import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ImageRouteError, parseSegmentation, SEGMENTATION_SCHEMA } from "./map-segmentation";
import { MAP_VISION_PROMPT } from "./map-vision";

const run = promisify(execFile);
const binary = () => process.env.CODEX_BIN || "codex";
export const CODEX_TIMEOUT_MS = 300_000;

/** Uses the CLI's saved login; never reads, copies or repurposes auth tokens. */
export async function codexAvailable(): Promise<boolean> {
  try {
    await run(binary(), ["login", "status"], { timeout: 5000, maxBuffer: 16_000 });
    return true;
  } catch { return false; }
}

export async function analyzeMapWithCodex(image: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const directory = await mkdtemp(join(tmpdir(), "todaysroad-map-"));
  let completed = false;
  try {
    const imagePath = join(directory, "map.png"), schemaPath = join(directory, "schema.json"), outputPath = join(directory, "result.json");
    await Promise.all([
      writeFile(imagePath, Buffer.from(image.slice(image.indexOf(",") + 1), "base64"), { mode: 0o600 }),
      writeFile(schemaPath, JSON.stringify(SEGMENTATION_SCHEMA), { mode: 0o600 }),
    ]);
    signal.throwIfAborted();
    const args = [
      "exec", "--ignore-user-config", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only",
      "--cd", directory, "--color", "never", "-c", "features.shell_tool=false", "-c", 'web_search="disabled"',
      "--image", imagePath, "--output-schema", schemaPath, "--output-last-message", outputPath,
    ];
    if (process.env.CODEX_MAP_VISION_MODEL) args.push("--model", process.env.CODEX_MAP_VISION_MODEL);
    args.push(`${MAP_VISION_PROMPT}\nAnalyze the attached image now. Do not call tools, inspect files, search, or modify anything. Return only the final segmentation JSON.`);
    // execFile passes literal arguments, with no shell interpolation. SIGKILL bounds cancellation.
    const child = run(binary(), args, { signal, timeout: CODEX_TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 2_000_000 });
    child.child.stdin?.end();
    await child;
    completed = true;
    signal.throwIfAborted();
    if ((await stat(outputPath)).size > 2_000_000) throw new ImageRouteError("INVALID_SEGMENTATION", "지도 분석 결과가 너무 커요. 다시 시도해주세요.");
    return parseSegmentation(JSON.parse(await readFile(outputPath, "utf8")));
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof ImageRouteError) throw error;
    const failure = error as NodeJS.ErrnoException & { killed?: boolean };
    if (failure.killed) throw new DOMException("Map analysis timed out", "TimeoutError");
    if (failure.code === "ENOENT" && !completed) throw new ImageRouteError("CODEX_NOT_FOUND", "로컬 Codex CLI를 찾지 못했어요. 설치 경로를 확인해주세요.");
    if (error instanceof SyntaxError || completed) throw new ImageRouteError("INVALID_SEGMENTATION", "지도 분석 결과가 불완전해요. 다시 시도해주세요.");
    throw new ImageRouteError("CODEX_FAILED", "로컬 Codex 분석을 완료하지 못했어요. Codex 로그인·사용량·네트워크 상태를 확인한 뒤 다시 시도해주세요.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
