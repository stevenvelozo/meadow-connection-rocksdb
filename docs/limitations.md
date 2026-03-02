# Limitations

RocksDB is an embedded key-value store, not a relational database. This page documents what the Meadow RocksDB stack supports, what it does not, and the performance characteristics you should expect.

---

## Fully Supported

### CRUD Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| Create | `doCreate` | Auto-increment IDs, auto-generated GUIDs, timestamp/user stamping |
| Read (single) | `doRead` | Direct key lookup by ID or GUID filter |
| Read (multiple) | `doReads` | Prefix scan with in-memory filtering, sorting, pagination |
| Update | `doUpdate` | Batch update of matched records |
| Delete | `doDelete` | Soft delete with `Deleted` flag, or hard delete |
| Undelete | `doUndelete` | Restore soft-deleted records |
| Count | `doCount` | Count with optional filters |

### Filter Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `addFilter('Name', 'Fido')` | Loose equality |
| `!=` | `addFilter('Type', 'Cat', '!=')` | Inequality |
| `>` | `addFilter('ID', 5, '>')` | Greater than |
| `>=` | `addFilter('ID', 5, '>=')` | Greater than or equal |
| `<` | `addFilter('ID', 5, '<')` | Less than |
| `<=` | `addFilter('ID', 5, '<=')` | Less than or equal |
| `LIKE` | `addFilter('Name', '%Red%', 'LIKE')` | Wildcards, case-insensitive |
| `IN` | `addFilter('Type', ['Dog','Cat'], 'IN')` | Value in array |
| `NOT IN` | `addFilter('Type', ['Dog','Cat'], 'NOT IN')` | Value not in array |
| `IS NULL` | `addFilter('Name', null, 'IS NULL')` | Null or undefined |
| `IS NOT NULL` | `addFilter('Name', null, 'IS NOT NULL')` | Not null or undefined |

### Filter Logic

- AND/OR connectors between filter conditions
- Parenthetical grouping with stack-based evaluation
- Automatic `Deleted = 0` filter (unless `disableDeleteTracking` is set)

### Sorting and Pagination

- Multi-column sort with ascending/descending directions
- Skip (`setBegin`) and limit (`setCap`) pagination

### Schema Types

- `AutoIdentity` -- auto-increment integer IDs
- `AutoGUID` -- auto-generated UUIDs
- `CreateDate` / `UpdateDate` -- automatic timestamps
- `CreateIDUser` / `UpdateIDUser` -- automatic user ID stamping
- `Deleted` / `DeleteDate` / `DeleteIDUser` -- soft-delete tracking

---

## Not Supported

### JOINs

No cross-entity joins. Each entity scope is fully independent. Combine data from multiple entity types by performing separate reads and merging in application code.

### Subqueries

Not available. All filtering operates on a single entity scope at a time.

### Aggregations

No `SUM`, `AVG`, `MIN`, `MAX`, or `GROUP BY`. Only `COUNT` is supported via `doCount`. Compute other aggregations in application code after reading records.

### DISTINCT

Not supported. `doCount` returns total matching records including duplicates.

### Stored Procedures / Triggers

Not available. RocksDB has no server-side logic layer.

### Cross-Entity Transactions

Batch writes within a single operation (e.g., updating multiple records in one `doUpdate` call) are atomic. However, there is no transaction isolation across different entity types or across separate CRUD calls.

### Schema Enforcement

No DDL. Records are stored as schema-less JSON. Schema is enforced only by Meadow's marshalling layer. Any fields can be stored regardless of schema definition.

### Secondary Indexes

RocksDB has no secondary index support. Only the primary key (GUID or ID) supports direct lookup. All other queries require a full prefix scan with in-memory filtering.

---

## Performance Characteristics

### Post-Scan Filtering

Every `doReads`, `doCount`, `doUpdate`, `doDelete`, and `doUndelete` operation scans all records for the entity scope using a RocksDB prefix iterator, then filters in memory. This is efficient for small-to-medium datasets but degrades for very large datasets with selective filters.

| Dataset Size | Expected Performance |
|-------------|---------------------|
| Hundreds | Near-instant |
| Thousands | Fast (milliseconds) |
| Tens of thousands | Acceptable (tens of milliseconds) |
| Hundreds of thousands | Slow (may require seconds) |
| Millions+ | Not recommended |

### Direct Key Lookup

Reading a single record by its exact ID or GUID (via `doRead` with an identity filter) is a direct RocksDB `get` -- O(1) amortized, extremely fast regardless of dataset size.

### Write Performance

Individual writes go through RocksDB's LSM-tree write path (WAL + MemTable), which is very fast. Batch operations via `doUpdate`/`doDelete` use atomic batches for consistency and performance.

### In-Memory Sort

All sort operations load matching records into memory. Memory usage scales linearly with the number of matching records.

### Pagination Cost

Unlike SQL databases that can optimize `LIMIT`/`OFFSET` with indexes, the RocksDB provider scans, filters, and sorts all matching records before applying pagination. Pagination reduces the returned data but not the scan cost.

### Record Ordering

Without an explicit sort, records return in RocksDB key order. In GUID mode this is effectively random. In ID mode records are ordered numerically. Always add an explicit sort for deterministic ordering.

---

## When to Use RocksDB

**Choose RocksDB when:**

- You need embedded storage with no server infrastructure
- Write throughput is a priority (LSM-tree excels here)
- Datasets per entity are in the thousands to tens of thousands
- Your workload is primarily key-based lookups and simple filtered scans
- You want a self-contained application with minimal dependencies

**Choose SQL (SQLite, MySQL, MSSQL) when:**

- You need JOINs across entity types
- You need aggregations (SUM, AVG, GROUP BY)
- You have large datasets requiring indexed queries
- You need transaction isolation across entity operations
- You need the full power of SQL query syntax
