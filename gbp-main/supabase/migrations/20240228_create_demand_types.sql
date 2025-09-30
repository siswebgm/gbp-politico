-- Create demand_types table
create table if not exists demand_types (
    id bigint primary key generated always as identity,
    name text not null,
    category text not null,
    company_id uuid references companies(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table demand_types enable row level security;

create policy "Companies can view their own demand types"
    on demand_types for select
    using (auth.uid() in (
        select user_id from company_users where company_id = demand_types.company_id
    ));

create policy "Companies can insert their own demand types"
    on demand_types for insert
    with check (auth.uid() in (
        select user_id from company_users where company_id = demand_types.company_id
    ));

create policy "Companies can update their own demand types"
    on demand_types for update
    using (auth.uid() in (
        select user_id from company_users where company_id = demand_types.company_id
    ));

create policy "Companies can delete their own demand types"
    on demand_types for delete
    using (auth.uid() in (
        select user_id from company_users where company_id = demand_types.company_id
    ));
