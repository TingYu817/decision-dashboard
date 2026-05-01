-- Demo/dev only: allow the current Node.js backend using the Supabase publishable/anon key to read data.
-- For production, use Supabase Auth + proper RLS policies or a server-side service role key.

alter table if exists products disable row level security;
alter table if exists inventory disable row level security;
alter table if exists sales disable row level security;
alter table if exists forecasts disable row level security;
alter table if exists feature_weights disable row level security;
alter table if exists nonlinear_events disable row level security;
alter table if exists weather_features disable row level security;
alter table if exists promotions disable row level security;
alter table if exists holidays disable row level security;
alter table if exists model_runs disable row level security;
alter table if exists purchase_orders disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  products,
  inventory,
  sales,
  forecasts,
  feature_weights,
  nonlinear_events,
  weather_features,
  promotions,
  holidays,
  model_runs,
  purchase_orders
to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
