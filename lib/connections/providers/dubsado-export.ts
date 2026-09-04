import { z } from "zod";

const MAX_ROWS = 50_000;
const MAX_CELL_LENGTH = 2_000;

const fieldNames = [
  "recordId",
  "status",
  "sourceDate",
  "proposalIssuedAt",
  "signedAt",
  "bookedRevenue",
  "currency",
  "source",
] as const;

export type DubsadoExportField = (typeof fieldNames)[number];

const mappingSchema = z.object(Object.fromEntries(fieldNames.map((field) => [field, z.string().trim().min(1).max(200).optional()])) as Record<DubsadoExportField, z.ZodOptional<z.ZodString>>).strict().superRefine((mapping, ctx) => {
  if (!mapping.recordId) ctx.addIssue({ code: "custom", path: ["recordId"], message: "A stable record identifier column is required." });
  if (!mapping.status) ctx.addIssue({ code: "custom", path: ["status"], message: "A status column is required." });
  for (const [field, column] of Object.entries(mapping)) {
    if (column && /(?:email|phone|mobile|name|address)/iu.test(column)) {
      ctx.addIssue({ code: "custom", path: [field], message: "Do not map direct personal identity fields." });
    }
  }
});

export type DubsadoExportMapping = z.infer<typeof mappingSchema>;

export type DubsadoOutcomeRecord = {
  rowNumber: number;
  recordRef: string;
  status: string;
  sourceDate: string | null;
  proposalIssuedAt: string | null;
  signedAt: string | null;
  bookedRevenue: number | null;
  currency: string | null;
  source: string | null;
};

export const dubsadoOutcomeStageSchema = z.enum([
  "inquiry",
  "qualified_opportunity",
  "completed_qualified_meeting",
  "proposal_issued",
  "signed_engagement",
  "booked_revenue",
  "cancelled",
  "refunded",
]);

export type DubsadoOutcomeStage = z.infer<typeof dubsadoOutcomeStageSchema>;

const statusMapSchema = z.record(z.string().trim().min(1).max(200), dubsadoOutcomeStageSchema).superRefine((mapping, ctx) => {
  if (Object.keys(mapping).length === 0) ctx.addIssue({ code: "custom", message: "An approved Dubsado status map is required." });
});

export type DubsadoStatusMap = z.infer<typeof statusMapSchema>;

export type MappedDubsadoOutcomeRecord = DubsadoOutcomeRecord & { outcomeStage: DubsadoOutcomeStage };

export type DubsadoExportParseResult = {
  records: DubsadoOutcomeRecord[];
  skippedRows: number;
};

function parseCsv(input: string) {
  if (input.length > MAX_ROWS * MAX_CELL_LENGTH) throw new Error("DUBSADO_EXPORT_TOO_LARGE");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > MAX_CELL_LENGTH)) throw new Error("DUBSADO_EXPORT_CELL_TOO_LARGE");
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
    if (cell.length > MAX_CELL_LENGTH) throw new Error("DUBSADO_EXPORT_CELL_TOO_LARGE");
  }
  if (quoted) throw new Error("DUBSADO_EXPORT_UNCLOSED_QUOTE");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length > MAX_ROWS + 1) throw new Error("DUBSADO_EXPORT_TOO_MANY_ROWS");
  return rows;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function parseDate(value: string | undefined, field: string, rowNumber: number) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/u.test(cleaned)) {
    throw new Error(`DUBSADO_EXPORT_${field.toUpperCase()}_INVALID_ROW_${rowNumber}`);
  }
  const parsed = Date.parse(cleaned.length === 10 ? `${cleaned}T00:00:00.000Z` : cleaned);
  if (!Number.isFinite(parsed)) throw new Error(`DUBSADO_EXPORT_${field.toUpperCase()}_INVALID_ROW_${rowNumber}`);
  return new Date(parsed).toISOString();
}

