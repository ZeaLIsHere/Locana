-- Locana Supabase schema. Run in Supabase SQL Editor.
create table if not exists users (
  id text primary key,
  username text,
  email text unique not null,
  password_hash text not null,
  role text not null,
  name text,
  phone text,
  birthday date,
  loyalty_points numeric default 0,
  created_at timestamptz default now()
);

create table if not exists categories (
  id text primary key,
  name text not null,
  slug text
);

create table if not exists products (
  id text primary key,
  category_id text,
  name text not null,
  description text default '',
  price numeric not null,
  points_cost int default 0,
  points_reward int default 0,
  image_url text,
  is_available boolean default true
);

create table if not exists orders (
  id text primary key,
  order_number text,
  customer_id text,
  customer_name text,
  cashier_id text,
  table_id text,
  table_number int,
  status text,
  payment_method text,
  payment_status text,
  total_price numeric,
  points_earned numeric default 0,
  points_redeemed int default 0,
  notes text default '',
  created_at timestamptz,
  items jsonb not null default '[]'
);

create table if not exists loyalty_transactions (
  id text primary key,
  customer_id text,
  order_id text,
  points numeric,
  transaction_type text,
  created_at timestamptz
);

create table if not exists tables (
  id text primary key,
  number int,
  label text,
  is_active boolean default true,
  created_at timestamptz,
  created_by text
);

create index if not exists idx_orders_customer_id on orders(customer_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_products_category_id on products(category_id);
create unique index if not exists idx_tables_number on tables(number);
create index if not exists idx_loyalty_customer_id on loyalty_transactions(customer_id);
create index if not exists idx_loyalty_order_id on loyalty_transactions(order_id);

-- RLS stays disabled; backend uses the service-role key.
