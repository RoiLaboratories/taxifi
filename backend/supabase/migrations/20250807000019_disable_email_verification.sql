-- Disable email confirmation requirement for testing
-- WARNING: Enable this in production!
alter table auth.users disable row level security;
update auth.config set value = false where name = 'ENABLE_EMAIL_SIGNUP';
update auth.config set value = false where name = 'ENABLE_EMAIL_AUTOCONFIRM';
alter table auth.users enable row level security;
