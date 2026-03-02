# Architectural Design

## Overview

Meadow Connection RocksDB sits between a Fable application and the RocksDB embedded storage engine. It follows the same Fable service provider pattern used by all Meadow connection modules (SQLite, MySQL, MSSQL), ensuring a consistent integration interface across the ecosystem.

Unlike SQL-based connectors, RocksDB is a key-value store. There is no query language, no tables, and no schema enforcement at the storage level. All data organization, filtering, and query logic happens in the Meadow provider layer above this connection module.

---

## System Architecture

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 580" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">
  <!-- Background -->
  <rect width="720" height="580" fill="#fff"/>

  <!-- Fable Application Layer -->
  <rect x="60" y="20" width="600" height="90" rx="8" fill="#F5F0E8" stroke="#B5AA9A" stroke-width="1.5"/>
  <text x="360" y="48" text-anchor="middle" font-size="15" font-weight="bold" fill="#423D37">Fable Application</text>
  <text x="160" y="75" text-anchor="middle" font-size="12" fill="#6B6358">fable.settings.RocksDB</text>
  <text x="360" y="75" text-anchor="middle" font-size="12" fill="#6B6358">fable.serviceManager</text>
  <text x="540" y="75" text-anchor="middle" font-size="12" fill="#6B6358">fable.log</text>
  <rect x="105" y="85" width="110" height="18" rx="3" fill="#E8E2D8" stroke="#B5AA9A" stroke-width="0.5"/>
  <text x="160" y="97" text-anchor="middle" font-size="10" fill="#6B6358">RocksDBFolder</text>

  <!-- Arrow down -->
  <line x1="360" y1="110" x2="360" y2="140" stroke="#2E7D74" stroke-width="2" marker-end="url(#arrowhead)"/>
  <text x="430" y="130" font-size="11" fill="#2E7D74">connectAsync()</text>

  <!-- Connection Service Layer -->
  <rect x="120" y="145" width="480" height="120" rx="8" fill="#E8F5F3" stroke="#2E7D74" stroke-width="2"/>
  <text x="360" y="173" text-anchor="middle" font-size="15" font-weight="bold" fill="#2E7D74">MeadowConnectionRocksDB</text>
  <text x="360" y="193" text-anchor="middle" font-size="11" fill="#6B6358">Fable Service Provider (fable-serviceproviderbase)</text>

  <!-- Properties -->
  <rect x="145" y="207" width="100" height="24" rx="4" fill="#fff" stroke="#2E7D74" stroke-width="1"/>
  <text x="195" y="223" text-anchor="middle" font-size="11" fill="#2E7D74">.connected</text>

  <rect x="260" y="207" width="70" height="24" rx="4" fill="#fff" stroke="#2E7D74" stroke-width="1"/>
  <text x="295" y="223" text-anchor="middle" font-size="11" fill="#2E7D74">.db</text>

  <rect x="345" y="207" width="110" height="24" rx="4" fill="#fff" stroke="#2E7D74" stroke-width="1"/>
  <text x="400" y="223" text-anchor="middle" font-size="11" fill="#2E7D74">connectAsync()</text>

  <rect x="470" y="207" width="105" height="24" rx="4" fill="#fff" stroke="#2E7D74" stroke-width="1"/>
  <text x="523" y="223" text-anchor="middle" font-size="11" fill="#2E7D74">closeAsync()</text>

  <text x="360" y="255" text-anchor="middle" font-size="11" fill="#6B6358">serviceType: 'MeadowConnectionRocksDB'</text>

  <!-- Arrow down -->
  <line x1="360" y1="265" x2="360" y2="295" stroke="#6B6358" stroke-width="2" marker-end="url(#arrowhead)"/>
  <text x="430" y="285" font-size="11" fill="#6B6358">.db getter</text>

  <!-- RocksDB Native Layer -->
  <rect x="120" y="300" width="480" height="110" rx="8" fill="#FFF8F0" stroke="#D4A574" stroke-width="1.5"/>
  <text x="360" y="328" text-anchor="middle" font-size="15" font-weight="bold" fill="#8B6914">rocksdb (LevelDOWN Binding)</text>
  <text x="360" y="348" text-anchor="middle" font-size="11" fill="#6B6358">Native C++ addon wrapping Facebook's RocksDB engine</text>

  <!-- RocksDB Operations -->
  <rect x="145" y="362" width="80" height="22" rx="3" fill="#fff" stroke="#D4A574" stroke-width="1"/>
  <text x="185" y="377" text-anchor="middle" font-size="11" fill="#8B6914">put()</text>

  <rect x="240" y="362" width="80" height="22" rx="3" fill="#fff" stroke="#D4A574" stroke-width="1"/>
  <text x="280" y="377" text-anchor="middle" font-size="11" fill="#8B6914">get()</text>

  <rect x="335" y="362" width="80" height="22" rx="3" fill="#fff" stroke="#D4A574" stroke-width="1"/>
  <text x="375" y="377" text-anchor="middle" font-size="11" fill="#8B6914">del()</text>

  <rect x="430" y="362" width="80" height="22" rx="3" fill="#fff" stroke="#D4A574" stroke-width="1"/>
  <text x="470" y="377" text-anchor="middle" font-size="11" fill="#8B6914">batch()</text>

  <rect x="287" y="392" width="105" height="22" rx="3" fill="#fff" stroke="#D4A574" stroke-width="1"/>
  <text x="340" y="407" text-anchor="middle" font-size="11" fill="#8B6914">iterator()</text>

  <!-- Arrow down -->
  <line x1="360" y1="410" x2="360" y2="440" stroke="#6B6358" stroke-width="2" marker-end="url(#arrowhead)"/>

  <!-- File System Layer -->
  <rect x="180" y="445" width="360" height="55" rx="8" fill="#F0F0F0" stroke="#999" stroke-width="1"/>
  <text x="360" y="473" text-anchor="middle" font-size="14" font-weight="bold" fill="#555">Local File System</text>
  <text x="360" y="491" text-anchor="middle" font-size="11" fill="#777">./data/myapp-rocksdb/ (SST files, WAL, MANIFEST)</text>

  <!-- Meadow Provider (side note) -->
  <rect x="60" y="520" width="600" height="45" rx="6" fill="#F8F4FF" stroke="#9B7DC8" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="360" y="543" text-anchor="middle" font-size="12" fill="#7B5DA8">Meadow-Provider-RocksDB.js (in meadow module) uses this connection for ORM operations</text>
  <text x="360" y="558" text-anchor="middle" font-size="11" fill="#9B7DC8">doCreate / doRead / doReads / doUpdate / doDelete / doUndelete / doCount</text>

  <!-- Arrow defs -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#6B6358"/>
    </marker>
  </defs>
