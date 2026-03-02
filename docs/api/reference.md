# API Reference

## Class: MeadowConnectionRocksDB

Extends `fable-serviceproviderbase`. Manages a connection to a RocksDB database folder through the rocksdb LevelDOWN binding.

### Constructor

```javascript
new MeadowConnectionRocksDB(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFable` | object | A Fable instance |
| `pManifest` | object | Service manifest / options (optional) |
| `pServiceHash` | string | Service identifier |

On construction:

- Sets `serviceType` to `'MeadowConnectionRocksDB'`
- Sets `connected` to `false`
- Reads `RocksDBFolder` from `fable.settings.RocksDB` if available

The provider is not yet connected after construction -- call `connectAsync()` to open the database.

---

## Properties

### connected

Whether the database connection is open.

**Type:** `boolean`

```javascript
console.log(_Fable.MeadowRocksDBProvider.connected);
// => false (before connect)
// => true  (after connect)
```

### db

The raw RocksDB database instance. Use this for all key-value operations. Returns `false` before `connectAsync()` is called.

**Type:** `object | false`

```javascript
let tmpDB = _Fable.MeadowRocksDBProvider.db;

// Asynchronous operations from the rocksdb LevelDOWN API:
tmpDB.put(key, value, callback);       // Write a key-value pair
tmpDB.get(key, callback);              // Read a value by key
tmpDB.del(key, callback);              // Delete a key
tmpDB.batch(operations, callback);     // Atomic batch write
tmpDB.iterator(options);               // Create a prefix iterator
```

### serviceType

Always `'MeadowConnectionRocksDB'`.

**Type:** `string`

---

## Methods

### connectAsync(fCallback)

Open a connection to the RocksDB database folder specified in configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | function | Callback: `(error, database)` |

**Behavior:**

- If `RocksDBFolder` is not configured, calls back with an error
- If already connected, calls back immediately with the existing database (idempotent)
- Creates the database folder if it does not exist (`createIfMissing: true`)
- Sets `this.connected = true` on success

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		// pDatabase is the same as _Fable.MeadowRocksDBProvider.db
		pDatabase.put('test', 'value', (pPutError) =>
		{
			console.log('Write complete');
		});
	});
```

### connect()

Synchronous wrapper that calls `connectAsync()` without a callback. Logs an error about potential race conditions. Prefer `connectAsync()`.

### closeAsync(fCallback)

Close the RocksDB database, flush pending writes, and release file locks.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | function | Callback: `(error)` |

**Behavior:**

- If not connected or no database, calls back immediately (safe to call multiple times)
- Closes the underlying RocksDB handle
- Sets `this.connected = false`
- Sets `this._database = false`

```javascript
_Fable.MeadowRocksDBProvider.closeAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('Close error:', pError);
			return;
		}

		console.log(_Fable.MeadowRocksDBProvider.connected);
		// => false
	});
```

---

## Configuration

### Fable Settings

```json
{
	"RocksDB":
	{
		"RocksDBFolder": "./data/myapp-rocksdb"
	}
}
```

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `RocksDBFolder` | string | Yes | Path to the RocksDB database folder |

### Provider Options

Configuration can also be passed directly to the service provider constructor:

```javascript
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider',
	{
		RocksDBFolder: './data/alternate-db'
	});
```

Constructor options override Fable settings, allowing multiple providers with different configurations.

---

## Service Registration

The provider integrates with Fable's service manager:

```javascript
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');

// Register the service type
_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);

// Instantiate (optionally with per-instance options)
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider',
	{
		RocksDBFolder: './data/alternate-db'
	});

// Access the provider
_Fable.MeadowRocksDBProvider.connectAsync((pError) => { /* ... */ });
```

---

## RocksDB LevelDOWN API

After connecting, all key-value operations go through the `db` getter. Here is a reference for the rocksdb methods:

### Put

```javascript
tmpDB.put('key', 'value', (pError) =>
{
	if (pError) { console.error('Put failed:', pError); }
});
```

Writes a key-value pair. Both key and value can be strings or Buffers.

### Get

```javascript
tmpDB.get('key', (pError, pValue) =>
{
	if (pError)
	{
		// pError.notFound === true if key does not exist
		console.error('Get failed:', pError);
		return;
	}
	console.log(pValue.toString());
});
```

Reads a value by key. Returns a Buffer by default; call `.toString()` to get a string.

### Delete

```javascript
tmpDB.del('key', (pError) =>
{
	if (pError) { console.error('Delete failed:', pError); }
});
```

Removes a key-value pair. No error if the key does not exist.

### Batch

```javascript
tmpDB.batch(
	[
		{ type: 'put', key: 'k1', value: 'v1' },
		{ type: 'put', key: 'k2', value: 'v2' },
		{ type: 'del', key: 'k3' }
	],
	(pError) =>
	{
		if (pError) { console.error('Batch failed:', pError); }
	});
```

Applies multiple operations atomically. If the batch fails, no operations are applied.

### Iterator

```javascript
let tmpIterator = tmpDB.iterator(
	{
		gte: 'prefix-',            // Start key (inclusive)
		lt: 'prefix-\uffff',       // End key (exclusive)
		keyAsBuffer: false,
		valueAsBuffer: false
	});

function readNext()
{
	tmpIterator.next((pError, pKey, pValue) =>
	{
		if (pError || pKey === undefined)
		{
			tmpIterator.end(() => { /* done */ });
			return;
		}

		console.log(pKey, '=>', pValue);
		readNext();
	});
}
readNext();
```

Creates a sorted key iterator bounded by `gte` (inclusive) and `lt` (exclusive). Keys are returned in lexicographic order.

---

## Logging

The provider logs connection events through the Fable logging system:

| Event | Level | Message |
|-------|-------|---------|
| Connecting | `info` | `Meadow-Connection-RocksDB connecting to folder [path].` |
| Connected | `info` | `Meadow-Connection-RocksDB successfully connected to RocksDB folder [path].` |
| Already connected | `error` | `...is already connected - skipping the second connect call.` |
| Missing path | `error` | `...database folder path is invalid; RocksDBFolder must be in either...` |
| Connection error | `error` | `...error connecting to RocksDB folder [path]: [error]` |
| Open error | `error` | `...error opening database at [path]: [error]` |
| Close error | `error` | `...error closing database: [error]` |
| No callback | `error` | `...connect() called without a callback...` |

---

## Known Limitations

- **Single process** -- RocksDB does not support concurrent access from multiple processes. Use a single application instance per database folder, or use a SQL database if multi-process access is required.
- **No query language** -- All filtering, sorting, and aggregation must happen in application code or through the Meadow provider layer.
- **Native compilation** -- The `rocksdb` npm package requires a C++ compiler at install time, which may not be available in all environments.
- **Callback-based** -- All operations use Node.js-style callbacks, not Promises. Wrap in `util.promisify()` if you need async/await support.
