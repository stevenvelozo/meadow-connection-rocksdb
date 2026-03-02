# Meadow RocksDB Provider - Limitations

RocksDB is an embedded key-value store, not a relational database. The Meadow RocksDB provider implements the standard Meadow CRUD interface with an in-memory filter engine that processes FoxHound filter arrays directly. This document describes what is fully supported, what is not, and the performance characteristics you should expect.

## Fully Supported

### CRUD Operations
- **Create** with auto-increment integer IDs (`AutoIdentity`)
- **Create** with auto-generated GUIDs (`AutoGUID`)
- **Read** single record by ID or GUID (direct key lookup)
- **Read** multiple records with filtering (`doReads`)
- **Update** single or multiple records
- **Delete** with soft-delete tracking (`Deleted` flag, `DeleteDate`, `DeletingIDUser`)
- **Undelete** soft-deleted records
- **Count** with optional filters

### Sentinel Values
- `$$AUTOINCREMENT` - resolved at storage time via atomic counter
- `$$AUTOGUID` - resolved via `fable.getUUID()`
- `$$NOW` - resolved to `new Date().toISOString()`

### Schema Type Handling
- `AutoIdentity` - auto-increment on create
- `AutoGUID` - auto-generate on create
- `CreateDate` / `UpdateDate` - automatic timestamps
- `CreateIDUser` / `UpdateIDUser` - automatic user ID stamping
- `Deleted` / `DeleteDate` / `DeleteIDUser` - soft-delete tracking

### Filter Operators
| Operator | Example | Notes |
|----------|---------|-------|
| `=` | `addFilter('Name', 'Fido')` | Loose equality (type coercion) |
| `!=` | `addFilter('Type', 'Cat', '!=')` | Loose inequality |
| `>` | `addFilter('IDAnimal', 5, '>')` | Greater than |
| `>=` | `addFilter('IDAnimal', 5, '>=')` | Greater than or equal |
| `<` | `addFilter('IDAnimal', 5, '<')` | Less than |
| `<=` | `addFilter('IDAnimal', 5, '<=')` | Less than or equal |
| `LIKE` | `addFilter('Name', '%Red%', 'LIKE')` | SQL-style wildcards, case-insensitive |
| `IN` | `addFilter('Type', ['Dog','Cat'], 'IN')` | Value in array |
| `NOT IN` | `addFilter('Type', ['Dog','Cat'], 'NOT IN')` | Value not in array |
| `IS NULL` | `addFilter('Name', null, 'IS NULL')` | Null or undefined |
| `IS NOT NULL` | `addFilter('Name', null, 'IS NOT NULL')` | Not null and not undefined |

### Filter Logic
- **AND** connector between filters (default)
- **OR** connector between filters
- **Parenthetical grouping** of filter conditions (stack-based processing)
- **Automatic `Deleted = 0` filter** unless `disableDeleteTracking` is set

### Sorting
- Sort by one or more columns
- Ascending and Descending directions
- Multi-column sort with priority ordering

### Pagination
- **`setBegin(n)`** - skip the first `n` records
- **`setCap(n)`** - limit results to `n` records
- Applied after filtering and sorting

### Other
- Multiple entity scopes in a single RocksDB database (each scope has its own key prefix)
- Configurable key mode: GUID (default) or ID
- `disableDeleteTracking` - bypass soft-delete filter
- `disableAutoIdentity` - manually set identity values
- `disableAutoDateStamp` - manually set date values
- `disableAutoUserStamp` - manually set user ID values

## Not Supported (Key-Value Store Limitations)

### JOINs
No cross-entity joins. Each entity scope is fully independent in RocksDB. If you need to combine data from multiple entity types, you must perform separate reads and merge results in application code.

### Subqueries
Not available. All filtering operates on a single entity scope at a time.

### Aggregations
No `SUM`, `AVG`, `MIN`, `MAX`, or `GROUP BY`. Only `COUNT` is supported (via `doCount`). For other aggregations, read the records and compute in application code.

### DISTINCT
Not supported in Count operations. `doCount` returns the total number of matching records including duplicates.

### Stored Procedures / Triggers
Not available. RocksDB is a simple key-value store with no server-side logic.