</svg>

---

## Component Responsibilities

### Connection Service (`meadow-connection-rocksdb`)

This module has a single, focused responsibility: **manage the RocksDB database handle lifecycle**.

| Responsibility | Details |
|---------------|---------|
| Open database | Creates the folder if missing, opens with `createIfMissing: true` |
| Expose handle | Provides the raw RocksDB instance via the `db` getter |
| Close database | Flushes pending writes and releases file locks |
| Guard state | Prevents double-connect, logs warnings for no-callback calls |
| Integrate | Registers as a Fable service with logging and configuration |

The connection service does **not** handle serialization, key design, filtering, sorting, pagination, or any query logic. Those responsibilities belong to the Meadow provider layer.

### Meadow Provider (`Meadow-Provider-RocksDB.js`)

The Meadow provider (separate module, lives in `meadow/source/providers/`) builds on this connection to provide full ORM semantics:

| Responsibility | Details |
|---------------|---------|
| Key generation | `M-E-{Scope}-{GUID}` or `M-EBI-{Scope}-{ID}` |
| Auto-increment | Atomic counter at `M-SEQ-{Scope}` |
| CRUD operations | Create, Read, Update, Delete, Undelete, Count |
| Filter engine | In-memory evaluation of FoxHound filter arrays |
| Sorting | In-memory multi-column sort |
| Pagination | Skip and limit after filter and sort |
| Soft delete | Deleted flag tracking with timestamps and user IDs |
| Sentinel values | `$$AUTOINCREMENT`, `$$AUTOGUID`, `$$NOW` |

---

## Key Design

The Meadow provider organizes records in RocksDB using structured key prefixes:

