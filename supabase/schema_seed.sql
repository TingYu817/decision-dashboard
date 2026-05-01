-- Supabase schema + demo seed data for AI decision dashboard
-- Warning: this script truncates the related tables before inserting demo data.

begin;

create extension if not exists pgcrypto;

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null default '未分類',
  price numeric(12, 2) not null default 0,
  safety_stock integer not null default 0,
  lead_time_days integer not null default 0,
  confidence numeric(5, 4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists inventory (
  id bigserial primary key,
  product_id text not null references products(id) on delete cascade,
  on_hand integer not null default 0,
  reserved integer not null default 0,
  incoming integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(product_id)
);

create table if not exists sales (
  id bigserial primary key,
  product_id text not null references products(id) on delete cascade,
  sale_date date not null,
  quantity integer not null default 0,
  revenue numeric(14, 2) not null default 0,
  channel text not null default 'store',
  region text not null default '全區',
  created_at timestamptz not null default now()
);

create index if not exists sales_product_date_idx on sales(product_id, sale_date);
create index if not exists sales_date_idx on sales(sale_date);

create table if not exists forecasts (
  id bigserial primary key,
  product_id text not null references products(id) on delete cascade,
  forecast_date date not null,
  predicted_sales numeric(14, 2) not null default 0,
  lower_bound numeric(14, 2) not null default 0,
  upper_bound numeric(14, 2) not null default 0,
  model_version text not null default 'lstm-placeholder-v1',
  created_at timestamptz not null default now(),
  unique(product_id, forecast_date, model_version)
);

create index if not exists forecasts_product_date_idx on forecasts(product_id, forecast_date);
create index if not exists forecasts_date_idx on forecasts(forecast_date);

create table if not exists feature_weights (
  id bigserial primary key,
  product_id text references products(id) on delete cascade,
  feature_name text not null,
  contribution numeric(8, 2) not null default 0,
  direction text not null default 'neutral' check (direction in ('positive', 'negative', 'neutral')),
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists feature_weights_product_idx on feature_weights(product_id);

create table if not exists nonlinear_events (
  id bigserial primary key,
  product_id text references products(id) on delete set null,
  product_name text,
  event_date date not null,
  event_type text not null,
  impact text,
  response text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now()
);

create index if not exists nonlinear_events_product_date_idx on nonlinear_events(product_id, event_date);

create table if not exists weather_features (
  id bigserial primary key,
  region text not null,
  temperature numeric(5, 2) not null,
  rainfall_probability integer not null default 0 check (rainfall_probability between 0 and 100),
  humidity integer not null default 0 check (humidity between 0 and 100),
  weather_label text,
  observed_at timestamptz not null default now()
);

create index if not exists weather_features_observed_idx on weather_features(observed_at);

create table if not exists promotions (
  id bigserial primary key,
  name text not null,
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'active', 'ended', 'paused')),
  start_date date not null,
  end_date date not null,
  discount_type text,
  discount_value numeric(10, 2),
  product_id text references products(id) on delete set null,
  expected_lift_pct numeric(8, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists promotions_date_idx on promotions(start_date, end_date);

create table if not exists holidays (
  id bigserial primary key,
  date date not null unique,
  name text not null,
  expected_impact text,
  impact_score numeric(8, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists model_runs (
  id bigserial primary key,
  status text not null default 'success',
  optimizer text not null default 'Adam',
  weight_updated boolean not null default true,
  model_version text not null default 'lstm-placeholder-v1',
  hidden_layers text not null default '64/128',
  dropout_rate numeric(4, 2) not null default 0.20,
  mae numeric(12, 4),
  rmse numeric(12, 4),
  mape numeric(12, 4),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists model_runs_created_idx on model_runs(created_at);

create table if not exists purchase_orders (
  id bigserial primary key,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'sent', 'received', 'cancelled')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

truncate table
  purchase_orders,
  model_runs,
  holidays,
  promotions,
  weather_features,
  nonlinear_events,
  feature_weights,
  forecasts,
  sales,
  inventory,
  products
restart identity cascade;

insert into products (id, name, category, price, safety_stock, lead_time_days, confidence) values
  ('p-1001', '冰拿鐵', '飲品', 75, 160, 3, 0.86),
  ('p-1002', '美式咖啡', '飲品', 55, 140, 2, 0.82),
  ('p-1003', '抹茶拿鐵', '飲品', 85, 120, 3, 0.80),
  ('p-1004', '水果氣泡飲', '飲品', 90, 95, 4, 0.77),
  ('p-2001', '可頌', '烘焙', 45, 90, 2, 0.84),
  ('p-2002', '肉桂捲', '烘焙', 65, 70, 2, 0.79),
  ('p-2003', '貝果', '烘焙', 50, 80, 2, 0.78),
  ('p-3001', '節慶禮盒', '禮盒', 680, 35, 7, 0.74),
  ('p-3002', '精品咖啡豆', '零售', 420, 45, 5, 0.81),
  ('p-3003', '濾掛咖啡盒', '零售', 360, 55, 5, 0.83),
  ('p-4001', '午間輕食盒', '餐食', 120, 75, 2, 0.76),
  ('p-4002', '雞肉沙拉', '餐食', 135, 65, 2, 0.75);

insert into inventory (product_id, on_hand, reserved, incoming) values
  ('p-1001', 118, 18, 60),
  ('p-1002', 220, 28, 20),
  ('p-1003', 96, 16, 45),
  ('p-1004', 64, 10, 30),
  ('p-2001', 52, 12, 40),
  ('p-2002', 81, 9, 12),
  ('p-2003', 136, 20, 0),
  ('p-3001', 88, 4, 0),
  ('p-3002', 28, 6, 25),
  ('p-3003', 62, 8, 40),
  ('p-4001', 70, 18, 35),
  ('p-4002', 42, 12, 20);

with product_factor as (
  select * from (values
    ('p-1001', 1.35, 75),
    ('p-1002', 1.18, 55),
    ('p-1003', 0.82, 85),
    ('p-1004', 0.72, 90),
    ('p-2001', 0.95, 45),
    ('p-2002', 0.64, 65),
    ('p-2003', 0.70, 50),
    ('p-3001', 0.22, 680),
    ('p-3002', 0.30, 420),
    ('p-3003', 0.38, 360),
    ('p-4001', 0.58, 120),
    ('p-4002', 0.46, 135)
  ) as t(product_id, factor, price)
), days as (
  select generate_series(current_date - interval '59 days', current_date, interval '1 day')::date as sale_date
)
insert into sales (product_id, sale_date, quantity, revenue, channel, region)
select
  pf.product_id,
  d.sale_date,
  greatest(0, round((72 + (extract(dow from d.sale_date) in (0, 6))::int * 22 + sin(extract(doy from d.sale_date) / 4.0) * 16 + ((extract(day from d.sale_date)::int % 9) * 2)) * pf.factor))::int as quantity,
  greatest(0, round((72 + (extract(dow from d.sale_date) in (0, 6))::int * 22 + sin(extract(doy from d.sale_date) / 4.0) * 16 + ((extract(day from d.sale_date)::int % 9) * 2)) * pf.factor))::int * pf.price as revenue,
  case when extract(dow from d.sale_date) in (0, 6) then 'online' else 'store' end as channel,
  case (extract(day from d.sale_date)::int % 4)
    when 0 then '北部'
    when 1 then '中部'
    when 2 then '南部'
    else '東部'
  end as region
from product_factor pf
cross join days d;

with product_factor as (
  select * from (values
    ('p-1001', 1.35),
    ('p-1002', 1.18),
    ('p-1003', 0.82),
    ('p-1004', 0.72),
    ('p-2001', 0.95),
    ('p-2002', 0.64),
    ('p-2003', 0.70),
    ('p-3001', 0.22),
    ('p-3002', 0.30),
    ('p-3003', 0.38),
    ('p-4001', 0.58),
    ('p-4002', 0.46)
  ) as t(product_id, factor)
), days as (
  select generate_series(current_date, current_date + interval '29 days', interval '1 day')::date as forecast_date
), base as (
  select
    pf.product_id,
    d.forecast_date,
    greatest(0, (82 + (extract(dow from d.forecast_date) in (0, 6))::int * 25 + sin(extract(doy from d.forecast_date) / 5.0) * 18 + ((extract(day from d.forecast_date)::int % 10) * 2.5)) * pf.factor) as predicted
  from product_factor pf
  cross join days d
)
insert into forecasts (product_id, forecast_date, predicted_sales, lower_bound, upper_bound, model_version)
select
  product_id,
  forecast_date,
  round(predicted::numeric, 2),
  round((predicted * 0.88)::numeric, 2),
  round((predicted * 1.12)::numeric, 2),
  'lstm-placeholder-v1'
from base;

insert into feature_weights (product_id, feature_name, contribution, direction, explanation) values
  ('p-1001', '氣溫升高', 34.5, 'positive', '高溫提升冰飲需求'),
  ('p-1001', '週末效應', 22.0, 'positive', '週末人流提升銷售'),
  ('p-1001', '降雨機率', 12.5, 'negative', '降雨降低門市流量'),
  ('p-1001', '促銷活動', 28.0, 'positive', '第二杯優惠提高購買量'),
  ('p-1002', '價格敏感度', 18.5, 'negative', '價格上調會降低需求'),
  ('p-1002', '週末效應', 25.0, 'positive', '週末早午餐時段需求上升'),
  ('p-1003', '社群聲量', 19.0, 'positive', '新品討論度帶動需求'),
  ('p-1004', '氣溫升高', 31.0, 'positive', '氣泡飲受高溫影響明顯'),
  ('p-2001', '早餐時段流量', 27.5, 'positive', '早餐搭配咖啡提升銷量'),
  ('p-2001', '降雨機率', 10.0, 'negative', '雨天影響外帶需求'),
  ('p-2002', '節慶檔期', 21.0, 'positive', '節慶甜點需求提高'),
  ('p-3001', '節慶檔期', 42.0, 'positive', '禮盒需求受節慶明顯影響'),
  ('p-3001', '企業採購', 30.0, 'positive', '大量訂單提升短期需求'),
  ('p-3002', '會員日', 24.0, 'positive', '會員促銷帶動零售商品'),
  ('p-4001', '午餐時段流量', 33.0, 'positive', '工作日午餐需求提升'),
  ('p-4002', '氣溫升高', 14.0, 'positive', '高溫時沙拉需求增加');

insert into nonlinear_events (product_id, product_name, event_date, event_type, impact, response, severity) values
  ('p-1001', '冰拿鐵', current_date - interval '6 days', '促銷啟動', '+31%', '模型上修未來 7 天預測上緣', 'high'),
  ('p-3001', '節慶禮盒', current_date - interval '4 days', '節慶搜尋量升高', '+24%', '提高禮盒短期需求預測', 'high'),
  ('p-2001', '可頌', current_date - interval '2 days', '降雨造成門市流量下降', '-12%', '下修短期補貨建議', 'medium'),
  ('p-4001', '午間輕食盒', current_date - interval '1 days', '附近辦公區活動', '+18%', '提高午餐時段需求預測', 'medium'),
  ('p-3002', '精品咖啡豆', current_date - interval '8 days', '會員日活動', '+20%', '上修零售商品補貨需求', 'medium');

insert into weather_features (region, temperature, rainfall_probability, humidity, weather_label, observed_at) values
  ('北部', 29.4, 35, 72, '多雲短暫雨', now() - interval '1 hour'),
  ('中部', 31.1, 20, 64, '晴時多雲', now() - interval '1 hour'),
  ('南部', 32.3, 18, 61, '晴朗炎熱', now() - interval '1 hour'),
  ('東部', 28.7, 42, 78, '午後雷陣雨', now() - interval '1 hour'),
  ('北部', 28.8, 45, 75, '多雲', now() - interval '6 hours'),
  ('中部', 30.6, 25, 66, '晴時多雲', now() - interval '6 hours'),
  ('南部', 31.8, 22, 62, '晴朗', now() - interval '6 hours'),
  ('東部', 28.1, 50, 80, '短暫雨', now() - interval '6 hours');

insert into promotions (name, status, start_date, end_date, discount_type, discount_value, product_id, expected_lift_pct) values
  ('夏季飲品第二杯半價', 'active', current_date - interval '1 day', current_date + interval '6 days', 'percent', 50, 'p-1001', 28),
  ('會員日點心組合', 'scheduled', current_date + interval '3 days', current_date + interval '5 days', 'bundle', 20, 'p-2001', 16),
  ('精品豆任兩包 9 折', 'scheduled', current_date + interval '7 days', current_date + interval '14 days', 'percent', 10, 'p-3002', 18),
  ('午間輕食加購飲品優惠', 'active', current_date - interval '2 days', current_date + interval '8 days', 'bundle', 30, 'p-4001', 21),
  ('節慶禮盒早鳥預購', 'scheduled', current_date + interval '10 days', current_date + interval '24 days', 'amount', 80, 'p-3001', 35),
  ('新品抹茶拿鐵嚐鮮價', 'ended', current_date - interval '18 days', current_date - interval '8 days', 'amount', 10, 'p-1003', 14);

insert into holidays (date, name, expected_impact, impact_score) values
  (current_date + interval '2 days', '週末高峰', '+8%', 8),
  (current_date + interval '7 days', '會員日', '+15%', 15),
  (current_date + interval '12 days', '節慶檔期', '+22%', 22),
  (current_date + interval '18 days', '連假前採購', '+19%', 19),
  (current_date + interval '25 days', '企業送禮採購週', '+28%', 28);

insert into model_runs (status, optimizer, weight_updated, model_version, hidden_layers, dropout_rate, mae, rmse, mape, note, created_at) values
  ('success', 'Adam', true, 'lstm-placeholder-v1', '64/128', 0.20, 8.4200, 11.7300, 7.8500, '每日排程完成，權重更新成功', now() - interval '2 hours'),
  ('success', 'Adam', true, 'lstm-placeholder-v1', '64/128', 0.20, 8.9100, 12.1000, 8.1200, '前一日訓練完成', now() - interval '1 day'),
  ('completed', 'Adam', true, 'lstm-placeholder-v1', '64/128', 0.20, 9.1000, 12.5200, 8.3300, '資料同步完成', now() - interval '2 days');

insert into purchase_orders (status, items, created_at) values
  ('draft', '[{"productId":"p-1001","productName":"冰拿鐵","quantity":280},{"productId":"p-2001","productName":"可頌","quantity":160}]'::jsonb, now() - interval '1 day'),
  ('pending', '[{"productId":"p-3002","productName":"精品咖啡豆","quantity":70},{"productId":"p-3003","productName":"濾掛咖啡盒","quantity":95}]'::jsonb, now() - interval '3 days');

-- Demo API permissions for the publishable/anon key used by this project.
-- For production, replace this with proper authentication, RLS, and server-side service-role access.
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

commit;
