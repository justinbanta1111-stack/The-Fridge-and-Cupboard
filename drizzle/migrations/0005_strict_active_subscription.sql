CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid and environment = check_env
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$function$;