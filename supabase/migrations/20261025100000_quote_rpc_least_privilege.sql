-- The public quote intake endpoint uses the anon role. Signed-in users do not
-- need direct RPC access; keep execution least-privileged while preserving the
-- public form and trusted server-side maintenance access.
revoke execute on function public.submit_marketplace_quote(
  uuid, text, text, text, text, integer, text, boolean, text, text
) from authenticated;

grant execute on function public.submit_marketplace_quote(
  uuid, text, text, text, text, integer, text, boolean, text, text
) to anon, service_role;
