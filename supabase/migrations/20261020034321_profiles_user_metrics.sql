/*
# Bind dashboard metrics to authenticated user profiles

1. Modified Tables
- `profiles`
  - Add `user_id uuid` referencing auth.users(id), defaulting to auth.uid(), unique.
  - Add dashboard metric columns mirroring the front-end DashboardMetrics shape:
    - `sovereign_cores integer` (default 4180)
    - `tasks_completed integer` (default 0)
    - `skills_synced integer` (default 0)
    - `latency text` (default '8ms')
    - `memory_footprint text` (default '0.3 MB')
    - `cloud_node_status text` (default 'ACTIVE')
    - `uptime text` (default '99.99%')
    - `mutation_rate text` (default '4.2/s')
    - `threat_level text` (default 'CLEAR')
    - `shield_status text` (default 'ACTIVE')
    - `encryption_status text` (default 'AES-256 + PQC')
    - `sandbox_integrity text` (default 'INTACT')
2. Security
- Replace the previous anon/shared policies with authenticated owner-scoped CRUD
  so each logged-in user can only read and mutate their own profile row.
- SELECT, INSERT, UPDATE, DELETE scoped to `auth.uid() = user_id`.
- The `user_id` DEFAULT `auth.uid()` ensures inserts that omit user_id succeed.
3. Important Notes
- Idempotent: column adds are guarded; policies are dropped before recreate.
- Authenticated users get one profile row (unique user_id). The front-end upserts on load.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE profiles ALTER COLUMN user_id SET DEFAULT auth.uid();
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'sovereign_cores') THEN
    ALTER TABLE profiles
      ADD COLUMN sovereign_cores integer NOT NULL DEFAULT 4180,
      ADD COLUMN tasks_completed integer NOT NULL DEFAULT 0,
      ADD COLUMN skills_synced integer NOT NULL DEFAULT 0,
      ADD COLUMN latency text NOT NULL DEFAULT '8ms',
      ADD COLUMN memory_footprint text NOT NULL DEFAULT '0.3 MB',
      ADD COLUMN cloud_node_status text NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN uptime text NOT NULL DEFAULT '99.99%',
      ADD COLUMN mutation_rate text NOT NULL DEFAULT '4.2/s',
      ADD COLUMN threat_level text NOT NULL DEFAULT 'CLEAR',
      ADD COLUMN shield_status text NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN encryption_status text NOT NULL DEFAULT 'AES-256 + PQC',
      ADD COLUMN sandbox_integrity text NOT NULL DEFAULT 'INTACT';
  END IF;
END $$;

-- Replace single-tenant anon policies with authenticated owner-scoped CRUD.
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
