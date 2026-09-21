import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { CompletedTrainingReport } from './trainingReportModel';
import {
  generateMonthlyTrainingReportPdf,
  monthlyTrainingReportPdfFileName,
} from './trainingReportPdf';

const PDF_BUCKET = 'monthly-training-reports';
export const TRAINING_REPORT_PDF_VERSION = 'training-report-pdf-v1';

type FrozenSnapshotRow = {
  id: string;
  period_start: string;
  source_fingerprint: string | null;
  verified_at: string | null;
};

type PdfArtifactRow = {
  snapshot_id: string;
  period_start: string;
  source_fingerprint: string;
  pdf_version: string;
  storage_path: string;
  byte_size: number;
  sha256_hex: string;
  verified_at: string;
  pending_delete_path: string | null;
};

type PromotionRow = {
  current_storage_path: string;
  pending_delete_path: string | null;
  period_start: string;
  verified_at: string;
  created: boolean;
};

export interface MonthlyTrainingReportPdfDelivery {
  retained: boolean;
  reused: boolean;
  periodStart: string;
  storagePath: string | null;
}

export interface TrainingReportPdfStorageDependencies {
  generatePdf(
    report: CompletedTrainingReport,
    displayName: string,
  ): Promise<Uint8Array>;
  sha256Hex(bytes: Uint8Array): Promise<string>;
  randomUuid(): string;
  downloadLocal(bytes: Uint8Array, fileName: string): void;
  downloadSignedUrl(url: string, fileName: string): void;
}

export interface TrainingReportPdfStorageService {
  downloadMonthly(
    report: CompletedTrainingReport,
    displayName: string,
    userId: string,
  ): Promise<MonthlyTrainingReportPdfDelivery>;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function defaultSha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure PDF verification is not available in this browser.');
  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    toArrayBuffer(bytes),
  );

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function defaultDownloadLocal(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function defaultDownloadSignedUrl(url: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function singleRow<T>(data: unknown, message: string): T {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as T;
}

async function loadFrozenSnapshot(
  client: SupabaseClient,
  periodStart: string,
): Promise<FrozenSnapshotRow> {
  const { data, error } = await client
    .from('monthly_training_report_source_snapshots')
    .select('id,period_start,source_fingerprint,verified_at')
    .eq('period_start', periodStart)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Frozen monthly report source was not found.');

  const row = data as FrozenSnapshotRow;
  if (!row.verified_at || !row.source_fingerprint) {
    throw new Error('Frozen monthly report source is not verified.');
  }

  return row;
}

async function loadCurrentArtifact(
  client: SupabaseClient,
): Promise<PdfArtifactRow | null> {
  const { data, error } = await client
    .from('monthly_training_report_pdf_artifacts')
    .select(
      'snapshot_id,period_start,source_fingerprint,pdf_version,storage_path,byte_size,sha256_hex,verified_at,pending_delete_path',
    )
    .maybeSingle();

  if (error) throw error;
  return data ? data as PdfArtifactRow : null;
}

async function confirmPendingCleanup(
  client: SupabaseClient,
  artifact: PdfArtifactRow,
): Promise<PdfArtifactRow> {
  if (!artifact.pending_delete_path) return artifact;

  const { error: removeError } = await client.storage
    .from(PDF_BUCKET)
    .remove([artifact.pending_delete_path]);

  if (removeError) throw removeError;

  const { data, error } = await client.rpc(
    'confirm_my_monthly_training_report_pdf_cleanup',
    { p_current_storage_path: artifact.storage_path },
  );

  if (error) throw error;
  if (data !== true) {
    throw new Error('Previous monthly PDF cleanup was not confirmed.');
  }

  return {
    ...artifact,
    pending_delete_path: null,
  };
}

async function verifyUploadedCandidate(
  client: SupabaseClient,
  path: string,
  expectedBytes: Uint8Array,
  expectedHash: string,
  sha256Hex: (bytes: Uint8Array) => Promise<string>,
): Promise<void> {
  const { data, error } = await client.storage.from(PDF_BUCKET).download(path);
  if (error) throw error;
  if (!data) throw new Error('Uploaded monthly PDF could not be verified.');

  const downloaded = new Uint8Array(await data.arrayBuffer());
  if (downloaded.byteLength !== expectedBytes.byteLength) {
    throw new Error('Uploaded monthly PDF size verification failed.');
  }

  const downloadedHash = await sha256Hex(downloaded);
  if (downloadedHash !== expectedHash) {
    throw new Error('Uploaded monthly PDF integrity verification failed.');
  }
}

async function signedDownloadUrl(
  client: SupabaseClient,
  path: string,
  fileName: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, 60, { download: fileName });

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error('Monthly PDF signed download URL was not created.');
  }

  return data.signedUrl;
}

