import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { CompletedTrainingReport } from './trainingReportModel';
import {
  createTrainingReportPdfStorageService,
  TRAINING_REPORT_PDF_VERSION,
} from './trainingReportPdfStorageService';

const report = {
  reportVersion: 'training-report-v1',
  methodologyVersion: 'muscle-volume-v1',
  period: {
    periodKind: 'MONTH',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    completedLiftingSessions: 8,
    activeTrainingSeconds: 33600,
    exerciseCount: 5,
    completedWorkingSets: 264,
    volumeKgReps: 1000,
    prCount: 4,
  },
  previousPeriod: null,
  delta: {
    completedLiftingSessions: null,
    activeTrainingSeconds: null,
    exerciseCount: null,
    completedWorkingSets: null,
    volumeKgReps: null,
    prCount: null,
  },
  statusCounts: { onTarget: 0, belowTarget: 0, aboveTarget: 0, noData: 0 },
  actionCounts: { add: 0, reduce: 0, maintain: 0, holdReview: 0, monitor: 0, noAction: 0 },
  muscles: [],
} satisfies CompletedTrainingReport;

const snapshot = {
  id: 'snapshot-1',
  period_start: '2026-08-01',
  source_fingerprint: 'fingerprint-1',
  verified_at: '2026-09-01T00:00:00Z',
};

function dependencies() {
  return {
    generatePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70, 45, 1, 2, 3])),
    sha256Hex: vi.fn(async () => 'a'.repeat(64)),
    randomUuid: vi.fn(() => 'candidate-1'),
    downloadLocal: vi.fn(),
    downloadSignedUrl: vi.fn(),
  };
}

function queryResult(data: unknown) {
  const maybeSingle = vi.fn(async () => ({ data, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, maybeSingle }));
  return { select, eq, maybeSingle };
}

