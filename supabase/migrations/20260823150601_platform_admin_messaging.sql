-- Fitness Game PWA — Phase 15.4 administrator messaging (part 1)
-- PostgreSQL requires a newly added enum value to be committed before later
-- migration statements can use it in function bodies.

alter type public.moderation_activity_type add value if not exists 'COMMUNICATION';
