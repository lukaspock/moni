-- Advisor 0011 (function_search_path_mutable): pin search_path on the trigger function.
alter function public.set_updated_at() set search_path = '';
