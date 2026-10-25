import { MedicineModel } from "../../database/models/Medicine.js";
import { MedicineCodeModel } from "../../database/models/MedicineCode.js";
import { BatchModel } from "../../database/models/Batch.js";
import { InventoryTransactionModel } from "../../database/models/InventoryTransaction.js";
import { createAuditLog } from "../../middleware/audit.js";

export interface QuickInwardPayload {
  medicineId: string;
  batchNumber: string;
  manufacturingDate: string | Date;
  expiryDate: string | Date;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  supplierId?: string;
}

export function normalizeDateToDDMMYYYY(dateStr: string | null | undefined): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();
  if (!clean || /^(null|none|n\/a|nil|undefined|not\s*found)$/i.test(clean)) return null;

  const monthNames: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };

  // 1. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddmmyyyyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const d = parseInt(ddmmyyyyMatch[1], 10);
    const m = parseInt(ddmmyyyyMatch[2], 10);
    const y = parseInt(ddmmyyyyMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1990 && y <= 2099) {
      return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`;
    }
  }

  // 2. ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1990 && y <= 2099) {
      return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`;
    }
  }

  // 3. DD MonthName YYYY / YY (e.g. 15 MAR 2025, 15-MAR-25)
  const ddMonthMatch = clean.toUpperCase().match(/^(\d{1,2})[\s\/\-\.]+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s\/\-\.]+(\d{2,4})$/);
  if (ddMonthMatch) {
    const d = parseInt(ddMonthMatch[1], 10);
    const m = monthNames[ddMonthMatch[2]];
    const yStr = ddMonthMatch[3];
    let y = parseInt(yStr, 10);
    if (yStr.length === 2) {
      // Explicit 2-digit year rule: 15-45 maps to 2015-2045
      if (y >= 15 && y <= 45) {
        y = 2000 + y;
      } else {
        return null;
      }
    }
    if (d >= 1 && d <= 31 && y >= 1990 && y <= 2099) {
      return `${d.toString().padStart(2, "0")}/${m}/${y}`;
    }
  }

  // 4. MonthName YYYY / YY (e.g. MAR 2025, MAR 25)
  const monthYearMatch = clean.toUpperCase().match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s\/\-\.]+(\d{2,4})$/);
  if (monthYearMatch) {
    const m = monthNames[monthYearMatch[1]];
    const yStr = monthYearMatch[2];
    let y = parseInt(yStr, 10);
    if (yStr.length === 2) {
      if (y >= 15 && y <= 45) {
        y = 2000 + y;
      } else {
        return null;
      }
    }
    if (y >= 1990 && y <= 2099) {
      return `01/${m}/${y}`;
    }
  }

  // 5. MM/YYYY (e.g. 03/2025)
  const mmYyyyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{4})$/);
  if (mmYyyyMatch) {
    const m = parseInt(mmYyyyMatch[1], 10);
    const y = parseInt(mmYyyyMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 1990 && y <= 2099) {
      return `01/${m.toString().padStart(2, "0")}/${y}`;
    }
  }

  // 6. DD/MM/YY (e.g. 15/03/25)
  const ddmmyyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (ddmmyyMatch) {
    const d = parseInt(ddmmyyMatch[1], 10);
    const m = parseInt(ddmmyyMatch[2], 10);
    const yy = parseInt(ddmmyyMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && yy >= 15 && yy <= 45) {
      return `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${2000 + yy}`;
    }
  }

  // 7. MM/YY (e.g. 03/25)
  const mmYyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{2})$/);
  if (mmYyMatch) {
    const m = parseInt(mmYyMatch[1], 10);
    const yy = parseInt(mmYyMatch[2], 10);
    if (m >= 1 && m <= 12 && yy >= 15 && yy <= 45) {
      return `01/${m.toString().padStart(2, "0")}/${2000 + yy}`;
    }
  }

  return null;
}

export function sanitizeBatchNumber(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let clean = raw.trim();
  if (!clean || /^(null|none|n\/a|nil|undefined|not\s*found)$/i.test(clean)) return null;

  // Strip label prefixes
  clean = clean.replace(/^(?:BATCH(?:\s*NO\.?|\s*NUMBER)?|B\.?\s*NO\.?|LOT(?:\s*NO\.?)?|GHAN\s*SANKHYA|घान\s*संख्या)\s*[:\.\-]*\s*/i, "");
  clean = clean.trim();

  // Reject if it is a price/currency (e.g. ₹ 150, Rs. 200, MRP: 250)
  if (/^(?:₹|RS\.?|MRP)\s*[\d\.]+/i.test(clean)) return null;

  // Reject if it looks like a license prefix
  if (/^(?:LIC|LICENSE|MNB|MB\/)/i.test(clean)) return null;

  // Reject if too short or purely punctuation
  if (clean.length < 2 || !/[A-Za-z0-9]/.test(clean)) return null;

  return clean;
}

