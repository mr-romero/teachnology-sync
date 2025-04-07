alter table user_settings
add column if not exists default_model text,
add column if not exists openrouter_endpoint text;