### Transactions Across Entities
Batch writes are atomic within a single RocksDB batch operation (e.g., updating multiple records of the same entity in one `doUpdate` call), but there is no cross-scope transaction isolation. Operations on different entity types are independent.

### Schema Enforcement
No DDL (CREATE TABLE, ALTER TABLE, etc.). Records are stored as schema-less JSON. Schema is enforced only by Meadow's marshalling layer. You can store any fields you want in a record regardless of the schema definition.

### Raw Query Override
The `queryOverride` mechanism used by some SQL providers is not applicable to RocksDB. The provider processes filter arrays directly rather than generating query strings.

### FoxHound Dialect
No FoxHound dialect is used or needed. The provider processes `pQuery.parameters.filter`, `pQuery.parameters.sort`, `pQuery.parameters.begin`, and `pQuery.parameters.cap` directly with an in-memory engine.

## Performance Characteristics

### All Filtering is Post-Scan
Every `doReads`, `doCount`, `doUpdate`, `doDelete`, and `doUndelete` operation scans **all records** for the entity scope using a RocksDB prefix iterator, then filters the results in memory. This is efficient for small-to-medium datasets (hundreds to tens of thousands of records per scope) but will degrade for very large datasets with highly selective filters.

### No Secondary Indexes
Queries cannot use indexes on arbitrary columns. Only the primary key (GUID or ID) supports direct lookup via `doRead` with a filter on the identity column.

### Direct Key Lookup is O(1)
Reading a single record by its exact ID or GUID (via `doRead` with an identity filter) is a direct RocksDB `get` operation, which is extremely fast regardless of dataset size.

### Sorting is In-Memory
All sort operations load matching records into memory first, then sort using `Array.prototype.sort()`. Large result sets will consume proportional memory.

### Pagination Efficiency
Pagination (`setBegin`/`setCap`) is applied after filtering and sorting. Unlike SQL databases that can optimize `LIMIT`/`OFFSET` with indexes, the RocksDB provider must still scan, filter, and sort all matching records before applying pagination. For large datasets, this means pagination does not reduce the scan cost.

### Record Ordering
Without an explicit sort, records are returned in RocksDB key order. In GUID mode, this means records come back in GUID alphabetical order (effectively random relative to insertion order). In ID mode, records come back in numeric ID order (assuming zero-padded or consistently sized IDs). Always add an explicit sort if you need deterministic ordering.

### Write Performance
Individual writes (`doCreate`, `doUpdate`) go through RocksDB's `put` operation. Batch updates (multiple records matched by a filter) use RocksDB's atomic `batch` operation for efficiency. RocksDB is optimized for write-heavy workloads with its LSM-tree architecture.

### Storage
Records are stored as JSON strings. RocksDB handles compression internally (using Snappy by default). The database is stored on the local filesystem at the configured `RocksDBFolder` path.

## Configuration

```javascript
{
    RocksDB: {
        RocksDBFolder: './data/rocksdb',  // Database folder path (required)
        KeyMode: 'GUID',                  // 'GUID' (default) or 'ID'
        GlobalLogLevel: 0                 // Log verbosity (0 = off)
    }
}
```

### Key Format

| Mode | Key Format | Example |
|------|-----------|---------|
| **GUID (default)** | `M-E-{Scope}-{GUID}` | `M-E-Book-7857a368-11c8-4d96-903b-2ac734c9cb88` |
| **ID** | `M-EBI-{Scope}-{ID}` | `M-EBI-Animal-8675309` |
| **Sequence counter** | `M-SEQ-{Scope}` | `M-SEQ-Book` |

Even entities with GUIDs in their schema can be stored by ID if `KeyMode: 'ID'` is set in the configuration.

## When to Use RocksDB vs SQL

**Use RocksDB when:**
- You need fast, embedded local storage without a database server
- Your workload is primarily key-based lookups and simple filtered scans
- Dataset sizes per entity are in the thousands to low tens of thousands
- You want minimal infrastructure (no database server to manage)
- Write throughput is important (RocksDB's LSM-tree excels here)

**Use SQL when:**
- You need JOINs across entity types
- You need aggregations (SUM, AVG, GROUP BY)
- You have very large datasets that need indexed queries
- You need transaction isolation across multiple entity operations
- You need the full power of SQL query syntax
