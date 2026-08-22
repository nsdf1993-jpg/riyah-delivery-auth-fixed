/*
# تقييد دالة handle_new_user (تريغر فقط، لا RPC)
دالة التريغر لا تحتاج أن تكون قابلة للاستدعاء عبر REST API.
*/
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
