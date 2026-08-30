export type StagingHttpResult = {
  codes: readonly string[];
  rootStatus: number | null;
  authStatus: number | null;
  redirectPath: string | null;
  headers: Readonly<{
    present?: Readonly<Record<string, boolean>>;
    referrerPolicy?: boolean;
    contentTypeOptions?: boolean;
    noStore?: boolean;
    strictTransportSecurity?: boolean;
  }>;
};

export function checkStagingHttp(input?: {
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<StagingHttpResult>;
