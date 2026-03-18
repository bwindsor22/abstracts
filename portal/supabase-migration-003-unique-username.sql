-- Migration 003: Add unique constraint on profiles.username
-- Run this in Supabase SQL Editor

-- Case-insensitive unique index on username
create unique index profiles_username_unique on profiles (lower(username));
