-- Run AFTER the migrations, BEFORE anyone signs in.
-- Replace with your own institute addresses.

insert into admin_allowlist (email) values
  ('hod.cce@jaipur.manipal.edu')
on conflict do nothing;

insert into faculty (email, full_name, department, designation, employee_code) values
  ('ananya.rao@jaipur.manipal.edu',   'Dr. Ananya Rao',    'CCE', 'Associate Professor', 'MUJ-CCE-101'),
  ('vikram.shetty@jaipur.manipal.edu','Dr. Vikram Shetty', 'CCE', 'Assistant Professor', 'MUJ-CCE-102'),
  ('priya.menon@jaipur.manipal.edu',  'Dr. Priya Menon',   'CCE', 'Professor',           'MUJ-CCE-103')
on conflict (email) do nothing;
