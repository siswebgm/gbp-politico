-- Update voters table to make most fields optional
create table voters (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  cpf text not null unique,
  category text,
  birth_date date,
  gender text,
  voter_title text,
  zone text,
  section text,
  whatsapp text,
  phone text,
  zip_code text,
  street text,
  city text,
  neighborhood text,
  number text,
  complement text,
  indication text,
  indicated_by text,
  service_notes text,
  service_status text not null default 'pending',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ... rest of the schema remains the same