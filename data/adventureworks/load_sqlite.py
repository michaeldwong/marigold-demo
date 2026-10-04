"""Load the AdventureWorks OLTP sample data into a local SQLite database.

Reads table definitions and file formats from raw/instawdb.sql (Microsoft's
install script) so delimiters and column order match the source exactly.

Usage: python3 load_sqlite.py   ->  writes adventureworks.db next to this file
"""
import re
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw"
DB = HERE / "adventureworks.db"

INT_TYPES = {"int", "smallint", "tinyint", "bit", "bigint"}
REAL_TYPES = {"decimal", "numeric", "money", "smallmoney", "float", "real"}
BINARY_TYPES = {"hierarchyid", "varbinary", "geography"}


def parse_tables(sql):
    """Return {table: (schema, [(column, sql_type), ...])}.

    Computed columns (`[X] AS expr`) get type "computed". Some data files include
    their values and some don't, so the loader decides per file.
    """
    tables = {}
    for m in re.finditer(r"CREATE TABLE \[(\w+)\]\.\[(\w+)\]\((.*?)\n\) ON", sql, re.S):
        schema, table, body = m.groups()
        cols = []
        for line in body.splitlines():
            if re.match(r"\s*\[\w+\]\s+AS\b", line):
                cols.append((re.match(r"\s*\[(\w+)\]", line).group(1), "computed"))
                continue
            cm = re.match(r"\s*\[(\w+)\]\s+(?:\[(\w+)\]|(\w+))", line)
            if cm:
                cols.append((cm.group(1), (cm.group(2) or cm.group(3)).lower()))
        tables[table] = (schema, cols)
    return tables


def split_rows(data, field_term, row_term, n_all, n_stored):
    """Yield field lists, rejoining rows whose text fields contain embedded newlines."""
    if field_term == b"+|":
        # These files actually end rows with "&|" (the trailing newline is optional).
        lines = [l.lstrip(b"\r\n") for l in data.split(b"&|")]
    else:
        lines = data.split(row_term)
    pending = None
    for line in lines:
        if pending is None and not line.strip(b"\r\n"):
            continue
        pending = line if pending is None else pending + b"\n" + line
        fields = pending.rstrip(b"\r").split(field_term)
        if len(fields) >= min(n_all, n_stored):
            yield fields
            pending = None


def parse_bulk_inserts(sql):
    """Return {table: (csv_name, field_terminator, row_terminator)}."""
    loads = {}
    pattern = r"BULK INSERT \[\w+\]\.\[(\w+)\] FROM '\$\(SqlSamplesSourceDataPath\)(\w+\.csv)'\s*WITH\s*\((.*?)\)"
    for m in re.finditer(pattern, sql, re.S):
        table, csv_name, opts = m.groups()
        field = re.search(r"FIELDTERMINATOR\s*=\s*'([^']*)'", opts).group(1)
        row = re.search(r"ROWTERMINATOR\s*=\s*'([^']*)'", opts).group(1)
        unescape = lambda t: t.replace("\\t", "\t").replace("\\n", "\n").replace("0x0a", "\n")
        loads[table] = (csv_name, unescape(field).encode(), unescape(row).encode())
    return loads


def convert(raw, sql_type):
    if raw == b"":
        return None
    if sql_type in BINARY_TYPES:
        return raw.hex()
    text = raw.decode("utf-8", errors="replace").strip()
    if sql_type == "computed":
        for cast in (int, float):
            try:
                return cast(text)
            except ValueError:
                pass
    if sql_type in INT_TYPES:
        return int(text)
    if sql_type in REAL_TYPES:
        return float(text)
    return text


def sqlite_type(sql_type):
    if sql_type in INT_TYPES:
        return "INTEGER"
    if sql_type in REAL_TYPES:
        return "REAL"
    if sql_type == "computed":
        return "NUMERIC"
    return "TEXT"


def main():
    sql = (RAW / "instawdb.sql").read_text(encoding="utf-8-sig", errors="replace")
    tables = parse_tables(sql)
    loads = parse_bulk_inserts(sql)

    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    con.execute("CREATE TABLE _tables (name TEXT PRIMARY KEY, schema TEXT, row_count INTEGER)")

    for table, (csv_name, field_term, row_term) in sorted(loads.items()):
        schema, all_cols = tables[table]
        stored_cols = [c for c in all_cols if c[1] != "computed"]
        data = (RAW / csv_name).read_bytes()
        if data.startswith(b"\xef\xbb\xbf"):
            data = data[3:]
        rows, bad, cols = [], 0, None
        for fields in split_rows(data, field_term, row_term, len(all_cols), len(stored_cols)):
            if cols is None:
                cols = all_cols if len(fields) == len(all_cols) else stored_cols
            if len(fields) != len(cols):
                bad += 1
                continue
            rows.append([convert(f, t) for f, (_, t) in zip(fields, cols)])
        cols = cols or stored_cols

        col_defs = ", ".join(f'"{c}" {sqlite_type(t)}' for c, t in cols)
        con.execute(f'CREATE TABLE "{table}" ({col_defs})')
        con.executemany(f'INSERT INTO "{table}" VALUES ({", ".join("?" * len(cols))})', rows)
        con.execute("INSERT INTO _tables VALUES (?, ?, ?)", (table, schema, len(rows)))
        print(f"{schema}.{table}: {len(rows)} rows" + (f"  ({bad} malformed rows skipped)" if bad else ""))

    con.commit()
    con.close()
    print(f"\nWrote {DB}")


if __name__ == "__main__":
    main()