export function validateDatePair(mfg: string | null, exp: string | null): { mfgDate: string | null; expDate: string | null } {
  if (!mfg || !exp) return { mfgDate: mfg, expDate: exp };
  const parts1 = mfg.split("/").map(Number);
  const parts2 = exp.split("/").map(Number);
  if (parts1.length === 3 && parts2.length === 3) {
    const dateMfg = new Date(parts1[2], parts1[1] - 1, parts1[0]);
    const dateExp = new Date(parts2[2], parts2[1] - 1, parts2[0]);
    if (dateMfg > dateExp) {
      console.warn(`[ScannerService] Mfg date (${mfg}) is after Exp date (${exp}). Swapping to preserve chronological consistency.`);
      return { mfgDate: exp, expDate: mfg };
    }
  }
  return { mfgDate: mfg, expDate: exp };
}

function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  const firstLine = dateStr.split(/[\r\n]/)[0];
  const clean = firstLine.trim().toUpperCase().replace(/\s*[\.\/-]\s*/g, "/").replace(/\./g, " ");

  const monthNames: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };

  const monthMatch = clean.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[-\s/]*(\d{2,4})/);
  if (monthMatch) {
    const m = monthNames[monthMatch[1]];
    let y = monthMatch[2];
    if (y.length === 2) y = "20" + y;
    return `${y}-${m}-01`;
  }

  const numMatch = clean.match(/(\d{1,2})[\/\-\s]+(\d{2,4})/);
  if (numMatch) {
    const m = numMatch[1].padStart(2, "0");
    let y = numMatch[2];
    if (y.length === 2) y = "20" + y;
    return `${y}-${m}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(firstLine.trim())) return firstLine.trim();

  return null;
}

export function generateRandomBatchNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let alphabets = "";
  for (let i = 0; i < 3; i++) {
    alphabets += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${alphabets}-${digits}`;
}

export function parseMedicineLabelText(text: string) {
  const cleanText = text.trim();
  let batchNumber = "";
  let mfgDate: string | null = null;
  let expDate: string | null = null;
  let mrp: number | null = null;

  // Split into non-empty lines
  const lines = cleanText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 1. Batch Number Extraction
  const batchRegex = /(?:B\.?\s*No\.?|B\.?NO\.?|BATCH(?:\s*NO\.?)?|LOT(?:\s*NO\.?)?|GHAN\s*SANKHYA|घान\s*संख्या)\s*[:\.]*\s*([A-Z0-9\-\/]+)/i;
  const batchMatch = cleanText.match(batchRegex);

  if (batchMatch && batchMatch[1]) {
    batchNumber = batchMatch[1].trim();
  } else {
    // Check line by line
    for (const line of lines) {
      if (/(?:Lic|License|MNB|MB\/)/i.test(line)) continue;
      const lineMatch = line.match(/(?:B\.?\s*No\.?|B\.?NO\.?|BATCH(?:\s*NO\.?)?|LOT(?:\s*NO\.?)?)\s*[:\.]*\s*([A-Z0-9\-\/]+)/i);
      if (lineMatch && lineMatch[1]) {
        batchNumber = lineMatch[1].trim();
        break;
      }
    }
  }

  // Fallback: Standalone token search if no prefix match
  if (!batchNumber) {
    for (const line of lines) {
      if (/(?:Lic|License|MNB|MB\/|MFG|MFR|EXP|MRP|Rs|₹|उत्पादन|अवसान|खुदरा)/i.test(line)) continue;
      const tokens = line.split(/\s+/);
      for (const t of tokens) {
        const cleanT = t.replace(/[^A-Z0-9\-\/]/gi, "");
        if (cleanT.length >= 4 && cleanT.length <= 16 && /^[A-Z0-9\-\/]+$/i.test(cleanT) && /[0-9]/.test(cleanT)) {
          batchNumber = cleanT;
          break;
        }
      }
      if (batchNumber) break;
    }
  }

  // Clean any residual prefixes or punctuation
  batchNumber = batchNumber
    .replace(/^(?:B\.?\s*No\.?|B\.?NO\.?|BATCH:?|LOT:?)\s*/i, "")
    .replace(/^[:\.\s]+/, "")
    .replace(/[:\.\s]+$/, "")
    .trim();

  // Strict: Do not guess, infer, fabricate, or automatically generate missing values
  if (!batchNumber) {
    batchNumber = "";
  }

  // 2. MFG Date Extraction
  const mfgRegex = /(?:MFG|MFR|MFD|MANUFACTURING)(?:\.?\s*DATE|\.?\s*DT\.?)?\s*[:\.]*\s*([0-9A-Z\.\/\-\s]+?)(?:[\r\n]|$)/i;
  const mfgMatch = cleanText.match(mfgRegex);
  if (mfgMatch && mfgMatch[1]) {
    mfgDate = parseDateString(mfgMatch[1]);
  }

  // 3. EXP Date Extraction
  const expRegex = /(?:EXP|EXPDT|EXPIRY)(?:\.?\s*DATE|\.?\s*DT\.?)?\s*[:\.]*\s*([0-9A-Z\.\/\-\s]+?)(?:[\r\n]|$)/i;
  const expMatch = cleanText.match(expRegex);
  if (expMatch && expMatch[1]) {
    expDate = parseDateString(expMatch[1]);
  }

  // 4. MRP Extraction
  const mrpRegex = /(?:M\.?R\.?P\.?|MRP)(?:\s*Rs\.?|\s*₹)?\s*[:\.]*\s*([0-9\s\.\,]+?)(?:[\r\n]|$)/i;
  const mrpMatch = cleanText.match(mrpRegex);
  if (mrpMatch && mrpMatch[1]) {
    const mrpStr = mrpMatch[1].replace(/\s+/g, "").replace(",", ".");
    const parsed = parseFloat(mrpStr);
    if (!isNaN(parsed)) mrp = parsed;
  }

  return {
    rawCode: text,
    batchNumber,
    mfgDate,
    expDate,
    mrp,
  };
}

