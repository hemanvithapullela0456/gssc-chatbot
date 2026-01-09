import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { LocalPdfProcessor } from "../scraper/localPdfProcessor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SCRAPED_DATA_DIR = path.join(ROOT_DIR, "scraped_data");

async function resolveTargetFile(cliPath) {
  if (cliPath) {
    const absolute = path.isAbsolute(cliPath)
      ? cliPath
      : path.resolve(ROOT_DIR, cliPath);
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) {
      throw new Error(`Provided path is not a file: ${absolute}`);
    }
    return absolute;
  }

  await fs.mkdir(SCRAPED_DATA_DIR, { recursive: true });
  const entries = await fs.readdir(SCRAPED_DATA_DIR);
  const jsonFiles = entries
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .sort();

  if (!jsonFiles.length) {
    // Return null or throw if no existing file to act upon
    // But strictly speaking, the user just wants to process PDFs.
    // If no JSON exists, we can create a dummy one.
    console.log("[script] No existing JSON snapshot found. Creating a new one in memory.");
    return null;
  }

  return path.join(SCRAPED_DATA_DIR, jsonFiles[jsonFiles.length - 1]);
}

async function main() {
  console.log("[script] Starting Local PDF Processor Tool...");

  // 1. Identify which JSON file to update (latest one)
  let targetFile = null;
  try {
    targetFile = await resolveTargetFile(process.argv[2]);
    console.log(`[script] Targeted JSON file: ${targetFile || "None (creating new)"}`);
  } catch (e) {
    console.warn(`[script] Warning: Could not resolve target file: ${e.message}`);
  }
  
  let scrapedData;
  if (targetFile) {
    try {
      console.log(`[script] Loading existing snapshot...`);
      const raw = await fs.readFile(targetFile, "utf8");
      scrapedData = JSON.parse(raw);
    } catch (e) {
      console.error(`[script] Failed to read/parse target file: ${e.message}`);
      // Fallback
      scrapedData = { documents: { pdfs: [] } };
    }
  } else {
    scrapedData = {
      metadata: { timestamp: new Date().toISOString(), source: "Local script" },
      documents: { pdfs: [] },
      statistics: {}
    };
  }

  // 2. Initialize the processor
  const processor = new LocalPdfProcessor();

  // 3. Process
  console.log("[script] Running processor...");
  try {
    const updatedData = await processor.processAll(scrapedData);

    // 4. Save
    if (targetFile) {
      console.log(`[script] Saving updates to ${targetFile}`);
      await fs.writeFile(targetFile, JSON.stringify(updatedData, null, 2), "utf8");
    } else {
      const newFile = path.join(SCRAPED_DATA_DIR, `local_pdfs_${Date.now()}.json`);
      console.log(`[script] Saving new snapshot to ${newFile}`);
      await fs.writeFile(newFile, JSON.stringify(updatedData, null, 2), "utf8");
    }

    console.log("[script] Done.");
    
    // 5. Verification Print
    if (updatedData.documents && updatedData.documents.pdfs) {
      const pdfs = updatedData.documents.pdfs.filter(p => p.url && p.url.startsWith("local://"));
      console.log("\n--- PROCESSING REPORT ---");
      for (const p of pdfs) {
        console.log(`File: ${p.title}`);
        console.log(`Full URL: ${p.url}`);
        console.log(`Pages: ${p.pages}`);
        console.log(`Word Count: ${p.wordCount}`);
        console.log(`Text Length: ${p.text ? p.text.length : 0} chars`);
        console.log(`Preview: ${p.text ? p.text.replace(/\s+/g, " ").slice(0, 100) : "EMPTY"}...`);
        console.log("-----------------------");
      }
    }
  } catch (err) {
    console.error("[script] Critical failure during processing:", err);
    console.error(err.stack);
  }
}


main().catch(err => {
  console.error("Failed:", err);
});
