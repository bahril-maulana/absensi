-- Jalankan seluruh file ini di Supabase SQL Editor.
-- Schema absensi tanpa ketergantungan Google Sheets atau Apps Script.

create table if not exists public.employees (
  id text primary key,
  nama text not null,
  jabatan text not null default '-',
  foto text not null default '',
  pin text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employees_pin_not_empty check (length(trim(pin)) > 0)
);

create table if not exists public.attendance (
  employee_id text not null references public.employees(id) on delete cascade,
  attendance_date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (employee_id, attendance_date),
  constraint attendance_has_check_in check (check_in is not null),
  constraint attendance_checkout_after_checkin check (check_out is null or check_out >= check_in)
);

create index if not exists attendance_date_idx on public.attendance (attendance_date desc);
create index if not exists attendance_employee_date_idx on public.attendance (employee_id, attendance_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

alter table public.employees enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Public can read active employees" on public.employees;
create policy "Public can read active employees"
on public.employees for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read attendance" on public.attendance;
drop policy if exists "Public can read today's attendance" on public.attendance;
create policy "Public can read today's attendance"
on public.attendance for select
to anon
using (attendance_date = current_date);

drop policy if exists "HR can read attendance" on public.attendance;
create policy "HR can read attendance"
on public.attendance for select
to authenticated
using (true);

drop policy if exists "Public can create attendance" on public.attendance;
create policy "Public can create attendance"
on public.attendance for insert
to anon, authenticated
with check (true);

drop policy if exists "Public can update attendance" on public.attendance;
create policy "Public can update attendance"
on public.attendance for update
to anon, authenticated
using (true)
with check (true);

-- Contoh data awal. Ganti atau hapus sesuai data karyawan Anda.
-- insert into public.employees (id, nama, jabatan, foto, pin) values
-- ('300825', 'Bahril Maulana', 'Barista', 'https://...', '223344'),
-- ('112233', 'Bella Rhenata', 'Barista', 'https://...', '112233');
