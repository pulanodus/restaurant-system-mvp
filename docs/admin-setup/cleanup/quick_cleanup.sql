-- Quick cleanup for testing
DELETE FROM orders;
DELETE FROM sessions;
UPDATE tables SET 
  occupied = FALSE,
  current_session_id = NULL,
  current_pin = NULL;
