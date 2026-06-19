def serialize_doc(doc: dict | None) -> dict | None:
    """Convert a MongoDB document to a JSON-serializable dict."""
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc
