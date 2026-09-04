import { describe, expect, it } from "vitest";
import { mapDubsadoOutcomeStages, parseDubsadoExport } from "./dubsado-export";
import { mapDubsadoOutcomeStages as mapStagesFromProviderIndex, parseDubsadoExport as parseExportFromProviderIndex } from "./index";

const mapping = {
  recordId: "Project ID",
  status: "Status",
  sourceDate: "Updated",
  signedAt: "Signed",
  bookedRevenue: "Revenue",
  currency: "Currency",
  source: "Lead Source",
};

describe("parseDubsadoExport", () => {
  it("is exposed through the provider API", () => {
    expect(parseExportFromProviderIndex).toBe(parseDubsadoExport);
    expect(mapStagesFromProviderIndex).toBe(mapDubsadoOutcomeStages);
  });

  it("normalizes only explicitly mapped outcome fields", () => {
    const result = parseDubsadoExport([
      "Project ID,Status,Updated,Signed,Revenue,Currency,Lead Source,Email",
      "proj-42,Signed,2026-08-01,2026-08-02,($1,250.50),USD,Google Ads,hidden@example.com",
    ].join("\n").replace("($1,250.50)", '"($1,250.50)"'), mapping);
    expect(result).toEqual({
      skippedRows: 0,
      records: [{
        rowNumber: 2,
        recordRef: "proj-42",
        status: "Signed",
        sourceDate: "2026-08-01T00:00:00.000Z",
        proposalIssuedAt: null,
        signedAt: "2026-08-02T00:00:00.000Z",
        bookedRevenue: -1250.5,
        currency: "USD",
        source: "Google Ads",
      }],
    });
  });

  it("supports quoted commas, blank rows, and multiline fields", () => {
    const csv = [
      "Project ID,Status,Updated,Signed,Revenue,Currency,Lead Source,Notes",
      'proj-1,"Proposal, issued",2026-08-01,,,USD,"Event, referral","line one',
      'line two"',
      ",,,,,,,",
    ].join("\n");
    const result = parseDubsadoExport(csv, mapping);
    expect(result.skippedRows).toBe(1);
    expect(result.records[0]).toMatchObject({ recordRef: "proj-1", status: "Proposal, issued", source: "Event, referral" });
  });

  it("requires explicit stable and status columns", () => {
    expect(() => parseDubsadoExport("Status\nSigned", { status: "Status" })).toThrow("stable record identifier column is required");
  });

  it("rejects identity columns and identity-like record values", () => {
    expect(() => parseDubsadoExport("Email,Status\na@example.com,Signed", { recordId: "Email", status: "Status" })).toThrow("Do not map direct personal identity fields");
    expect(() => parseDubsadoExport("Project ID,Status\na@example.com,Signed", { recordId: "Project ID", status: "Status" })).toThrow("DUBSADO_EXPORT_PERSONAL_ID_ROW_2");
  });

  it("rejects ambiguous dates, malformed money, and missing mapped columns", () => {
    expect(() => parseDubsadoExport("Project ID,Status,Updated\nproj-1,Signed,08/01/2026", { recordId: "Project ID", status: "Status", sourceDate: "Updated" })).toThrow("SOURCE_DATE_INVALID_ROW_2");
    expect(() => parseDubsadoExport("Project ID,Status,Revenue\nproj-1,Signed,1.234", { recordId: "Project ID", status: "Status", bookedRevenue: "Revenue" })).toThrow("REVENUE_INVALID_ROW_2");
    expect(() => parseDubsadoExport("Project ID,Status\nproj-1,Signed", { ...mapping })).toThrow("DUBSADO_EXPORT_COLUMN_MISSING_SOURCE_DATE");
  });

  it("requires an ISO currency when revenue is present", () => {
    expect(() => parseDubsadoExport("Project ID,Status,Revenue\nproj-1,Signed,1250", { recordId: "Project ID", status: "Status", bookedRevenue: "Revenue" })).toThrow("DUBSADO_EXPORT_CURRENCY_REQUIRED_ROW_2");
    expect(() => parseDubsadoExport("Project ID,Status,Revenue,Currency\nproj-1,Signed,1250,US", { recordId: "Project ID", status: "Status", bookedRevenue: "Revenue", currency: "Currency" })).toThrow("DUBSADO_EXPORT_CURRENCY_INVALID_ROW_2");
  });

  it("handles CRLF input and rejects unclosed quotes", () => {
    const result = parseDubsadoExport("Project ID,Status\r\nproj-1,Signed\r\n", { recordId: "Project ID", status: "Status" });
    expect(result.records).toHaveLength(1);
    expect(() => parseDubsadoExport("Project ID,Status\n\"proj-1,Signed", { recordId: "Project ID", status: "Status" })).toThrow("DUBSADO_EXPORT_UNCLOSED_QUOTE");
  });

  it("maps statuses only through an explicit approved map", () => {
    const parsed = parseDubsadoExport("Project ID,Status\nproj-1,Booked", { recordId: "Project ID", status: "Status" });
    expect(mapDubsadoOutcomeStages(parsed.records, { Booked: "booked_revenue" })[0].outcomeStage).toBe("booked_revenue");
    expect(() => mapDubsadoOutcomeStages(parsed.records, {})).toThrow("An approved Dubsado status map is required");
    expect(() => mapDubsadoOutcomeStages(parsed.records, { Proposal: "proposal_issued" })).toThrow("DUBSADO_EXPORT_STATUS_UNMAPPED_ROW_2");
  });
});
