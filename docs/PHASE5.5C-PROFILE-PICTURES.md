# Phase 5.5C — Profile Pictures

Status: implemented in v0.3.3.

This phase adds **profile pictures only**. It does not introduce avatars, avatar builders, character cosmetics, or any scoring effect.

## Storage model

- Bucket: `profile-pictures`.
- Bucket is public because profile pictures are social display assets used in groups, leaderboards, activity, and PR cards.
- Upload/delete operations remain protected by Storage RLS.
- Each user can mutate only objects under `<auth.uid()>/...`.
- Supported stored MIME types: JPEG, PNG, WebP.
- Stored object limit: 2 MiB.
- PostgreSQL stores only `profiles.profile_picture_path`, never image bytes.
- The profile row check requires the path to begin with the profile owner's UUID folder.

## Client architecture

```text
ProfilePicture / ProfilePictureManager
              ↓
       useProfilePicture
              ↓
    profilePictureService
              ↓
Supabase profiles + Storage
```

Presentation components do not import Supabase. Styling is colocated in CSS Modules.

## Replace semantics

Replacement uploads a new unique object, updates the profile path, and then best-effort removes the previous object. This deliberately avoids Storage `upsert` and avoids stale public-CDN URLs for an object that changed in place.

If the profile-row update fails after upload, the new object is cleaned up best-effort and the previous profile picture remains authoritative.

## Display behavior

- Real PFP when a valid URL exists.
- Initials placeholder when no PFP exists.
- Initials fallback if the image fails to load.
- Images display with a centered square crop through CSS `object-fit: cover`.
- A manual crop/position editor is not part of this phase and can be added later if needed.

## Security boundary

PFPs are cosmetic only. They cannot change XP, rankings, group permissions, or scoring.
