import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GroupService } from "../groupService";
import type { GroupSummary } from "../model";
import { useCreateGroup } from "./useCreateGroup";
import { useGroups } from "./useGroups";
import { useJoinGroup } from "./useJoinGroup";

const group: GroupSummary = {
  id: "group-1",
  name: "Iron Crew",
  memberCount: 6,
  role: "OWNER",
  joinedAt: "2026-08-19T20:00:00Z",
  createdAt: "2026-08-19T20:00:00Z",
};

function service(overrides: Partial<GroupService> = {}): GroupService {
  return {
    listGroups: vi.fn(async () => []),
    createGroup: vi.fn(async () => group),
    getMembers: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({
      id: "invite-1",
      groupId: group.id,
      token: "6ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      expiresAt: "2026-08-26T20:00:00Z",
      maxUses: 25,
      useCount: 0,
      revokedAt: null,
    })),
    joinByInvite: vi.fn(async () => group.id),
    ...overrides,
  };
}

describe("group hooks", () => {
  it("loads every group for the signed-in user without assuming one group", async () => {
    const api = service({
      listGroups: vi.fn(async () => [
        group,
        {
          ...group,
          id: "group-2",
          name: "Second Crew",
          role: "MEMBER" as const,
        },
      ]),
    });
    const { result } = renderHook(() => useGroups("user-1", api));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.groups).toHaveLength(2);
    expect(api.listGroups).toHaveBeenCalledWith("user-1");
  });

  it("returns the created group while keeping Supabase details inside the service", async () => {
    const api = service();
    const { result } = renderHook(() => useCreateGroup("user-1", api));

    await act(async () => {
      await expect(
        result.current.create({ name: "Iron Crew" }),
      ).resolves.toEqual(group);
    });

    expect(result.current.createdGroup).toEqual(group);
    expect(result.current.error).toBe("");
  });

  it("maps invite failures into user-facing hook state", async () => {
    const api = service({
      joinByInvite: vi.fn(async () => {
        throw new Error("Invite has expired");
      }),
    });
    const { result } = renderHook(() => useJoinGroup(api));

    await act(async () => {
      await expect(
        result.current.join("6ccccccc-cccc-4ccc-8ccc-cccccccccccc"),
      ).resolves.toBeNull();
    });

    expect(result.current.error).toMatch(/expired/i);
    expect(result.current.joinedGroupId).toBeNull();
  });
});
