CREATE FUNCTION update_bookmarks_tsv() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookmarks_tsv_trigger
BEFORE INSERT OR UPDATE ON bookmarks
FOR EACH ROW EXECUTE FUNCTION update_bookmarks_tsv();