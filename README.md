# Meadow Connection RocksDB

A RocksDB embedded database connection provider for the Meadow ORM. Wraps the [rocksdb](https://www.npmjs.com/package/rocksdb) LevelDOWN binding as a Fable service, providing high-throughput key-value storage with prefix-based iteration, atomic batch writes, and automatic database creation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Embedded Key-Value Store** -- No daemon, no Docker, no server process -- just a folder path and you have a high-performance database backed by Facebook's RocksDB engine
- **LSM-Tree Architecture** -- Write-optimized storage with log-structured merge trees; excellent for write-heavy workloads with consistent read performance
- **Prefix Iteration** -- Scan all records sharing a key prefix using RocksDB's sorted key iteration with `gte`/`lt` range boundaries
- **Atomic Batch Writes** -- Group multiple put/delete operations into a single atomic batch for consistency and performance
- **Fable Service Provider** -- Registers with a Fable instance for dependency injection, logging, and configuration
- **Auto-Create Database** -- Opens with `createIfMissing: true` so the database folder is created automatically on first connect
- **Direct Database Access** -- Exposes the underlying RocksDB instance via `db` getter for native put/get/del/batch/iterator operations

## Installation

```bash
npm install meadow-connection-rocksdb
```

The `rocksdb` dependency compiles a native addon at install time -- a C++ compiler toolchain must be available on the host.

## Quick Start

```javascript
const libFable = require('fable');
const MeadowConnectionRocksDB = require('meadow-connection-rocksdb');

let fable = new libFable(
{
	RocksDB:
	{
		RocksDBFolder: './data/myapp-rocksdb'
	}
});

fable.serviceManager.addServiceType('MeadowRocksDBProvider', MeadowConnectionRocksDB);
fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

fable.MeadowRocksDBProvider.connectAsync((pError) =>
{
	if (pError)
	{
		console.error('Connection failed:', pError);
		return;
	}

	let tmpDB = fable.MeadowRocksDBProvider.db;

	// Write a value
	tmpDB.put('user:1', JSON.stringify({ name: 'Alice', age: 30 }), (pPutError) =>
	{
		// Read it back
		tmpDB.get('user:1', (pGetError, pValue) =>
		{
			let tmpUser = JSON.parse(pValue.toString());
			console.log(tmpUser.name);  // => 'Alice'
		});
	});
});
```

## Configuration

The RocksDB folder path can be provided through Fable settings or the service provider options:

### Via Fable Settings

```javascript
let fable = new libFable(
{
	RocksDB:
	{
		RocksDBFolder: './data/app-rocksdb'
	}
});
```

### Via Provider Options

```javascript
let connection = fable.instantiateServiceProvider('MeadowRocksDBProvider',
{
	RocksDBFolder: './data/app-rocksdb'
}, MeadowConnectionRocksDB);
```

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `RocksDBFolder` | string | Yes | Path to the RocksDB database folder. Created automatically if it does not exist. |

## API

### `connectAsync(fCallback)`

Open the RocksDB database at the configured folder path.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `Function` | Callback receiving `(error, database)` |

### `connect()`

Synchronous convenience wrapper for `connectAsync` (no callback, logs a warning).

### `closeAsync(fCallback)`

Close the RocksDB database and release all resources.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `Function` | Callback receiving `(error)` |

### `db` (getter)

Returns the underlying RocksDB database instance for direct key-value operations. Returns `false` before `connectAsync()` is called.

### `connected` (property)

Boolean indicating whether the database connection is open.

## RocksDB Operations

After connecting, use the `db` getter to access the RocksDB instance:

```javascript
let tmpDB = fable.MeadowRocksDBProvider.db;

// Put
tmpDB.put('key', 'value', (pError) => { /* ... */ });

// Get
tmpDB.get('key', (pError, pValue) => { console.log(pValue.toString()); });

// Delete
tmpDB.del('key', (pError) => { /* ... */ });

// Atomic Batch
tmpDB.batch([
	{ type: 'put', key: 'k1', value: 'v1' },
	{ type: 'put', key: 'k2', value: 'v2' },
	{ type: 'del', key: 'k3' }
], (pError) => { /* all operations applied atomically */ });

// Prefix Iteration
let tmpIterator = tmpDB.iterator({ gte: 'user:', lt: 'user:\uffff' });
// Iterate through all keys starting with 'user:'
```

## Part of the Retold Framework

Meadow Connection RocksDB is a database connector for the Meadow data access layer:

- [meadow](https://github.com/stevenvelozo/meadow) -- ORM and data access framework
- [foxhound](https://github.com/stevenvelozo/foxhound) -- Query DSL used by Meadow
- [stricture](https://github.com/stevenvelozo/stricture) -- Schema definition tool
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) -- RESTful endpoint generation
- [fable](https://github.com/stevenvelozo/fable) -- Application services framework

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run coverage
```

## Related Packages

- [meadow](https://github.com/stevenvelozo/meadow) -- Data access and ORM
- [meadow-connection-sqlite](https://github.com/stevenvelozo/meadow-connection-sqlite) -- SQLite connection provider
- [meadow-connection-mysql](https://github.com/stevenvelozo/meadow-connection-mysql) -- MySQL connection provider
- [fable](https://github.com/stevenvelozo/fable) -- Application services framework

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