function fakeClient({
  artifact = null,
  promotion = null,
  downloadedBytes = new Uint8Array([37, 80, 68, 70, 45, 1, 2, 3]),
}: {
  artifact?: unknown;
  promotion?: unknown;
  downloadedBytes?: Uint8Array;
} = {}) {
  const snapshotQuery = queryResult(snapshot);
  const artifactQuery = queryResult(artifact);

  const upload = vi.fn(async () => ({ data: { path: 'candidate' }, error: null }));
  const download = vi.fn(async () => ({
    data: {
      arrayBuffer: async () => downloadedBytes.buffer.slice(
        downloadedBytes.byteOffset,
        downloadedBytes.byteOffset + downloadedBytes.byteLength,
      ),
    },
    error: null,
  }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const createSignedUrl = vi.fn(async () => ({
    data: { signedUrl: 'https://signed.example/report.pdf' },
    error: null,
  }));

  const rpc = vi.fn(async (name: string) => {
    if (name === 'promote_my_monthly_training_report_pdf') {
      return {
        data: promotion ?? [{
          current_storage_path: 'user-1/snapshot-1/candidate-1.pdf',
          pending_delete_path: null,
          period_start: '2026-08-01',
          verified_at: '2026-09-01T00:00:00Z',
          created: true,
        }],
        error: null,
      };
    }
    if (name === 'confirm_my_monthly_training_report_pdf_cleanup') {
      return { data: true, error: null };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'monthly_training_report_source_snapshots') {
        return snapshotQuery;
      }
      if (table === 'monthly_training_report_pdf_artifacts') {
        return artifactQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc,
    storage: {
      from: vi.fn(() => ({
        upload,
        download,
        remove,
        createSignedUrl,
      })),
    },
  } as unknown as SupabaseClient;

  return {
    client,
    rpc,
    upload,
    download,
    remove,
    createSignedUrl,
  };
}

describe('monthly training report PDF storage lifecycle', () => {
  it('uploads, verifies, promotes, and serves a new retained PDF by signed URL', async () => {
    const fake = fakeClient();
    const deps = dependencies();
    const service = createTrainingReportPdfStorageService(fake.client, deps);

    await expect(
      service.downloadMonthly(report, 'Stefan', 'user-1'),
    ).resolves.toEqual({
      retained: true,
      reused: false,
      periodStart: '2026-08-01',
      storagePath: 'user-1/snapshot-1/candidate-1.pdf',
    });

    expect(fake.upload).toHaveBeenCalledWith(
      'user-1/snapshot-1/candidate-1.pdf',
      expect.any(Blob),
      expect.objectContaining({
        contentType: 'application/pdf',
        upsert: false,
      }),
    );
    expect(fake.download).toHaveBeenCalledWith(
      'user-1/snapshot-1/candidate-1.pdf',
    );
    expect(fake.rpc).toHaveBeenCalledWith(
      'promote_my_monthly_training_report_pdf',
      expect.objectContaining({
        p_snapshot_id: 'snapshot-1',
        p_sha256_hex: 'a'.repeat(64),
        p_pdf_version: TRAINING_REPORT_PDF_VERSION,
      }),
    );
    expect(fake.createSignedUrl).toHaveBeenCalledWith(
      'user-1/snapshot-1/candidate-1.pdf',
      60,
      { download: 'top-set-training-review-2026-08.pdf' },
    );
    expect(deps.downloadSignedUrl).toHaveBeenCalled();
    expect(deps.downloadLocal).not.toHaveBeenCalled();
  });

  it('reuses a current verified artifact without regenerating the PDF', async () => {
    const current = {
      snapshot_id: 'snapshot-1',
      period_start: '2026-08-01',
      source_fingerprint: 'fingerprint-1',
      pdf_version: TRAINING_REPORT_PDF_VERSION,
      storage_path: 'user-1/snapshot-1/existing.pdf',
      byte_size: 1000,
      sha256_hex: 'b'.repeat(64),
      verified_at: '2026-09-01T00:00:00Z',
      pending_delete_path: null,
    };
    const fake = fakeClient({ artifact: current });
    const deps = dependencies();
    const service = createTrainingReportPdfStorageService(fake.client, deps);

    await expect(
      service.downloadMonthly(report, 'Stefan', 'user-1'),
    ).resolves.toMatchObject({
      retained: true,
      reused: true,
      storagePath: current.storage_path,
    });

    expect(deps.generatePdf).not.toHaveBeenCalled();
    expect(fake.upload).not.toHaveBeenCalled();
    expect(fake.createSignedUrl).toHaveBeenCalledWith(
      current.storage_path,
      60,
      { download: 'top-set-training-review-2026-08.pdf' },
    );
  });

  it('finishes a pending previous-object cleanup before reusing the current artifact', async () => {
    const current = {
      snapshot_id: 'snapshot-1',
      period_start: '2026-08-01',
      source_fingerprint: 'fingerprint-1',
      pdf_version: TRAINING_REPORT_PDF_VERSION,
      storage_path: 'user-1/snapshot-1/current.pdf',
      byte_size: 1000,
      sha256_hex: 'b'.repeat(64),
      verified_at: '2026-09-01T00:00:00Z',
      pending_delete_path: 'user-1/older/previous.pdf',
    };
    const fake = fakeClient({ artifact: current });
    const deps = dependencies();

    await createTrainingReportPdfStorageService(fake.client, deps)
      .downloadMonthly(report, 'Stefan', 'user-1');

    expect(fake.remove).toHaveBeenCalledWith([
      'user-1/older/previous.pdf',
    ]);
    expect(fake.rpc).toHaveBeenCalledWith(
      'confirm_my_monthly_training_report_pdf_cleanup',
      { p_current_storage_path: current.storage_path },
    );
  });

  it('keeps an older historical PDF ephemeral when a newer retained month exists', async () => {
    const current = {
      snapshot_id: 'snapshot-newer',
      period_start: '2026-09-01',
      source_fingerprint: 'fingerprint-newer',
      pdf_version: TRAINING_REPORT_PDF_VERSION,
      storage_path: 'user-1/snapshot-newer/current.pdf',
      byte_size: 1000,
      sha256_hex: 'b'.repeat(64),
      verified_at: '2026-10-01T00:00:00Z',
      pending_delete_path: null,
    };
    const fake = fakeClient({ artifact: current });
    const deps = dependencies();

    await expect(
      createTrainingReportPdfStorageService(fake.client, deps)
        .downloadMonthly(report, 'Stefan', 'user-1'),
    ).resolves.toMatchObject({
      retained: false,
      reused: false,
      storagePath: null,
    });

    expect(deps.downloadLocal).toHaveBeenCalled();
    expect(fake.upload).not.toHaveBeenCalled();
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it('removes an unpromoted candidate when integrity verification fails', async () => {
    const fake = fakeClient({
      downloadedBytes: new Uint8Array([1, 2, 3]),
    });
    const deps = dependencies();
    const service = createTrainingReportPdfStorageService(fake.client, deps);

    await expect(
      service.downloadMonthly(report, 'Stefan', 'user-1'),
    ).rejects.toThrow(/size verification failed/i);

    expect(fake.rpc).not.toHaveBeenCalled();
    expect(fake.remove).toHaveBeenCalledWith([
      'user-1/snapshot-1/candidate-1.pdf',
    ]);
  });
});