export function createTrainingReportPdfStorageService(
  client: SupabaseClient = getSupabaseClient(),
  dependencies: Partial<TrainingReportPdfStorageDependencies> = {},
): TrainingReportPdfStorageService {
  const deps: TrainingReportPdfStorageDependencies = {
    generatePdf: generateMonthlyTrainingReportPdf,
    sha256Hex: defaultSha256Hex,
    randomUuid: () => globalThis.crypto.randomUUID(),
    downloadLocal: defaultDownloadLocal,
    downloadSignedUrl: defaultDownloadSignedUrl,
    ...dependencies,
  };

  return {
    async downloadMonthly(report, displayName, userId) {
      if (report.period.periodKind !== 'MONTH') {
        throw new Error('Monthly PDF storage requires a monthly training report.');
      }
      if (!userId.trim()) {
        throw new Error('A signed-in user is required for monthly PDF storage.');
      }

      const fileName = monthlyTrainingReportPdfFileName(report);
      const snapshot = await loadFrozenSnapshot(
        client,
        report.period.periodStart,
      );

      let current = await loadCurrentArtifact(client);

      if (current?.pending_delete_path) {
        current = await confirmPendingCleanup(client, current);
      }

      // Historical months remain downloadable from their frozen structured
      // source without replacing a newer retained monthly artifact.
      if (current && current.period_start > report.period.periodStart) {
        const bytes = await deps.generatePdf(report, displayName);
        deps.downloadLocal(bytes, fileName);
        return {
          retained: false,
          reused: false,
          periodStart: report.period.periodStart,
          storagePath: null,
        };
      }

      const currentMatchesSnapshot =
        current?.snapshot_id === snapshot.id
        && current.source_fingerprint === snapshot.source_fingerprint
        && current.pdf_version === TRAINING_REPORT_PDF_VERSION;

      if (current && currentMatchesSnapshot) {
        const url = await signedDownloadUrl(
          client,
          current.storage_path,
          fileName,
        );
        deps.downloadSignedUrl(url, fileName);
        return {
          retained: true,
          reused: true,
          periodStart: current.period_start,
          storagePath: current.storage_path,
        };
      }

      const bytes = await deps.generatePdf(report, displayName);
      const hash = await deps.sha256Hex(bytes);
      const candidatePath =
        `${userId}/${snapshot.id}/${deps.randomUuid()}.pdf`;

      let promoted = false;

      try {
        const uploadBody = new Blob(
          [toArrayBuffer(bytes)],
          { type: 'application/pdf' },
        );
        const { error: uploadError } = await client.storage
          .from(PDF_BUCKET)
          .upload(candidatePath, uploadBody, {
            cacheControl: '3600',
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        await verifyUploadedCandidate(
          client,
          candidatePath,
          bytes,
          hash,
          deps.sha256Hex,
        );

        const { data: promotionData, error: promotionError } = await client.rpc(
          'promote_my_monthly_training_report_pdf',
          {
            p_snapshot_id: snapshot.id,
            p_storage_path: candidatePath,
            p_byte_size: bytes.byteLength,
            p_sha256_hex: hash,
            p_pdf_version: TRAINING_REPORT_PDF_VERSION,
          },
        );

        if (promotionError) throw promotionError;

        const promotion = singleRow<PromotionRow>(
          promotionData,
          'Monthly PDF promotion returned an invalid response.',
        );
        promoted = true;

        if (promotion.pending_delete_path) {
          const { error: removeError } = await client.storage
            .from(PDF_BUCKET)
            .remove([promotion.pending_delete_path]);

          if (removeError) throw removeError;

          const { data: cleanupData, error: cleanupError } = await client.rpc(
            'confirm_my_monthly_training_report_pdf_cleanup',
            { p_current_storage_path: promotion.current_storage_path },
          );

          if (cleanupError) throw cleanupError;
          if (cleanupData !== true) {
            throw new Error('Previous monthly PDF cleanup was not confirmed.');
          }
        }

        const url = await signedDownloadUrl(
          client,
          promotion.current_storage_path,
          fileName,
        );
        deps.downloadSignedUrl(url, fileName);

        return {
          retained: true,
          reused: false,
          periodStart: promotion.period_start,
          storagePath: promotion.current_storage_path,
        };
      } catch (error) {
        if (!promoted) {
          // A failed unpromoted candidate is not authoritative. Cleanup is
          // best-effort; the valid previously retained artifact is untouched.
          await client.storage.from(PDF_BUCKET).remove([candidatePath]);
        }
        throw error;
      }
    },
  };
}

export async function downloadMonthlyTrainingReportPdfWithRetention(
  report: CompletedTrainingReport,
  displayName: string,
  userId: string,
): Promise<MonthlyTrainingReportPdfDelivery> {
  return createTrainingReportPdfStorageService()
    .downloadMonthly(report, displayName, userId);
}
