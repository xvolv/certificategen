export type IngestRow = { fullName: string; email?: string | null };

class IngestStore {
  private store = new Map<string, IngestRow[]>();

  set(batchId: string, rows: IngestRow[]) {
    this.store.set(batchId, rows);
  }

  get(batchId: string) {
    return this.store.get(batchId) ?? null;
  }

  clear(batchId: string) {
    this.store.delete(batchId);
  }
}

export const ingestStore = new IngestStore();