function parseMoney(value: string | undefined, rowNumber: number) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  const normalized = cleaned.replace(/[,$\s]/gu, "").replace(/^\((.*)\)$/u, "-$1");
  if (!/^-?(?:\d+|\d*\.\d{1,2})$/u.test(normalized)) throw new Error(`DUBSADO_EXPORT_REVENUE_INVALID_ROW_${rowNumber}`);
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || Math.abs(amount) > 1_000_000_000) throw new Error(`DUBSADO_EXPORT_REVENUE_INVALID_ROW_${rowNumber}`);
  return Math.round(amount * 100) / 100;
}

function parseCurrency(value: string | undefined, rowNumber: number) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  if (!/^[A-Z]{3}$/u.test(cleaned)) throw new Error(`DUBSADO_EXPORT_CURRENCY_INVALID_ROW_${rowNumber}`);
  return cleaned;
}

function columnValue(row: Record<string, string>, mapping: DubsadoExportMapping, field: DubsadoExportField) {
  const column = mapping[field];
  return column ? row[column] : undefined;
}

function fieldCode(field: string) {
  return field.replace(/[A-Z]/gu, (character) => `_${character}`).toUpperCase();
}

export function parseDubsadoExport(input: string, mappingInput: unknown): DubsadoExportParseResult {
  const mapping = mappingSchema.parse(mappingInput);
  const rows = parseCsv(input);
  if (rows.length === 0) return { records: [], skippedRows: 0 };
  const headers = rows[0].map((header) => header.trim());
  if (headers.length === 0 || headers.some((header) => header === "")) throw new Error("DUBSADO_EXPORT_HEADERS_INVALID");
  if (new Set(headers).size !== headers.length) throw new Error("DUBSADO_EXPORT_HEADERS_DUPLICATE");
  for (const field of fieldNames) {
    const column = mapping[field];
    if (column && !headers.includes(column)) throw new Error(`DUBSADO_EXPORT_COLUMN_MISSING_${fieldCode(field)}`);
  }
  const records: DubsadoOutcomeRecord[] = [];
  let skippedRows = 0;
  for (const [index, values] of rows.slice(1).entries()) {
    const rowNumber = index + 2;
    if (values.every((value) => value.trim() === "")) {
      skippedRows += 1;
      continue;
    }
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const recordRef = clean(columnValue(row, mapping, "recordId"));
    const status = clean(columnValue(row, mapping, "status"));
    if (!recordRef || !status) throw new Error(`DUBSADO_EXPORT_REQUIRED_VALUE_MISSING_ROW_${rowNumber}`);
    if (/@/u.test(recordRef) || /\+?\d[\d ()-]{6,}/u.test(recordRef)) throw new Error(`DUBSADO_EXPORT_PERSONAL_ID_ROW_${rowNumber}`);
    const bookedRevenue = parseMoney(columnValue(row, mapping, "bookedRevenue"), rowNumber);
    const currency = parseCurrency(columnValue(row, mapping, "currency"), rowNumber);
    if (bookedRevenue !== null && currency === null) throw new Error(`DUBSADO_EXPORT_CURRENCY_REQUIRED_ROW_${rowNumber}`);
    records.push({
      rowNumber,
      recordRef,
      status,
      sourceDate: parseDate(columnValue(row, mapping, "sourceDate"), "source_date", rowNumber),
      proposalIssuedAt: parseDate(columnValue(row, mapping, "proposalIssuedAt"), "proposal_issued_at", rowNumber),
      signedAt: parseDate(columnValue(row, mapping, "signedAt"), "signed_at", rowNumber),
      bookedRevenue,
      currency,
      source: clean(columnValue(row, mapping, "source")),
    });
  }
  return { records, skippedRows };
}

export function mapDubsadoOutcomeStages(records: DubsadoOutcomeRecord[], statusMapInput: unknown): MappedDubsadoOutcomeRecord[] {
  const statusMap = statusMapSchema.parse(statusMapInput);
  return records.map((record) => {
    const outcomeStage = statusMap[record.status];
    if (!outcomeStage) throw new Error(`DUBSADO_EXPORT_STATUS_UNMAPPED_ROW_${record.rowNumber}`);
    return { ...record, outcomeStage };
  });
}