export class ScannerService {
  async lookupCode(rawCode: string) {
    const raw = rawCode.trim();
    if (!raw) throw new Error("Scanned code cannot be empty");

    const extractedInfo = parseMedicineLabelText(raw);
    const displayCode = extractedInfo.batchNumber || raw.split(/[\r\n]+/)[0].trim();

    let medicineId: any = null;
    let matchedBatchId: any = null;

    // 1. Search MedicineCodeModel with exact raw or extracted batch number
    const codeQuery = [raw, displayCode, extractedInfo.batchNumber].filter(Boolean);
    const codeRecord = await MedicineCodeModel.findOne({ codeValue: { $in: codeQuery } }).lean();
    if (codeRecord) {
      medicineId = codeRecord.medicineId;
    }

    // 2. Search BatchModel directly by batch number
    if (!medicineId) {
      const candidateBatches = [extractedInfo.batchNumber, displayCode, raw].filter(
        (b) => b && b.length >= 2 && !b.includes("\n")
      );

      const cleanedRaw = raw.replace(/^(?:B\.?\s*No\.?|B\.?NO\.?|BATCH:?|LOT:?)\s*/i, "").trim();
      if (cleanedRaw && !candidateBatches.includes(cleanedRaw) && !cleanedRaw.includes("\n")) {
        candidateBatches.push(cleanedRaw);
      }

      // Try exact candidate matches first
      let batchRecord = await BatchModel.findOne({ batchNumber: { $in: candidateBatches } }).lean();

      // Fallback: Case-insensitive regex match on extracted batch number
      if (!batchRecord && extractedInfo.batchNumber && extractedInfo.batchNumber.length >= 2) {
        const escaped = extractedInfo.batchNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        batchRecord = await BatchModel.findOne({ batchNumber: new RegExp(`^${escaped}$`, "i") }).lean();
      }

      if (batchRecord) {
        medicineId = batchRecord.medicineId;
        matchedBatchId = batchRecord._id;
      }
    }

    // 3. Search MedicineModel by name, genericName, or SKU
    if (!medicineId) {
      const searchTerms = [extractedInfo.batchNumber, displayCode].filter((t) => t && t.length >= 2 && !t.includes("\n"));
      if (searchTerms.length > 0) {
        const medMatch = await MedicineModel.findOne({
          $or: searchTerms.flatMap((term) => [
            { name: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            { genericName: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            { sku: new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          ]),
        }).lean();
        if (medMatch) medicineId = medMatch._id;
      }
    }

    if (!medicineId) {
      return {
        found: false,
        code: displayCode,
        extractedInfo,
        message: "Medicine not found in registry",
      };
    }

    // Fetch full medicine details
    const medicine = await MedicineModel.findById(medicineId)
      .populate("dosageFormId", "name shortName")
      .populate("categoryId", "name")
      .populate("therapeuticCategoryId", "name")
      .populate("manufacturerId", "name country")
      .lean();

    if (!medicine) {
      return { found: false, code: displayCode, extractedInfo, message: "Medicine profile inactive or deleted" };
    }

    const now = new Date();

    // Fetch all batches sorted by Expiry Date (FEFO priority)
    const batches = await BatchModel.find({ medicineId })
      .populate("supplierId", "name")
      .sort({ expiryDate: 1 })
      .lean();

    const activeBatches = batches.filter((b) => b.status === "ACTIVE" && new Date(b.expiryDate) > now);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

    return {
      found: true,
      code: displayCode,
      extractedInfo,
      matchedBatchId: matchedBatchId ? matchedBatchId.toString() : null,
      medicine: {
        ...medicine,
        totalStock,
        isLowStock: totalStock <= medicine.minStockLevel,
      },
      batches: batches.map((b) => ({
        ...b,
        isExpired: new Date(b.expiryDate) <= now,
        isExpiringSoon: new Date(b.expiryDate) > now && new Date(b.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      })),
    };
  }

  async quickInward(payload: QuickInwardPayload, userId?: string, ipAddress?: string) {
    const { medicineId, batchNumber, manufacturingDate, expiryDate, quantity, purchasePrice, mrp, supplierId } = payload;

    if (!medicineId || !batchNumber || !expiryDate || !quantity || quantity <= 0) {
      throw new Error("Medicine, Batch Number, Expiry Date, and valid Quantity (> 0) are required.");
    }

    const medicine = await MedicineModel.findById(medicineId);
    if (!medicine) throw new Error("Medicine not found");

    const expDate = new Date(expiryDate);
    const mfgDate = manufacturingDate ? new Date(manufacturingDate) : new Date();
    const now = new Date();

    if (expDate <= now) {
      throw new Error("Cannot add stock with an already expired date!");
    }

    // Check if batch already exists for this medicine
    let batch = await BatchModel.findOne({ medicineId, batchNumber: batchNumber.trim() });
    let beforeBatchQty = 0;
    let afterBatchQty = 0;

    if (batch) {
      beforeBatchQty = batch.quantity;
      batch.quantity += Number(quantity);
      batch.purchasePrice = Number(purchasePrice) || batch.purchasePrice;
      batch.mrp = Number(mrp) || batch.mrp;
      if (supplierId) batch.supplierId = supplierId as any;
      batch.status = "ACTIVE";
      await batch.save();
      afterBatchQty = batch.quantity;
    } else {
      batch = await BatchModel.create({
        medicineId,
        batchNumber: batchNumber.trim(),
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        quantity: Number(quantity),
        initialQuantity: Number(quantity),
        purchasePrice: Number(purchasePrice) || 0,
        mrp: Number(mrp) || 0,
        supplierId: supplierId || null,
        status: "ACTIVE",
      });
      beforeBatchQty = 0;
      afterBatchQty = Number(quantity);
    }

    // Log Inventory Transaction
    await InventoryTransactionModel.create({
      medicineId,
      batchId: batch._id,
      type: "PURCHASE",
      quantityDelta: Number(quantity),
      beforeQuantity: beforeBatchQty,
      afterQuantity: afterBatchQty,
      reason: `Quick Inward Scan for Batch ${batch.batchNumber}`,
      userId: userId || null,
      ipAddress,
    });

    // Audit Log
    await createAuditLog("QUICK_INWARD_SCAN", "BATCH", {
      entityId: batch._id.toString(),
      userId,
      ipAddress,
      details: {
        medicineName: medicine.name,
        batchNumber: batch.batchNumber,
        addedQty: quantity,
        newBatchStock: afterBatchQty,
      },
    });

    return {
      success: true,
      message: `Successfully added ${quantity} units to Batch ${batch.batchNumber}`,
      batch,
      totalMedicineStock: afterBatchQty,
    };
  }

  async visionScan(imageBase64: string) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return {
        success: false,
        data: {
          batchNumber: null,
          manufacturingDate: null,
          expiryDate: null,
        },
        foundFields: [],
        message: "Vision AI key not configured on server",
      };
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    let rawAiResult: { batchNumber?: string | null; manufacturingDate?: string | null; expiryDate?: string | null } | null = null;

    if (geminiKey) {
      // Prioritize active, highly responsive Gemini models supporting structured JSON output
      const candidateModels = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash",
        "gemini-2.5-flash-lite",
      ];

      for (const modelName of candidateModels) {
        try {
          console.log(`[ScannerService] Calling Gemini Vision API (${modelName})...`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are a specialized pharmaceutical vision OCR assistant. Analyze this medicine packaging image (strip, box, bottle, or packaging).
Extract strictly and ONLY these three fields:
1. "batchNumber": The medicine batch or lot number (e.g. AB12345, ST25G9253). Common labels: "Batch No", "Batch Number", "B.No", "Lot No", "LOT", "Batch". Preserve letters, digits, hyphens, and slashes exactly as printed. Omit prefix words. NEVER confuse with barcodes, prices, or license numbers. If not clearly visible, return null.
2. "manufacturingDate": The manufacturing date (e.g. MFG, MFD, Manufactured). If visible, return in DD/MM/YYYY format (or 01/MM/YYYY if only month and year are printed). If not clearly visible, return null.
3. "expiryDate": The expiration or use-before date (e.g. EXP, Expiry, Use Before). If visible, return in DD/MM/YYYY format (or 01/MM/YYYY if only month and year are printed). If not clearly visible, return null.

CRITICAL RULES:
- DO NOT extract medicine name, brand name, composition, MRP, price, quantity, dosage, manufacturer, or any other field.
- Extract ONLY information that is explicitly and clearly visible in the image.
- DO NOT guess, infer, or fabricate values. If a field is not printed, return null.`,
                      },
                      {
                        inline_data: {
                          mime_type: "image/jpeg",
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  response_mime_type: "application/json",
                  response_schema: {
                    type: "OBJECT",
                    properties: {
                      batchNumber: { type: "STRING", nullable: true },
                      manufacturingDate: { type: "STRING", nullable: true },
                      expiryDate: { type: "STRING", nullable: true },
                    },
                    required: ["batchNumber", "manufacturingDate", "expiryDate"],
                  },
                },
              }),
              signal: AbortSignal.timeout(12000),
            }
          );

          if (!response.ok) {
            const errTxt = await response.text();
            console.warn(`[ScannerService] Gemini Vision API (${modelName}) returned status ${response.status}:`, errTxt.substring(0, 150));
            continue;
          }

          const resJson = (await response.json()) as any;
          const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleanJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
          rawAiResult = JSON.parse(cleanJson);
          console.log(`[ScannerService] ✅ Gemini Vision (${modelName}) extracted:`, rawAiResult);
          if (rawAiResult) break;
        } catch (e) {
          console.warn(`[ScannerService] Gemini Vision (${modelName}) Error:`, e);
        }
      }
    } else if (openaiKey) {
      try {
        const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: 'Extract strictly and ONLY: "batchNumber", "manufacturingDate", "expiryDate". If not clearly visible, return null. No other data.',
                  },
                  { type: "image_url", image_url: { url: imageUrl } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(15000),
        });
        const resJson = (await response.json()) as any;
        const text = resJson?.choices?.[0]?.message?.content || "{}";
        rawAiResult = JSON.parse(text);
      } catch (e) {
        console.warn("[ScannerService] OpenAI Vision API Error:", e);
      }
    }

    // Backend Validation and Normalization
    let batchNumber = sanitizeBatchNumber(rawAiResult?.batchNumber);
    let manufacturingDate = normalizeDateToDDMMYYYY(rawAiResult?.manufacturingDate);
    let expiryDate = normalizeDateToDDMMYYYY(rawAiResult?.expiryDate);

    // Cross-validate date order
    const validatedDates = validateDatePair(manufacturingDate, expiryDate);
    manufacturingDate = validatedDates.mfgDate;
    expiryDate = validatedDates.expDate;

    const foundFields: ("batchNumber" | "manufacturingDate" | "expiryDate")[] = [];
    if (batchNumber) foundFields.push("batchNumber");
    if (manufacturingDate) foundFields.push("manufacturingDate");
    if (expiryDate) foundFields.push("expiryDate");

    if (foundFields.length > 0) {
      return {
        success: true,
        data: {
          batchNumber: batchNumber || null,
          manufacturingDate: manufacturingDate || null,
          expiryDate: expiryDate || null,
        },
        foundFields,
        message: "Required data extracted successfully",
      };
    } else {
      return {
        success: false,
        data: {
          batchNumber: null,
          manufacturingDate: null,
          expiryDate: null,
        },
        foundFields: [],
        message: "Required data not found",
      };
    }
  }
}

export const scannerService = new ScannerService();

