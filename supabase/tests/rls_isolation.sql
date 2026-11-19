-- RLS isolation check. Safe to run against production: the block ALWAYS ends
-- with RAISE EXCEPTION, so every fixture and change it makes is rolled back.
--
-- Run it with the Supabase MCP `execute_sql` (or psql) and read the error:
--   RLS_ISOLATION_PASSED: <n> checks   → every check matched
--   RLS_ISOLATION_FAILED: <names>      → the listed checks did not match
--
-- Users A and B are the two oldest auth.users rows. A owns every fixture.
do $iso$
declare
  a uuid; b uuid;
  ex uuid; ex2 uuid; w uuid; we uuid; s uuid; pr uuid; rl uuid; bw uuid; rt uuid; re uuid;
  pg uuid; pd uuid; pe uuid; cc uuid; cm uuid; dl uuid;
  tbls text[]; cols text[]; vals text[];
  n int; i int; checks int := 0; fails text := '';
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users order by created_at offset 1 limit 1;
  -- Without a second user every "B can't…" check would pass vacuously.
  if b is null then
    raise exception 'RLS_ISOLATION_FAILED: need at least two auth.users rows';
  end if;

  -- ── Fixtures, owned by A (inserted as postgres, bypassing RLS) ──
  insert into public.exercises (name, muscle_group, movement_pattern, is_custom, created_by)
    values ('__rls_iso__', 'chest', 'push', true, a) returning id into ex;
  insert into public.exercises (name, muscle_group, movement_pattern, is_custom, created_by)
    values ('__rls_iso_2__', 'back', 'pull', true, a) returning id into ex2;
  insert into public.workouts (user_id, started_at) values (a, now()) returning id into w;
  insert into public.workout_exercises (workout_id, exercise_id, order_index) values (w, ex, 0) returning id into we;
  -- completed_at set so the frequency function counts this set for A.
  insert into public.sets (workout_exercise_id, set_number, weight_kg, reps, completed_at)
    values (we, 1, 50, 5, now()) returning id into s;
  insert into public.personal_records (user_id, exercise_id, pr_type, reps, value, set_id)
    values (a, ex, 'best_weight', 5, 50, s) returning id into pr;
  insert into public.readiness_logs (user_id, sleep_score, soreness_score, energy_score, logged_at)
    values (a, 3, 3, 3, '1900-01-01') returning id into rl;
  insert into public.bodyweight_log (user_id, weight_kg) values (a, 80) returning id into bw;
  insert into public.routines (user_id, title) values (a, '__rls_iso__') returning id into rt;
  insert into public.routine_exercises (routine_id, exercise_id, order_index) values (rt, ex, 0) returning id into re;
  insert into public.programs (user_id, name, duration_weeks) values (a, '__rls_iso__', 4) returning id into pg;
  insert into public.program_days (program_id, week_number, day_number) values (pg, 1, 1) returning id into pd;
  insert into public.program_exercises (program_day_id, exercise_id, sets_target, reps_target, order_index)
    values (pd, ex, 3, '5', 0) returning id into pe;
  insert into public.coach_conversations (user_id) values (a) returning id into cc;
  insert into public.coach_messages (conversation_id, role, content) values (cc, 'user', 'hi') returning id into cm;
  insert into public.deload_log (user_id, reason, fatigue_score, volume_reduction_pct) values (a, 'iso', 1, 10) returning id into dl;
  insert into public.user_exercise_preferences (user_id, exercise_id, rest_seconds) values (a, ex, 60);
  insert into public.profiles (id) values (a) on conflict (id) do nothing;
  insert into public.coach_usage (user_id, tokens_in, tokens_out) values (a, 1, 1);
  insert into storage.objects (bucket_id, name) values ('avatars', a::text || '/__rls_iso__.png');

  -- One row per user-owned table: (table, key column, A's fixture key).
  tbls := array['workouts','workout_exercises','sets','personal_records','readiness_logs','bodyweight_log',
                'routines','routine_exercises','programs','program_days','program_exercises',
                'coach_conversations','coach_messages','deload_log','user_exercise_preferences','profiles'];
  cols := array['id','id','id','id','id','id','id','id','id','id','id','id','id','id','exercise_id','id'];
  vals := array[w, we, s, pr, rl, bw, rt, re, pg, pd, pe, cc, cm, dl, ex, a]::text[];

  -- ── As B: A's rows are invisible and untouchable ──
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  for i in 1 .. array_length(tbls, 1) loop
    execute format('select count(*) from public.%I where %I = %L', tbls[i], cols[i], vals[i]) into n;
    checks := checks + 1; if n <> 0 then fails := fails || 'B_select_' || tbls[i] || ' '; end if;
    execute format('update public.%I set %I = %I where %I = %L', tbls[i], cols[i], cols[i], cols[i], vals[i]);
    get diagnostics n = row_count;
    checks := checks + 1; if n <> 0 then fails := fails || 'B_update_' || tbls[i] || ' '; end if;
    begin
      execute format('delete from public.%I where %I = %L', tbls[i], cols[i], vals[i]);
      get diagnostics n = row_count;
    exception when others then n := 0;
    end;
    checks := checks + 1; if n <> 0 then fails := fails || 'B_delete_' || tbls[i] || ' '; end if;
  end loop;

  checks := checks + 1;
  begin insert into public.sets (workout_exercise_id, set_number, weight_kg, reps) values (we, 2, 1, 1);
    fails := fails || 'B_insert_set_into_A ';
  exception when others then null; end;
  checks := checks + 1;
  begin insert into public.coach_messages (conversation_id, role, content) values (cc, 'user', 'x');
    fails := fails || 'B_insert_message_into_A ';
  exception when others then null; end;
  checks := checks + 1;
  begin insert into public.routine_exercises (routine_id, exercise_id, order_index) values (rt, ex, 1);
    fails := fails || 'B_insert_routine_exercise_into_A ';
  exception when others then null; end;
  checks := checks + 1;
  begin insert into storage.objects (bucket_id, name) values ('avatars', a::text || '/evil.png');
    fails := fails || 'B_upload_to_A_avatar ';
  exception when others then null; end;
  select count(*) into n from public.exercises where id = ex;
  checks := checks + 1; if n <> 0 then fails := fails || 'B_sees_A_custom_exercise '; end if;
  select count(*) into n from public.get_user_exercise_frequency() f where f.exercise_id = ex;
  checks := checks + 1; if n <> 0 then fails := fails || 'B_frequency_includes_A '; end if;
  execute 'reset role';

  -- ── As A: own rows are readable, updatable, deletable; usage is append-only ──
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  for i in 1 .. array_length(tbls, 1) loop
    execute format('select count(*) from public.%I where %I = %L', tbls[i], cols[i], vals[i]) into n;
    checks := checks + 1; if n <> 1 then fails := fails || 'A_select_' || tbls[i] || ' '; end if;
    execute format('update public.%I set %I = %I where %I = %L', tbls[i], cols[i], cols[i], cols[i], vals[i]);
    get diagnostics n = row_count;
    checks := checks + 1; if n <> 1 then fails := fails || 'A_update_' || tbls[i] || ' '; end if;
  end loop;

  select count(*) into n from public.get_user_exercise_frequency() f where f.exercise_id = ex;
  checks := checks + 1; if n <> 1 then fails := fails || 'A_frequency_has_own_set '; end if;

  -- Owner inserts, as the app does them. Tables with a separate INSERT policy
  -- (readiness_logs, user_exercise_preferences, profiles) are not covered by
  -- the update checks above, so each one is exercised here.
  checks := checks + 1;
  begin insert into public.readiness_logs (user_id, sleep_score, soreness_score, energy_score, logged_at)
    values (a, 3, 3, 3, '1900-01-02');
  exception when others then fails := fails || 'A_insert_readiness_logs '; end;
  checks := checks + 1;
  begin insert into public.user_exercise_preferences (user_id, exercise_id, rest_seconds) values (a, ex2, 90);
  exception when others then fails := fails || 'A_insert_user_exercise_preferences '; end;
  checks := checks + 1;
  begin insert into public.profiles (id, rest_timer_seconds) values (a, 90)
    on conflict (id) do update set rest_timer_seconds = excluded.rest_timer_seconds;
  exception when others then fails := fails || 'A_upsert_profiles '; end;
  checks := checks + 1;
  begin insert into public.personal_records (user_id, exercise_id, pr_type, value) values (a, ex2, 'best_1rm', 60);
  exception when others then fails := fails || 'A_insert_personal_records '; end;
  checks := checks + 1;
  begin insert into public.bodyweight_log (user_id, weight_kg) values (a, 81);
  exception when others then fails := fails || 'A_insert_bodyweight_log '; end;
  checks := checks + 1;
  begin insert into public.coach_conversations (user_id) values (a);
  exception when others then fails := fails || 'A_insert_coach_conversations '; end;

  -- Children first, so each delete hits exactly its own fixture row.
  -- The last two (user_exercise_preferences, profiles) have no delete policy by
  -- design: the app never deletes them; they go by cascade with their parent.
  for i in reverse array_length(tbls, 1) - 2 .. 1 loop
    begin
      execute format('delete from public.%I where %I = %L', tbls[i], cols[i], vals[i]);
      get diagnostics n = row_count;
    exception when others then n := -1;
    end;
    checks := checks + 1; if n <> 1 then fails := fails || 'A_delete_' || tbls[i] || ' '; end if;
  end loop;

  checks := checks + 1;
  begin
    insert into public.workouts (user_id, started_at) values (a, now()) returning id into w;
    insert into public.workout_exercises (workout_id, exercise_id, order_index) values (w, ex, 0) returning id into we;
    insert into public.sets (workout_exercise_id, set_number, weight_kg, reps) values (we, 1, 50, 5);
  exception when others then fails := fails || 'A_insert_workout_chain ';
  end;

  checks := checks + 1;
  begin delete from public.coach_usage where user_id = a;
    get diagnostics n = row_count;
    if n <> 0 then fails := fails || 'A_delete_own_coach_usage '; end if;
  exception when others then null; end;

  execute 'reset role';

  -- ── As anon: no exercises, no frequency ──
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.exercises;
  checks := checks + 1; if n <> 0 then fails := fails || 'anon_reads_exercises '; end if;
  checks := checks + 1;
  begin perform count(*) from public.get_user_exercise_frequency();
    fails := fails || 'anon_calls_frequency ';
  exception when others then null; end;
  execute 'reset role';

  if fails = '' then
    raise exception 'RLS_ISOLATION_PASSED: % checks', checks;
  end if;
  raise exception 'RLS_ISOLATION_FAILED: %', trim(fails);
end
$iso$;
