BEGIN;

UPDATE fashstock_web.users AS u
SET email = REPLACE(u.email, '@fashstock.local', '@gmail.com')
WHERE u.email LIKE '%@fashstock.local'
  AND NOT EXISTS (
    SELECT 1
    FROM fashstock_web.users AS existing
    WHERE existing.email =
      REPLACE(u.email, '@fashstock.local', '@gmail.com')
  );

COMMIT;

SELECT id, name, email, role, status
FROM fashstock_web.users
ORDER BY id;