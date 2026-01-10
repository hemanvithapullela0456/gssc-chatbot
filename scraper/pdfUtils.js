import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import { createRequire } from 'module';
import Tesseract from 'tesseract.js';

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const exec = promisify(_exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function extractPdfText(buffer, sourceId = "") {
  let text = "";
  let pages = 0;
  try {
    const parsed = await pdfParse(buffer);
    text = parsed.text || "";
    pages = parsed.numpages || 0;
  } catch (error) {
    console.error(`[pdf-utils] pdf-parse failed for ${sourceId}: ${error.message}`);
  }

  const needsOCR = !text || text.trim().length < 40;
  return { text, pages, needsOCR };
}

export async function ocrPdfBuffer(buffer, sourceId = "") {
  const tmpBase = path.join(
    __dirname,
    `tmp_ocr_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
  const pdfPath = `${tmpBase}.pdf`;

  const localPoppler = path.join(__dirname, "bin", "pdftoppm.exe");
  let popplerCmd = "pdftoppm";
  
  try {
      await fs.access(localPoppler);
      popplerCmd = `"${localPoppler}"`;
  } catch (e) {
      // Local binary not found, rely on global PATH
  }

  try {
    await fs.writeFile(pdfPath, buffer);
    // Convert all pages to png
    try {
      await exec(`${popplerCmd} -png "${pdfPath}" "${tmpBase}"`);
    } catch (e) {
      if (e.message.includes("not recognized") || e.code === 127 || e.code === 'ENOENT') {
        console.warn(`[pdf-utils] OCR Skipped: 'pdftoppm' (Poppler) not found in PATH.`);
        return "";
      }
      throw e;
    }

    // Find all generated page images
    const dirFiles = await fs.readdir(__dirname);
    const baseName = path.basename(tmpBase);
    
    // Pattern matches: prefix-1.png, prefix-2.png, etc.
    const pageImages = dirFiles
      .filter((f) => f.startsWith(baseName) && f.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/-(\d+)\.png$/)?.[1] || "0", 10);
        const numB = parseInt(b.match(/-(\d+)\.png$/)?.[1] || "0", 10);
        return numA - numB;
      });

    if (pageImages.length === 0) {
       console.warn(`[pdf-utils] OCR: No images generated for ${sourceId}`);
       return "";
    }

    let fullText = "";

    for (const imgFile of pageImages) {
      const imgPath = path.join(__dirname, imgFile);
      // Run OCR using Tesseract.js (Node library)
      try {
        // Tesseract.js recognize returns a promise that resolves to a result object
        const { data: { text } } = await Tesseract.recognize(imgPath, 'eng', { 
           // logger: m => console.log(m) 
        });
        
        // Append result directly
        fullText += text + "\n\n";

      } catch (e) {
         console.warn(`[pdf-utils] Tesseract.js error for ${imgFile}: ${e.message}`);
         continue;
      }
      
      // We don't need to read a .txt file anymore since Tesseract.js gives us the text in memory
    }

    return fullText.trim();

  } catch (error) {
    console.error(`[pdf-utils] Local OCR failed for ${sourceId}: ${error.message}`);
    return "";
  } finally {
    // Cleanup
    try {
      const tmpPrefix = path.basename(tmpBase);
      const entries = await fs.readdir(__dirname);
      for (const entry of entries) {
        if (entry.startsWith(tmpPrefix)) {
          const fullPath = path.join(__dirname, entry);
          try {
            await fs.unlink(fullPath);
          } catch {
            // best effort
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

export async function processPdfBuffer(buffer, sourceId = "") {
  const { text: rawText, pages, needsOCR } = await extractPdfText(buffer, sourceId);
  
  if (!needsOCR) {
    return { text: rawText, pages, method: 'text-extraction' };
  }

  // console.log(`[pdf-utils] Running OCR for ${sourceId} (embedded text insufficient)...`);
  const ocrText = await ocrPdfBuffer(buffer, sourceId);
  
  // Use OCR text if it provided something, otherwise fall back to raw (even if empty)
  const finalText = ocrText && ocrText.length > rawText.length ? ocrText : rawText;
  
  return { 
    text: finalText, 
    pages, 
    method: 'ocr' 
  };
}
