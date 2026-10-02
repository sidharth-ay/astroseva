"""Observability: request IDs and readiness.

- Every response carries X-Request-ID, generated or propagated.
- /health answers liveness (the process is up); /ready answers readiness
  (it can serve: database reachable and schema current).
"""

def test_every_response_carries_a_request_id(client):
    resp = client.get("/api/v1/mantra/chalisa")
    assert resp.status_code == 200
    assert resp.headers.get("X-Request-ID"), "no request ID on the response"


def test_a_caller_supplied_id_is_propagated(client):
    """Distributed traces need one ID across service boundaries."""
    resp = client.get("/health", headers={"X-Request-ID": "trace-abc-123"})
    assert resp.headers.get("X-Request-ID") == "trace-abc-123"


def test_generated_ids_are_unique_per_request(client):
    first = client.get("/health").headers.get("X-Request-ID")
    second = client.get("/health").headers.get("X-Request-ID")
    assert first and second and first != second


def test_ready_reports_database_and_schema(client):
    resp = client.get("/ready")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ready": True}


def test_ready_fails_when_the_database_is_unreachable(client, monkeypatch):
    """A process that cannot serve must not receive traffic."""
    import app.main as main_module

    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise ConnectionError("database is gone")

        def close(self):
            pass

    monkeypatch.setattr(main_module, "SessionLocal", lambda: BrokenSession())

    resp = client.get("/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body["ready"] is False
    assert body["reason"] == "ConnectionError"


def test_ready_fails_on_a_stale_schema(client, monkeypatch):
    """Code migrated past its database answers 500s while looking healthy.

    user_settings arrived in migration 0003, so a database without that table
    is behind the running code.
    """
    import app.main as main_module

    real_session_local = main_module.SessionLocal

    class StaleSchemaSession:
        def __init__(self):
            self._db = real_session_local()

        def execute(self, statement, *args, **kwargs):
            sql = str(statement)
            if "user_settings" in sql:
                raise Exception('no such table: user_settings')
            return self._db.execute(statement, *args, **kwargs)

        def close(self):
            self._db.close()

    monkeypatch.setattr(main_module, "SessionLocal", StaleSchemaSession)

    resp = client.get("/ready")
    assert resp.status_code == 503
    assert resp.json()["ready"] is False
