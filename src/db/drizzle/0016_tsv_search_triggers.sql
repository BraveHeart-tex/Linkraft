CREATE FUNCTION update_tags_tsv() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tags_tsv_trigger
BEFORE INSERT OR UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION update_tags_tsv();


CREATE FUNCTION update_collections_tsv() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_tsv_trigger
BEFORE INSERT OR UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION update_collections_tsv();
