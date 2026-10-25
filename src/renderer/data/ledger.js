// Ledger — a mid-level full-stack build project in Python.
//
// No third-party packages: sqlite3, http.server and unittest are all in the
// standard library, so the build runs anywhere Python does. The point is the
// parts that do not show up in a tutorial: schema migrations that run exactly
// once, parameterised SQL, transactions, integer money, idempotency keys, and
// keyset pagination — all proven by tests.

const ledger = {
  id: 'ledger',
  title: 'Ledger',
  language: 'python',
  level: 'mid',
  summary: 'Build an expense API on SQLite: real migrations, safe SQL, idempotent writes, and keyset pagination.',
  brief: 'Run versioned migrations, keep money in integer cents, record entries exactly once per idempotency key, page with a cursor, and expose it all over HTTP.',
  concepts: ['python', 'sqlite', 'migrations', 'sql', 'transactions', 'indexes', 'http', 'testing'],
  scaffold: [
    {
      file: 'README.md',
      content: `# Ledger

An expense ledger API on the Python standard library.

- \`python -m unittest discover -s tests\` runs the suite.
- \`python run.py\` starts the API on port 3000.

Money is stored as integer cents. Every write that can be retried carries an
idempotency key, and the database — not the application — enforces it.
`,
    },
    {
      file: 'ledger/__init__.py',
      content: '',
    },
    {
      file: 'ledger/db.py',
      content: `import sqlite3
from datetime import datetime, timezone
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def connect(db_path):
    # The HTTP handler runs in its own thread; SQLite still serialises writes.
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def apply_migrations(connection, migrations_dir=MIGRATIONS_DIR):
    # TODO: create schema_migrations, then apply each *.sql file exactly once.
    raise NotImplementedError("the migration runner is not implemented yet")
`,
    },
    {
      file: 'migrations/001_init.sql',
      content: `CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`,
    },
    {
      file: 'ledger/store.py',
      content: `class ValidationError(Exception):
    status = 400


class NotFoundError(Exception):
    status = 404


class ConflictError(Exception):
    status = 409


def create_account(connection, name):
    # TODO: validate the name and insert the account with a timestamp.
    raise NotImplementedError("create_account is not implemented yet")


def get_account(connection, account_id):
    # TODO: return the account as a dict, or raise NotFoundError.
    raise NotImplementedError("get_account is not implemented yet")
`,
    },
    {
      file: 'ledger/api.py',
      content: `import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from .store import (
    ConflictError,
    NotFoundError,
    ValidationError,
    balance_cents,
    create_account,
    list_entries,
    record_entry,
)


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def create_server(connection, host="127.0.0.1", port=0):
    # TODO: return a ThreadingHTTPServer whose handler calls the store.
    raise NotImplementedError("the HTTP API is not implemented yet")
`,
    },
    {
      file: 'run.py',
      content: `import os

from ledger.api import create_server
from ledger.db import apply_migrations, connect


if __name__ == "__main__":
    connection = connect("ledger.db")
    apply_migrations(connection)
    server = create_server(connection, port=int(os.environ.get("PORT", "3000")))
    print("Ledger listening on http://localhost:" + str(server.server_port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
`,
    },
    {
      file: 'tests/test_db.py',
      content: `import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from ledger.db import apply_migrations, connect


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "ledger.db"))

    def tearDown(self):
        self.connection.close()
        self.tmp.cleanup()

    def test_applies_the_init_migration_exactly_once(self):
        applied = apply_migrations(self.connection)
        self.assertIn("001_init", applied)

        tables = {
            row["name"]
            for row in self.connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        self.assertTrue({"accounts", "entries", "schema_migrations"} <= tables)
        self.assertEqual(apply_migrations(self.connection), [])

    def test_a_failing_migration_rolls_back_and_is_not_recorded(self):
        folder = Path(self.tmp.name) / "migrations"
        folder.mkdir()
        (folder / "001_broken.sql").write_text(
            "CREATE TABLE kept (id INTEGER); CREATE TABLE (id INTEGER);",
            encoding="utf-8",
        )

        with self.assertRaises(sqlite3.Error):
            apply_migrations(self.connection, migrations_dir=folder)

        tables = {
            row["name"]
            for row in self.connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        self.assertNotIn("kept", tables)
        recorded = [
            row["version"]
            for row in self.connection.execute("SELECT version FROM schema_migrations")
        ]
        self.assertEqual(recorded, [])
`,
    },
    {
      file: 'tests/test_schema.py',
      content: `import os
import sqlite3
import tempfile
import unittest

from ledger.db import apply_migrations, connect


class IdempotencySchemaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "ledger.db"))
        apply_migrations(self.connection)
        self.connection.execute(
            "INSERT INTO accounts (name, created_at) VALUES ('Ada', '2026-01-01')"
        )

    def tearDown(self):
        self.connection.close()
        self.tmp.cleanup()

    def insert_entry(self, amount, key):
        self.connection.execute(
            "INSERT INTO entries (account_id, amount_cents, memo, idempotency_key, created_at)"
            " VALUES (1, ?, '', ?, '2026-01-01')",
            (amount, key),
        )

    def test_the_idempotency_column_exists(self):
        columns = {
            row["name"] for row in self.connection.execute("PRAGMA table_info(entries)")
        }
        self.assertIn("idempotency_key", columns)

    def test_the_database_rejects_a_reused_key(self):
        self.insert_entry(500, "order-1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_entry(900, "order-1")

    def test_entries_without_a_key_are_allowed(self):
        self.insert_entry(500, None)
        self.insert_entry(700, None)
        self.connection.commit()
        count = self.connection.execute("SELECT COUNT(*) AS n FROM entries").fetchone()["n"]
        self.assertEqual(count, 2)

    def test_there_is_an_index_for_account_history(self):
        names = {
            row["name"] for row in self.connection.execute("PRAGMA index_list(entries)")
        }
        self.assertTrue(any("account" in name for name in names), names)
`,
    },
    {
      file: 'tests/test_accounts.py',
      content: `import os
import tempfile
import unittest

from ledger.db import apply_migrations, connect
from ledger.store import NotFoundError, ValidationError, create_account, get_account


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "ledger.db"))
        apply_migrations(self.connection)

    def tearDown(self):
        self.connection.close()
        self.tmp.cleanup()

    def test_creates_and_reads_an_account(self):
        account = create_account(self.connection, "  Ada Lovelace  ")
        self.assertEqual(account["name"], "Ada Lovelace")
        self.assertIsInstance(account["id"], int)
        self.assertTrue(account["createdAt"])
        self.assertEqual(get_account(self.connection, account["id"])["name"], "Ada Lovelace")

    def test_rejects_blank_and_oversized_names(self):
        with self.assertRaises(ValidationError):
            create_account(self.connection, "   ")
        with self.assertRaises(ValidationError):
            create_account(self.connection, None)
        with self.assertRaises(ValidationError):
            create_account(self.connection, "x" * 81)

    def test_unknown_accounts_raise_not_found(self):
        with self.assertRaises(NotFoundError):
            get_account(self.connection, 999)
`,
    },
    {
      file: 'tests/test_entries.py',
      content: `import os
import tempfile
import unittest

from ledger.db import apply_migrations, connect
from ledger.store import (
    ConflictError,
    NotFoundError,
    ValidationError,
    create_account,
    record_entry,
)


class EntryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "ledger.db"))
        apply_migrations(self.connection)
        self.account = create_account(self.connection, "Ada")

    def tearDown(self):
        self.connection.close()
        self.tmp.cleanup()

    def test_records_an_entry_against_an_account(self):
        entry = record_entry(self.connection, self.account["id"], 1250, "coffee")
        self.assertEqual(entry["amountCents"], 1250)
        self.assertEqual(entry["memo"], "coffee")
        self.assertEqual(entry["accountId"], self.account["id"])

    def test_rejects_bad_amounts_and_unknown_accounts(self):
        for amount in (0, 1.5, "500", True, None):
            with self.assertRaises(ValidationError):
                record_entry(self.connection, self.account["id"], amount)
        with self.assertRaises(NotFoundError):
            record_entry(self.connection, 999, 500)

    def test_an_idempotency_key_returns_the_same_entry(self):
        first = record_entry(self.connection, self.account["id"], 500, "lunch", "order-1")
        second = record_entry(self.connection, self.account["id"], 500, "lunch", "order-1")
        self.assertEqual(first["id"], second["id"])
        count = self.connection.execute("SELECT COUNT(*) AS n FROM entries").fetchone()["n"]
        self.assertEqual(count, 1)

    def test_reusing_a_key_with_a_different_amount_is_a_conflict(self):
        record_entry(self.connection, self.account["id"], 500, "lunch", "order-1")
        with self.assertRaises(ConflictError):
            record_entry(self.connection, self.account["id"], 900, "lunch", "order-1")

    def test_stores_hostile_text_literally(self):
        hostile = "x'); DROP TABLE entries; --"
        entry = record_entry(self.connection, self.account["id"], 500, hostile)
        self.assertEqual(entry["memo"], hostile)
        count = self.connection.execute("SELECT COUNT(*) AS n FROM entries").fetchone()["n"]
        self.assertEqual(count, 1)
`,
    },
    {
      file: 'tests/test_reporting.py',
      content: `import os
import tempfile
import unittest

from ledger.db import apply_migrations, connect
from ledger.store import ValidationError, balance_cents, create_account, list_entries, record_entry


class ReportingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "ledger.db"))
        apply_migrations(self.connection)
        self.account = create_account(self.connection, "Ada")

    def tearDown(self):
        self.connection.close()
        self.tmp.cleanup()

    def test_balance_sums_credits_and_debits(self):
        self.assertEqual(balance_cents(self.connection, self.account["id"]), 0)
        record_entry(self.connection, self.account["id"], 500, "invoice")
        record_entry(self.connection, self.account["id"], -200, "refund")
        record_entry(self.connection, self.account["id"], 300, "invoice")
        self.assertEqual(balance_cents(self.connection, self.account["id"]), 600)

    def test_paginates_with_a_cursor_instead_of_offsets(self):
        ids = []
        for index in range(5):
            ids.append(record_entry(self.connection, self.account["id"], 100 + index)["id"])
        ids.reverse()

        page = list_entries(self.connection, self.account["id"], limit=2)
        self.assertEqual([item["id"] for item in page["items"]], ids[0:2])
        self.assertEqual(page["nextCursor"], ids[1])

        second = list_entries(
            self.connection, self.account["id"], limit=2, after=page["nextCursor"]
        )
        self.assertEqual([item["id"] for item in second["items"]], ids[2:4])
        self.assertEqual(second["nextCursor"], ids[3])

        last = list_entries(
            self.connection, self.account["id"], limit=2, after=second["nextCursor"]
        )
        self.assertEqual([item["id"] for item in last["items"]], ids[4:])
        self.assertIsNone(last["nextCursor"])

    def test_rejects_absurd_page_sizes(self):
        for limit in (0, -1, 51, 2.5, True):
            with self.assertRaises(ValidationError):
                list_entries(self.connection, self.account["id"], limit=limit)
`,
    },
    {
      file: 'tests/test_api.py',
      content: `import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

from ledger.api import create_server
from ledger.db import apply_migrations, connect


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.connection = connect(os.path.join(self.tmp.name, "api.db"))
        apply_migrations(self.connection)
        self.server = create_server(self.connection)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = "http://127.0.0.1:" + str(self.server.server_port)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.connection.close()
        self.tmp.cleanup()

    def request(self, method, path, body=None, content_type="application/json"):
        if body is None or isinstance(body, bytes):
            data = body
        else:
            data = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(self.base + path, data=data, method=method)
        if data is not None:
            request.add_header("content-type", content_type)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read().decode("utf-8")), response.headers
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8") or "{}"), error.headers


class ApiTests(ApiTestCase):
    def test_creates_an_account_and_returns_its_balance(self):
        status, account, _ = self.request("POST", "/accounts", {"name": "Ada"})
        self.assertEqual(status, 201)
        status, balance, _ = self.request("GET", "/accounts/" + str(account["id"]) + "/balance")
        self.assertEqual(status, 200)
        self.assertEqual(balance, {"accountId": account["id"], "balanceCents": 0})

    def test_records_entries_and_replays_idempotent_writes(self):
        _, account, _ = self.request("POST", "/accounts", {"name": "Ada"})
        path = "/accounts/" + str(account["id"]) + "/entries"
        body = {"amountCents": 250, "memo": "coffee", "idempotencyKey": "order-1"}
        first_status, first, _ = self.request("POST", path, body)
        second_status, second, _ = self.request("POST", path, body)
        self.assertEqual(first_status, 201)
        self.assertEqual(second_status, 201)
        self.assertEqual(first["id"], second["id"])
        _, balance, _ = self.request("GET", "/accounts/" + str(account["id"]) + "/balance")
        self.assertEqual(balance["balanceCents"], 250)

    def test_a_reused_key_with_a_different_body_is_a_conflict(self):
        _, account, _ = self.request("POST", "/accounts", {"name": "Ada"})
        path = "/accounts/" + str(account["id"]) + "/entries"
        self.request("POST", path, {"amountCents": 250, "idempotencyKey": "order-1"})
        status, payload, _ = self.request(
            "POST", path, {"amountCents": 900, "idempotencyKey": "order-1"}
        )
        self.assertEqual(status, 409)
        self.assertIn("error", payload)

    def test_pages_entries_with_a_cursor(self):
        _, account, _ = self.request("POST", "/accounts", {"name": "Ada"})
        path = "/accounts/" + str(account["id"]) + "/entries"
        for amount in (100, 200, 300):
            self.request("POST", path, {"amountCents": amount})

        status, page, _ = self.request("GET", path + "?limit=2")
        self.assertEqual(status, 200)
        self.assertEqual(len(page["items"]), 2)
        self.assertIsNotNone(page["nextCursor"])

        _, rest, _ = self.request("GET", path + "?limit=2&after=" + str(page["nextCursor"]))
        self.assertEqual(len(rest["items"]), 1)
        self.assertIsNone(rest["nextCursor"])

    def test_unknown_accounts_and_routes_are_json_errors(self):
        status, payload, _ = self.request("GET", "/accounts/999/balance")
        self.assertEqual(status, 404)
        self.assertIn("error", payload)

        status, payload, _ = self.request("GET", "/nope")
        self.assertEqual(status, 404)
        self.assertIn("error", payload)

    def test_bad_validation_is_a_400(self):
        status, _, _ = self.request("POST", "/accounts", {"name": "   "})
        self.assertEqual(status, 400)
`,
    },
    {
      file: 'tests/test_api_security.py',
      content: `import json
import unittest

from tests.test_api import ApiTestCase


class ApiSecurityTests(ApiTestCase):
    def test_requires_a_json_content_type(self):
        status, _, _ = self.request(
            "POST", "/accounts", b'{"name": "Ada"}', content_type="text/plain"
        )
        self.assertEqual(status, 415)

    def test_refuses_an_oversized_body(self):
        big = json.dumps({"name": "x" * 20000}).encode("utf-8")
        status, _, _ = self.request("POST", "/accounts", big)
        self.assertEqual(status, 413)

    def test_bad_json_is_a_400(self):
        status, payload, _ = self.request("POST", "/accounts", b"{not json")
        self.assertEqual(status, 400)
        self.assertIn("error", payload)

    def test_every_response_forbids_sniffing(self):
        _, _, headers = self.request("POST", "/accounts", {"name": "Ada"})
        self.assertEqual(headers.get("x-content-type-options"), "nosniff")
        _, _, missing = self.request("GET", "/nope")
        self.assertEqual(missing.get("x-content-type-options"), "nosniff")

    def test_errors_do_not_leak_sql_or_tracebacks(self):
        _, payload, _ = self.request("GET", "/accounts/abc/balance")
        text = json.dumps(payload)
        self.assertNotIn("Traceback", text)
        self.assertNotIn("SELECT", text)
        self.assertNotIn("sqlite", text)

    def test_hostile_memo_text_cannot_execute_sql(self):
        _, account, _ = self.request("POST", "/accounts", {"name": "Ada"})
        path = "/accounts/" + str(account["id"]) + "/entries"
        status, entry, _ = self.request(
            "POST", path, {"amountCents": 500, "memo": "x'); DROP TABLE entries; --"}
        )
        self.assertEqual(status, 201)
        self.assertEqual(entry["memo"], "x'); DROP TABLE entries; --")
        count = self.connection.execute("SELECT COUNT(*) AS n FROM entries").fetchone()["n"]
        self.assertEqual(count, 1)
`,
    },
  ],
  steps: [
    {
      id: 'ledger-1-migrations',
      title: 'Run migrations exactly once',
      file: 'ledger/db.py',
      task: 'Implement `apply_migrations` and `connect`: create a `schema_migrations` table, then apply each `migrations/*.sql` file in filename order inside a transaction, recording the version in the same transaction. Re-running must do nothing. Run `python -m unittest discover -s tests -p "test_db.py"`.',
      examples: [
        {
          label: 'The recording table',
          code: `connection.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations ("
    " version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
)
connection.commit()`,
        },
        {
          label: 'One migration, one transaction',
          code: `connection.execute("BEGIN")
try:
    for statement in script.split(";"):
        if statement.strip():
            connection.execute(statement)
    connection.execute("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", (version, now))
    connection.execute("COMMIT")
except Exception:
    connection.execute("ROLLBACK")
    raise`,
        },
      ],
      hints: [
        'Sort the migration files by name so 001 runs before 002.',
        'The version is the filename without `.sql` — use `path.stem`.',
        'Record the version in the same transaction as the DDL, or a crash leaves an applied-but-unrecorded schema.',
        'Commit the `schema_migrations` table creation before starting per-migration transactions.',
      ],
      checks: [
        { id: 'uses-schema-migrations', type: 'fileContains', file: 'ledger/db.py', pattern: 'schema_migrations', mode: 'string' },
        { id: 'migration-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_db.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `import sqlite3
from datetime import datetime, timezone
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def connect(db_path):
    # The HTTP handler runs in its own thread; SQLite still serialises writes.
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _split_statements(script):
    # These migrations are plain DDL: no semicolons inside string literals.
    return [part.strip() for part in script.split(";") if part.strip()]


def apply_migrations(connection, migrations_dir=MIGRATIONS_DIR):
    connection.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        " version TEXT PRIMARY KEY,"
        " applied_at TEXT NOT NULL)"
    )
    connection.commit()

    applied = {
        row["version"]
        for row in connection.execute("SELECT version FROM schema_migrations")
    }
    applied_now = []

    for path in sorted(Path(migrations_dir).glob("*.sql")):
        version = path.stem
        if version in applied:
            continue

        connection.execute("BEGIN")
        try:
            for statement in _split_statements(path.read_text(encoding="utf-8")):
                connection.execute(statement)
            connection.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (version, datetime.now(timezone.utc).isoformat()),
            )
            connection.execute("COMMIT")
        except Exception:
            connection.execute("ROLLBACK")
            raise

        applied_now.append(version)

    return applied_now
`,
    },
    {
      id: 'ledger-2-schema',
      title: 'Evolve the schema safely',
      file: 'migrations/002_add_idempotency.sql',
      task: 'Create `migrations/002_add_idempotency.sql`: add an `idempotency_key` column to `entries`, a partial unique index so a key can never be used twice (but NULL keys are fine), and an index for reading one account’s history newest-first. Run `python -m unittest discover -s tests -p "test_schema.py"`.',
      examples: [
        {
          label: 'Add the column',
          code: 'ALTER TABLE entries ADD COLUMN idempotency_key TEXT;',
        },
        {
          label: 'The constraints',
          code: `CREATE UNIQUE INDEX entries_idempotency_key_unique
  ON entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX entries_account_id_id_index
  ON entries (account_id, id DESC);`,
        },
      ],
      hints: [
        'A migration is append-only: edit a new file, never 001_init.sql.',
        'SQLite unique indexes allow many NULLs, so the WHERE clause is about clarity and size — but it also documents the rule.',
        'The account index should match the query order: account first, then id descending.',
      ],
      checks: [
        { id: 'adds-column', type: 'fileContains', file: 'migrations/002_add_idempotency.sql', pattern: 'ADD COLUMN idempotency_key', mode: 'string' },
        { id: 'unique-index', type: 'fileContains', file: 'migrations/002_add_idempotency.sql', pattern: 'CREATE UNIQUE INDEX', mode: 'string' },
        { id: 'schema-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_schema.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `ALTER TABLE entries ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX entries_idempotency_key_unique
  ON entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX entries_account_id_id_index
  ON entries (account_id, id DESC);
`,
    },
    {
      id: 'ledger-3-accounts',
      title: 'Create accounts with validation',
      file: 'ledger/store.py',
      task: 'Implement `create_account` and `get_account`. Trim the name, reject blanks, non-text, and anything over 80 characters, stamp `createdAt` in UTC, and raise `NotFoundError` for an unknown id. Return plain dicts with camelCase keys (`id`, `name`, `createdAt`) so the API layer can serialise them directly. Run `python -m unittest discover -s tests -p "test_accounts.py"`.',
      examples: [
        {
          label: 'The insert',
          code: `with connection:
    cursor = connection.execute(
        "INSERT INTO accounts (name, created_at) VALUES (?, ?)",
        (name, datetime.now(timezone.utc).isoformat()),
    )
return get_account(connection, cursor.lastrowid)`,
        },
        {
          label: 'The lookup',
          code: `row = connection.execute(
    "SELECT id, name, created_at FROM accounts WHERE id = ?", (account_id,)
).fetchone()
if row is None:
    raise NotFoundError("account not found")
return {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}`,
        },
      ],
      hints: [
        '`?` placeholders are what stop SQL injection — never build SQL with `+` or an f-string.',
        '`cursor.lastrowid` is the id SQLite assigned to your insert.',
        'Converting the sqlite3.Row into a dict at the store boundary keeps HTTP code free of database details.',
        'Validate before you insert; a rejected request must not touch the database.',
      ],
      checks: [
        { id: 'parameterised-insert', type: 'fileContains', file: 'ledger/store.py', pattern: 'VALUES (?, ?)', mode: 'string' },
        { id: 'account-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_accounts.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `from datetime import datetime, timezone


class ValidationError(Exception):
    status = 400


class NotFoundError(Exception):
    status = 404


class ConflictError(Exception):
    status = 409


def _now():
    return datetime.now(timezone.utc).isoformat()


def create_account(connection, name):
    if not isinstance(name, str) or not name.strip():
        raise ValidationError("name is required")
    name = name.strip()
    if len(name) > 80:
        raise ValidationError("names are limited to 80 characters")

    with connection:
        cursor = connection.execute(
            "INSERT INTO accounts (name, created_at) VALUES (?, ?)", (name, _now())
        )
    return get_account(connection, cursor.lastrowid)


def get_account(connection, account_id):
    row = connection.execute(
        "SELECT id, name, created_at FROM accounts WHERE id = ?", (account_id,)
    ).fetchone()
    if row is None:
        raise NotFoundError("account not found")
    return {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}
`,
    },
    {
      id: 'ledger-4-entries',
      title: 'Record money with idempotency keys',
      file: 'ledger/store.py',
      task: 'Add `record_entry(connection, account_id, amount_cents, memo="", idempotency_key=None)`. Money must be a non-zero integer (cents), the account must exist, and a repeated idempotency key must return the original entry — unless the amount or memo differs, which is a `ConflictError`. Let the unique index win the race. Run `python -m unittest discover -s tests -p "test_entries.py"`.',
      examples: [
        {
          label: 'Replay the first write',
          code: `existing = connection.execute(
    "SELECT * FROM entries WHERE idempotency_key = ?", (key,)
).fetchone()
if existing is not None:
    if existing["amount_cents"] != amount_cents or existing["memo"] != memo:
        raise ConflictError("this idempotency key was used for a different entry")
    return get_entry(connection, existing["id"])`,
        },
        {
          label: 'Catch the race',
          code: `try:
    with connection:
        cursor = connection.execute("INSERT INTO entries ...", values)
except sqlite3.IntegrityError:
    existing = connection.execute(
        "SELECT id FROM entries WHERE idempotency_key = ?", (key,)
    ).fetchone()
    if existing is not None:
        return get_entry(connection, existing["id"])
    raise`,
        },
      ],
      hints: [
        '`True` is an `int` in Python — reject booleans explicitly before checking the amount.',
        'Store the amount exactly as an integer; 12.50 becomes 1250 cents anywhere in the stack.',
        'Do the replay lookup before inserting, and handle `sqlite3.IntegrityError` for concurrent retries.',
        '`get_entry` should return only the public columns, not the idempotency key.',
      ],
      checks: [
        { id: 'uses-integrity-error', type: 'fileContains', file: 'ledger/store.py', pattern: 'IntegrityError', mode: 'string' },
        { id: 'entry-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_entries.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `import sqlite3
from datetime import datetime, timezone


class ValidationError(Exception):
    status = 400


class NotFoundError(Exception):
    status = 404


class ConflictError(Exception):
    status = 409


def _now():
    return datetime.now(timezone.utc).isoformat()


def _whole_number(value, label):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationError(label + " must be a whole number")
    return value


def create_account(connection, name):
    if not isinstance(name, str) or not name.strip():
        raise ValidationError("name is required")
    name = name.strip()
    if len(name) > 80:
        raise ValidationError("names are limited to 80 characters")

    with connection:
        cursor = connection.execute(
            "INSERT INTO accounts (name, created_at) VALUES (?, ?)", (name, _now())
        )
    return get_account(connection, cursor.lastrowid)


def get_account(connection, account_id):
    row = connection.execute(
        "SELECT id, name, created_at FROM accounts WHERE id = ?", (account_id,)
    ).fetchone()
    if row is None:
        raise NotFoundError("account not found")
    return {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}


def get_entry(connection, entry_id):
    row = connection.execute(
        "SELECT id, account_id, amount_cents, memo, created_at FROM entries WHERE id = ?",
        (entry_id,),
    ).fetchone()
    if row is None:
        raise NotFoundError("entry not found")
    return {
        "id": row["id"],
        "accountId": row["account_id"],
        "amountCents": row["amount_cents"],
        "memo": row["memo"],
        "createdAt": row["created_at"],
    }


def record_entry(connection, account_id, amount_cents, memo="", idempotency_key=None):
    account_id = _whole_number(account_id, "accountId")
    amount_cents = _whole_number(amount_cents, "amountCents")
    if amount_cents == 0:
        raise ValidationError("amountCents must not be zero")
    if abs(amount_cents) > 100000000:
        raise ValidationError("amountCents is out of range")
    if not isinstance(memo, str):
        raise ValidationError("memo must be text")
    memo = memo.strip()
    if len(memo) > 140:
        raise ValidationError("memo is limited to 140 characters")
    get_account(connection, account_id)

    key = None
    if idempotency_key is not None:
        if not isinstance(idempotency_key, str) or not idempotency_key.strip():
            raise ValidationError("idempotencyKey must be a non-empty string")
        key = idempotency_key.strip()
        if len(key) > 64:
            raise ValidationError("idempotencyKey is limited to 64 characters")

        existing = connection.execute(
            "SELECT * FROM entries WHERE idempotency_key = ?", (key,)
        ).fetchone()
        if existing is not None:
            if (
                existing["account_id"] != account_id
                or existing["amount_cents"] != amount_cents
                or existing["memo"] != memo
            ):
                raise ConflictError("this idempotency key was used for a different entry")
            return get_entry(connection, existing["id"])

    try:
        with connection:
            cursor = connection.execute(
                "INSERT INTO entries"
                " (account_id, amount_cents, memo, idempotency_key, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (account_id, amount_cents, memo, key, _now()),
            )
    except sqlite3.IntegrityError:
        existing = connection.execute(
            "SELECT * FROM entries WHERE idempotency_key = ?", (key,)
        ).fetchone()
        if (
            existing is not None
            and existing["account_id"] == account_id
            and existing["amount_cents"] == amount_cents
            and existing["memo"] == memo
        ):
            return get_entry(connection, existing["id"])
        raise ConflictError("this idempotency key was used for a different entry")

    return get_entry(connection, cursor.lastrowid)
`,
    },
    {
      id: 'ledger-5-reporting',
      title: 'Balance and keyset pagination',
      file: 'ledger/store.py',
      task: 'Add `balance_cents(connection, account_id)` using `SUM` in SQL (not in Python), and `list_entries(connection, account_id, limit=20, after=None)`. Page newest-first with `WHERE id < after`, return `{ items, nextCursor }`, and reject a limit outside 1–50. Run `python -m unittest discover -s tests -p "test_reporting.py"`.',
      examples: [
        {
          label: 'Let SQL do the maths',
          code: `row = connection.execute(
    "SELECT COALESCE(SUM(amount_cents), 0) AS balance"
    " FROM entries WHERE account_id = ?",
    (account_id,),
).fetchone()
return int(row["balance"])`,
        },
        {
          label: 'The cursor page',
          code: `rows = connection.execute(
    "SELECT id, account_id, amount_cents, memo, created_at FROM entries"
    " WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT ?",
    (account_id, after, limit),
).fetchall()
items = [dict(row) for row in rows]
next_cursor = items[-1]["id"] if len(items) == limit else None`,
        },
      ],
      hints: [
        '“Newest first” is `ORDER BY id DESC`, so the next page is `id < cursor`.',
        'Return the last id you sent as `nextCursor`; when the page is short, there is no next page.',
        'COALESCE turns SQL’s NULL sum for an empty account into 0.',
        'A cursor is stable when rows are inserted later; `OFFSET` would shift the page and skip rows.',
      ],
      checks: [
        { id: 'sum-in-sql', type: 'fileContains', file: 'ledger/store.py', pattern: 'SUM(amount_cents)', mode: 'string' },
        { id: 'reporting-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_reporting.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `import sqlite3
from datetime import datetime, timezone


class ValidationError(Exception):
    status = 400


class NotFoundError(Exception):
    status = 404


class ConflictError(Exception):
    status = 409


def _now():
    return datetime.now(timezone.utc).isoformat()


def _whole_number(value, label):
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationError(label + " must be a whole number")
    return value


def create_account(connection, name):
    if not isinstance(name, str) or not name.strip():
        raise ValidationError("name is required")
    name = name.strip()
    if len(name) > 80:
        raise ValidationError("names are limited to 80 characters")

    with connection:
        cursor = connection.execute(
            "INSERT INTO accounts (name, created_at) VALUES (?, ?)", (name, _now())
        )
    return get_account(connection, cursor.lastrowid)


def get_account(connection, account_id):
    row = connection.execute(
        "SELECT id, name, created_at FROM accounts WHERE id = ?", (account_id,)
    ).fetchone()
    if row is None:
        raise NotFoundError("account not found")
    return {"id": row["id"], "name": row["name"], "createdAt": row["created_at"]}


def get_entry(connection, entry_id):
    row = connection.execute(
        "SELECT id, account_id, amount_cents, memo, created_at FROM entries WHERE id = ?",
        (entry_id,),
    ).fetchone()
    if row is None:
        raise NotFoundError("entry not found")
    return {
        "id": row["id"],
        "accountId": row["account_id"],
        "amountCents": row["amount_cents"],
        "memo": row["memo"],
        "createdAt": row["created_at"],
    }


def record_entry(connection, account_id, amount_cents, memo="", idempotency_key=None):
    account_id = _whole_number(account_id, "accountId")
    amount_cents = _whole_number(amount_cents, "amountCents")
    if amount_cents == 0:
        raise ValidationError("amountCents must not be zero")
    if abs(amount_cents) > 100000000:
        raise ValidationError("amountCents is out of range")
    if not isinstance(memo, str):
        raise ValidationError("memo must be text")
    memo = memo.strip()
    if len(memo) > 140:
        raise ValidationError("memo is limited to 140 characters")
    get_account(connection, account_id)

    key = None
    if idempotency_key is not None:
        if not isinstance(idempotency_key, str) or not idempotency_key.strip():
            raise ValidationError("idempotencyKey must be a non-empty string")
        key = idempotency_key.strip()
        if len(key) > 64:
            raise ValidationError("idempotencyKey is limited to 64 characters")

        existing = connection.execute(
            "SELECT * FROM entries WHERE idempotency_key = ?", (key,)
        ).fetchone()
        if existing is not None:
            if (
                existing["account_id"] != account_id
                or existing["amount_cents"] != amount_cents
                or existing["memo"] != memo
            ):
                raise ConflictError("this idempotency key was used for a different entry")
            return get_entry(connection, existing["id"])

    try:
        with connection:
            cursor = connection.execute(
                "INSERT INTO entries"
                " (account_id, amount_cents, memo, idempotency_key, created_at)"
                " VALUES (?, ?, ?, ?, ?)",
                (account_id, amount_cents, memo, key, _now()),
            )
    except sqlite3.IntegrityError:
        existing = connection.execute(
            "SELECT * FROM entries WHERE idempotency_key = ?", (key,)
        ).fetchone()
        if (
            existing is not None
            and existing["account_id"] == account_id
            and existing["amount_cents"] == amount_cents
            and existing["memo"] == memo
        ):
            return get_entry(connection, existing["id"])
        raise ConflictError("this idempotency key was used for a different entry")

    return get_entry(connection, cursor.lastrowid)


def balance_cents(connection, account_id):
    account_id = _whole_number(account_id, "accountId")
    get_account(connection, account_id)
    row = connection.execute(
        "SELECT COALESCE(SUM(amount_cents), 0) AS balance"
        " FROM entries WHERE account_id = ?",
        (account_id,),
    ).fetchone()
    return int(row["balance"])


def list_entries(connection, account_id, limit=20, after=None):
    account_id = _whole_number(account_id, "accountId")
    get_account(connection, account_id)
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > 50:
        raise ValidationError("limit must be a whole number from 1 to 50")

    columns = "SELECT id, account_id, amount_cents, memo, created_at FROM entries"
    if after is None:
        rows = connection.execute(
            columns + " WHERE account_id = ? ORDER BY id DESC LIMIT ?",
            (account_id, limit),
        ).fetchall()
    else:
        after = _whole_number(after, "after")
        rows = connection.execute(
            columns + " WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT ?",
            (account_id, after, limit),
        ).fetchall()

    items = [dict(row) for row in rows]
    next_cursor = items[-1]["id"] if len(items) == limit else None
    return {"items": items, "nextCursor": next_cursor}
`,
    },
    {
      id: 'ledger-6-api',
      title: 'Expose the ledger over HTTP',
      file: 'ledger/api.py',
      task: 'Build the handler and `create_server`: `POST /accounts`, `GET /accounts/<id>/balance`, `POST /accounts/<id>/entries`, `GET /accounts/<id>/entries?limit=&after=`. Map `ValidationError → 400`, `NotFoundError → 404`, `ConflictError → 409`, parse JSON bodies, and answer unknown routes with a JSON 404. Run `python -m unittest discover -s tests -p "test_api.py"`.',
      examples: [
        {
          label: 'One response helper',
          code: `body = json.dumps(payload).encode("utf-8")
self.send_response(status)
self.send_header("content-type", "application/json; charset=utf-8")
self.send_header("content-length", str(len(body)))
self.end_headers()
self.wfile.write(body)`,
        },
        {
          label: 'Map domain errors once',
          code: `status = getattr(error, "status", 500)
message = "something went wrong" if status == 500 else str(error)
self._send(status, {"error": message})`,
        },
      ],
      hints: [
        'Subclass `BaseHTTPRequestHandler` and implement `do_GET` and `do_POST`.',
        '`urlsplit(self.path)` separates the path from the query string; `parse_qs` turns `limit=2` into a list.',
        'Path ids arrive as strings — convert them and let a bad value become a 400.',
        '`ThreadingHTTPServer(("127.0.0.1", 0), Handler)` picks a free port, which is what the tests need.',
      ],
      checks: [
        { id: 'threading-server', type: 'fileContains', file: 'ledger/api.py', pattern: 'ThreadingHTTPServer', mode: 'string' },
        { id: 'api-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_api.py" 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from .store import (
    ConflictError,
    NotFoundError,
    ValidationError,
    balance_cents,
    create_account,
    list_entries,
    record_entry,
)


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def create_server(connection, host="127.0.0.1", port=0):
    handler = make_handler(connection)
    return ThreadingHTTPServer((host, port), handler)


def make_handler(connection):
    class Handler(BaseHTTPRequestHandler):
        server_version = "Ledger/1.0"

        def log_message(self, format, *args):
            return

        def _send(self, status, payload):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("content-type", "application/json; charset=utf-8")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _body(self):
            try:
                length = int(self.headers.get("content-length") or 0)
            except ValueError:
                raise HttpError(400, "invalid content-length")
            raw = self.rfile.read(length) if length else b""
            if not raw.strip():
                raise HttpError(400, "request body is required")
            try:
                return json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise HttpError(400, "request body must be valid JSON")

        def _whole(self, value):
            try:
                return int(value)
            except (TypeError, ValueError):
                raise ValidationError("expected a whole number")

        def _fail(self, error):
            status = getattr(error, "status", 500) or 500
            message = "something went wrong" if status == 500 else str(error)
            self._send(status, {"error": message})

        def do_GET(self):
            try:
                parts = [part for part in urlsplit(self.path).path.split("/") if part]
                query = parse_qs(urlsplit(self.path).query)

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "balance":
                    account_id = self._whole(parts[1])
                    self._send(
                        200,
                        {"accountId": account_id, "balanceCents": balance_cents(connection, account_id)},
                    )
                    return

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "entries":
                    account_id = self._whole(parts[1])
                    limit = self._whole(query.get("limit", ["20"])[0])
                    after = self._whole(query["after"][0]) if "after" in query else None
                    self._send(200, list_entries(connection, account_id, limit=limit, after=after))
                    return

                raise HttpError(404, "not found")
            except Exception as error:
                self._fail(error)

        def do_POST(self):
            try:
                parts = [part for part in urlsplit(self.path).path.split("/") if part]

                if parts == ["accounts"]:
                    body = self._body()
                    if not isinstance(body, dict):
                        raise ValidationError("send a JSON object")
                    self._send(201, create_account(connection, body.get("name")))
                    return

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "entries":
                    body = self._body()
                    if not isinstance(body, dict):
                        raise ValidationError("send a JSON object")
                    entry = record_entry(
                        connection,
                        self._whole(parts[1]),
                        body.get("amountCents"),
                        body.get("memo", ""),
                        body.get("idempotencyKey"),
                    )
                    self._send(201, entry)
                    return

                raise HttpError(404, "not found")
            except Exception as error:
                self._fail(error)

    return Handler
`,
    },
    {
      id: 'ledger-7-hardening',
      title: 'Close the API’s doors',
      file: 'ledger/api.py',
      task: 'Harden the handler: require `application/json` (`415`), cap bodies at 16 KB (`413`), send `x-content-type-options: nosniff` on every response, and make sure errors never include SQL or a traceback. Run the whole suite — `python -m unittest discover -s tests` — when the security tests pass.',
      examples: [
        {
          label: 'Check before you read',
          code: `content_type = (self.headers.get("content-type") or "").lower()
if not content_type.startswith("application/json"):
    raise HttpError(415, "send application/json")
length = int(self.headers.get("content-length") or 0)
if length > MAX_BODY_BYTES:
    raise HttpError(413, "request body is too large")`,
        },
        {
          label: 'Never leak internals',
          code: `status = getattr(error, "status", 500) or 500
message = "something went wrong" if status == 500 else str(error)
self._send(status, {"error": message})`,
        },
      ],
      hints: [
        'A 500 message is a fixed string — stack traces and SQL belong in your logs, not the response.',
        'JSON content types legitimately carry a charset: use `startswith`, not equality.',
        'The body cap is a byte limit, checked from Content-Length before reading.',
        'Only 4xx messages come from the exception; unexpected exceptions all collapse to the same text.',
      ],
      checks: [
        { id: 'body-cap', type: 'fileContains', file: 'ledger/api.py', pattern: 'MAX_BODY_BYTES', mode: 'string' },
        { id: 'nosniff', type: 'fileContains', file: 'ledger/api.py', pattern: 'nosniff', mode: 'string' },
        { id: 'security-tests', type: 'runCommand', command: 'python -m unittest discover -s tests -p "test_api_security.py" 2>&1', expect: 'OK', match: 'contains' },
        { id: 'full-suite', type: 'runCommand', command: 'python -m unittest discover -s tests 2>&1', expect: 'OK', match: 'contains' },
      ],
      solution: `import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from .store import (
    ConflictError,
    NotFoundError,
    ValidationError,
    balance_cents,
    create_account,
    list_entries,
    record_entry,
)

MAX_BODY_BYTES = 16 * 1024


class HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def create_server(connection, host="127.0.0.1", port=0):
    handler = make_handler(connection)
    return ThreadingHTTPServer((host, port), handler)


def make_handler(connection):
    class Handler(BaseHTTPRequestHandler):
        server_version = "Ledger/1.0"

        def log_message(self, format, *args):
            return

        def _send(self, status, payload):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("content-type", "application/json; charset=utf-8")
            self.send_header("content-length", str(len(body)))
            self.send_header("x-content-type-options", "nosniff")
            self.end_headers()
            self.wfile.write(body)

        def _body(self):
            content_type = (self.headers.get("content-type") or "").lower()
            if not content_type.startswith("application/json"):
                raise HttpError(415, "send application/json")
            try:
                length = int(self.headers.get("content-length") or 0)
            except ValueError:
                raise HttpError(400, "invalid content-length")
            if length > MAX_BODY_BYTES:
                raise HttpError(413, "request body is too large")

            raw = self.rfile.read(length) if length else b""
            if not raw.strip():
                raise HttpError(400, "request body is required")
            try:
                return json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise HttpError(400, "request body must be valid JSON")

        def _whole(self, value):
            try:
                return int(value)
            except (TypeError, ValueError):
                raise ValidationError("expected a whole number")

        def _fail(self, error):
            status = getattr(error, "status", 500) or 500
            message = "something went wrong" if status == 500 else str(error)
            self._send(status, {"error": message})

        def do_GET(self):
            try:
                parts = [part for part in urlsplit(self.path).path.split("/") if part]
                query = parse_qs(urlsplit(self.path).query)

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "balance":
                    account_id = self._whole(parts[1])
                    self._send(
                        200,
                        {"accountId": account_id, "balanceCents": balance_cents(connection, account_id)},
                    )
                    return

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "entries":
                    account_id = self._whole(parts[1])
                    limit = self._whole(query.get("limit", ["20"])[0])
                    after = self._whole(query["after"][0]) if "after" in query else None
                    self._send(200, list_entries(connection, account_id, limit=limit, after=after))
                    return

                raise HttpError(404, "not found")
            except Exception as error:
                self._fail(error)

        def do_POST(self):
            try:
                parts = [part for part in urlsplit(self.path).path.split("/") if part]

                if parts == ["accounts"]:
                    body = self._body()
                    if not isinstance(body, dict):
                        raise ValidationError("send a JSON object")
                    self._send(201, create_account(connection, body.get("name")))
                    return

                if len(parts) == 3 and parts[0] == "accounts" and parts[2] == "entries":
                    body = self._body()
                    if not isinstance(body, dict):
                        raise ValidationError("send a JSON object")
                    entry = record_entry(
                        connection,
                        self._whole(parts[1]),
                        body.get("amountCents"),
                        body.get("memo", ""),
                        body.get("idempotencyKey"),
                    )
                    self._send(201, entry)
                    return

                raise HttpError(404, "not found")
            except Exception as error:
                self._fail(error)

    return Handler
`,
    },
  ],
  reflectionPrompt: 'Why does the database enforce the idempotency rule instead of the application, and why is a cursor safer than OFFSET when new entries arrive?',
};

export default ledger;