```
Key Format (GUID mode, default):    M-E-{Scope}-{GUID}
Key Format (ID mode):               M-EBI-{Scope}-{ID}
Sequence counter:                   M-SEQ-{Scope}
```

### Examples

```
M-E-Animal-7857a368-11c8-4d96-903b-2ac734c9cb88    <- Animal record (GUID key)
M-E-Animal-a1b2c3d4-5678-9012-abcd-ef0123456789    <- Another Animal
M-E-Book-ff00aa11-2233-4455-6677-8899aabbccdd       <- Book record (different scope)
M-EBI-Session-42                                    <- Session record (ID key)
M-SEQ-Animal                                        <- Auto-increment counter for Animal
M-SEQ-Book                                          <- Auto-increment counter for Book
```

### Why Prefix-Based Keys?

RocksDB stores keys in sorted order. By prefixing keys with the entity scope, all records of a given type are stored contiguously. This enables efficient prefix scanning:

```javascript
// Scan all Animal records
let tmpIterator = db.iterator({
	gte: 'M-E-Animal-',
	lt: 'M-E-Animal-\uffff'
});
```

This range query hits only Animal records, skipping all Book, Session, and other entity types entirely.

---

## Data Flow

### Write Path (Create)

```
Application
  -> meadow.doCreate(query)
    -> Meadow-Provider-RocksDB.Create()
      -> getNextSequence() [atomic counter increment]
      -> buildRecordKey() [M-E-Animal-{GUID}]
      -> JSON.stringify(document)
      -> db.put(key, value, callback)
        -> RocksDB LSM-tree write
          -> WAL (Write-Ahead Log)
          -> MemTable
          -> Background flush to SST files
```

### Read Path (Read with filters)

```
Application
  -> meadow.doReads(query)
    -> Meadow-Provider-RocksDB.Read()
      -> buildScanPrefix() [M-E-Animal-]
      -> scanPrefix() [iterator gte/lt]
        -> RocksDB sorted iteration
      -> evaluateFilterArray() [in-memory filter]
      -> applySort() [in-memory sort]
      -> applyPagination() [slice]
      -> callback(records)
```

---

## Storage Architecture

RocksDB uses a Log-Structured Merge-tree (LSM-tree) architecture:

```
Write Flow:
  put() -> WAL (crash safety) -> MemTable (in-memory) -> Flush -> SST files (on disk)

Read Flow:
  get() -> MemTable -> L0 SST files -> L1 SST files -> ... -> LN SST files

Background:
  Compaction merges SST files, removes tombstones, reduces read amplification
```

### File Structure

```
data/myapp-rocksdb/
  CURRENT              <- Points to current MANIFEST
  IDENTITY             <- Database identity
  LOCK                 <- File lock (prevents concurrent access)
  LOG                  <- RocksDB internal log
  MANIFEST-000001      <- Database metadata and version history
  000003.log           <- Write-Ahead Log
  000004.sst           <- Sorted String Table (data file)
  000005.sst           <- Additional data file
```

### Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Put (single key) | O(1) amortized | Writes to MemTable + WAL |
| Get (single key) | O(log N) | Searches MemTable then SST levels |
| Delete (single key) | O(1) amortized | Writes a tombstone marker |
| Prefix scan | O(K) | K = number of keys with that prefix |
| Batch write | O(N) | N operations applied atomically |

---

## Comparison with Other Meadow Connectors

| Feature | RocksDB | SQLite | MySQL | MSSQL |
|---------|---------|--------|-------|-------|
| Server required | No | No | Yes | Yes |
| Query language | None (key-value) | SQL | SQL | SQL |
| JOINs | No | Yes | Yes | Yes |
| Aggregations | Count only | Full SQL | Full SQL | Full SQL |
| Write throughput | Very high | High | Medium | Medium |
| Read by key | O(1) | O(log N) | O(log N) | O(log N) |
| Concurrent access | Single process | Single process (WAL) | Multi-process | Multi-process |
| Filtering | In-memory post-scan | SQL WHERE | SQL WHERE | SQL WHERE |
| Secondary indexes | No | Yes | Yes | Yes |
| Schema enforcement | None (JSON blobs) | DDL | DDL | DDL |
