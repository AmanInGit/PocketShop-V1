-- Normalize customer identity phone numbers to E.164 (+91XXXXXXXXXX)
-- and enforce unique phone identity at customer profile level.

begin;

-- 1) Backfill customer_profiles phone column to E.164 where possible.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customer_profiles'
      and column_name = 'mobile_number'
  ) then
    execute $sql$
      update customer_profiles
      set mobile_number = case
        when mobile_number ~ '^\+91[0-9]{10}$' then mobile_number
        when regexp_replace(mobile_number, '\D', '', 'g') ~ '^91[0-9]{10}$'
          then '+' || regexp_replace(mobile_number, '\D', '', 'g')
        when regexp_replace(mobile_number, '\D', '', 'g') ~ '^[0-9]{10}$'
          then '+91' || regexp_replace(mobile_number, '\D', '', 'g')
        else mobile_number
      end
    $sql$;

    execute $sql$
      alter table customer_profiles
      add constraint customer_profiles_mobile_number_e164_chk
      check (mobile_number ~ '^\+91[0-9]{10}$')
    $sql$;

    execute $sql$
      create unique index if not exists ux_customer_profiles_mobile_number_e164
      on customer_profiles (mobile_number)
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customer_profiles'
      and column_name = 'phone'
  ) then
    execute $sql$
      update customer_profiles
      set phone = case
        when phone ~ '^\+91[0-9]{10}$' then phone
        when regexp_replace(phone, '\D', '', 'g') ~ '^91[0-9]{10}$'
          then '+' || regexp_replace(phone, '\D', '', 'g')
        when regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{10}$'
          then '+91' || regexp_replace(phone, '\D', '', 'g')
        else phone
      end
    $sql$;

    execute $sql$
      alter table customer_profiles
      add constraint customer_profiles_phone_e164_chk
      check (phone ~ '^\+91[0-9]{10}$')
    $sql$;

    execute $sql$
      create unique index if not exists ux_customer_profiles_phone_e164
      on customer_profiles (phone)
    $sql$;
  end if;
end $$;

-- 4) Align orders/guest_sessions phone format for history compatibility.
update orders
set customer_phone = case
  when customer_phone is null then null
  when customer_phone ~ '^\+91[0-9]{10}$' then customer_phone
  when regexp_replace(customer_phone, '\D', '', 'g') ~ '^91[0-9]{10}$'
    then '+' || regexp_replace(customer_phone, '\D', '', 'g')
  when regexp_replace(customer_phone, '\D', '', 'g') ~ '^[0-9]{10}$'
    then '+91' || regexp_replace(customer_phone, '\D', '', 'g')
  else customer_phone
end;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_sessions'
      and column_name = 'mobile_number'
  ) then
    execute $sql$
      update guest_sessions
      set mobile_number = case
        when mobile_number ~ '^\+91[0-9]{10}$' then mobile_number
        when regexp_replace(mobile_number, '\D', '', 'g') ~ '^91[0-9]{10}$'
          then '+' || regexp_replace(mobile_number, '\D', '', 'g')
        when regexp_replace(mobile_number, '\D', '', 'g') ~ '^[0-9]{10}$'
          then '+91' || regexp_replace(mobile_number, '\D', '', 'g')
        else mobile_number
      end
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_sessions'
      and column_name = 'phone'
  ) then
    execute $sql$
      update guest_sessions
      set phone = case
        when phone ~ '^\+91[0-9]{10}$' then phone
        when regexp_replace(phone, '\D', '', 'g') ~ '^91[0-9]{10}$'
          then '+' || regexp_replace(phone, '\D', '', 'g')
        when regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{10}$'
          then '+91' || regexp_replace(phone, '\D', '', 'g')
        else phone
      end
    $sql$;
  end if;
end $$;

commit;

