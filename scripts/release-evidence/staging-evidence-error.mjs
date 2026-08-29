export class StagingEvidenceError extends Error {
  constructor(code, paths = []) {
    super(code);
    this.code = code;
    this.paths = paths;
  }
}

export function fail(code, paths = []) {
  throw new StagingEvidenceError(code, paths);
}
