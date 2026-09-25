import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createTutorialService } from './tutorialService';

describe('tutorial service', () => {
  it('persists the requested tutorial version through the self-service RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const service = createTutorialService({ rpc } as unknown as SupabaseClient);

    await expect(service.complete(1)).resolves.toBe(1);
    expect(rpc).toHaveBeenCalledWith('complete_my_tutorial', {
      p_version: 1,
    });
  });

  it('fails before the network for invalid tutorial versions', async () => {
    const rpc = vi.fn();
    const service = createTutorialService({ rpc } as unknown as SupabaseClient);

    await expect(service.complete(0)).rejects.toThrow(RangeError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid completion response', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    const service = createTutorialService({ rpc } as unknown as SupabaseClient);

    await expect(service.complete(1)).rejects.toThrow(
      'Tutorial completion response was invalid.',
    );
  });
});
