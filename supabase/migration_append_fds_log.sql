-- Atomyczna funkcja dopisująca do fds_log (bez race condition)
CREATE OR REPLACE FUNCTION append_fds_log(p_case_id text, p_chunk text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE fds_submissions
  SET fds_log = COALESCE(fds_log, '') || p_chunk
  WHERE case_id = p_case_id;
$$;
