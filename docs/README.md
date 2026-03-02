# Meadow Connection RocksDB

A Fable service provider that connects applications to an embedded RocksDB database. Wraps the [rocksdb](https://www.npmjs.com/package/rocksdb) LevelDOWN binding and integrates with the Meadow data layer through Fable's dependency injection system.

RocksDB databases are stored in a local folder and require no server process. This makes them ideal for embedded applications, high-throughput write workloads, local caching, CLI tools, test suites, and any scenario where a full SQL server is unnecessary overhead but you need persistent, crash-safe storage that scales beyond what JSON files can handle.

## Install

```bash
npm install meadow-connection-rocksdb
```

Requires Node.js. The `rocksdb` dependency compiles a native addon at install time -- a C++ compiler toolchain must be available on the host.

## Quick Start

### 1. Configure Fable

Add a `RocksDB` section to your Fable configuration with the path to the database folder. The folder is created automatically if it does not exist:

```javascript
const libFable = require('fable');

let _Fable = new libFable(
	{
		"Product": "MyApp",
		"RocksDB":
		{
			"RocksDBFolder": "./data/myapp-rocksdb"
		}
	});
```

### 2. Register the Service

```javascript
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');

_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');
```

After instantiation the provider is available at `_Fable.MeadowRocksDBProvider`.

### 3. Connect

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		// Connection is ready -- database folder created automatically
		_Fable.log.info('RocksDB connected!');
	});
```

### 4. Read and Write

Access the RocksDB instance through the `db` getter:

```javascript
let tmpDB = _Fable.MeadowRocksDBProvider.db;

// Write a key-value pair
tmpDB.put('user:42', JSON.stringify({ name: 'Alice', role: 'admin' }), (pError) =>
{
	// Read it back
	tmpDB.get('user:42', (pGetError, pValue) =>
	{
		let tmpUser = JSON.parse(pValue.toString());
		console.log(tmpUser.name);  // => 'Alice'
	});
});
```

## Configuration

The provider reads `RocksDBFolder` from two sources, in order of priority:

1. **Fable settings** -- `fable.settings.RocksDB.RocksDBFolder`
2. **Constructor options** -- passed as the second argument to `instantiateServiceProvider()`

| Setting | Type | Description |
|---------|------|-------------|
| `RocksDBFolder` | string | Path to the RocksDB database folder. Created automatically if it does not exist. |

## How It Works

```
+-----------------------------+
|  Fable Application          |
|                             |
|  fable.settings.RocksDB     |
|   +-- RocksDBFolder         |
+----------+------------------+
           | connectAsync()
           v
+-----------------------------+
|  MeadowConnectionRocksDB    |
|  (Fable Service Provider)   |
|                             |
|  .connected                 |
|  .db ----------------+      |
+----------------------|------+
                       |
          +------------v------------+
          |  rocksdb (LevelDOWN)    |
          |                         |
          |  .put(key, val, cb)     |
          |  .get(key, cb)          |
          |  .del(key, cb)          |
          |  .batch(ops, cb)        |
          |  .iterator(opts)        |
          +-------------------------+
```

The provider manages the connection lifecycle and exposes the raw RocksDB database object. All operations are asynchronous with Node.js-style callbacks.

## Companion Modules

| Module | Purpose |
|--------|---------|
| [Meadow](/meadow/meadow/) | ORM and data access layer |
| [FoxHound](/meadow/foxhound/) | Query DSL and SQL generation |
| [meadow-connection-sqlite](/meadow/meadow-connection-sqlite/) | SQLite connection provider |
| [meadow-connection-mysql](/meadow/meadow-connection-mysql/) | MySQL connection provider |
| [meadow-connection-mssql](/meadow/meadow-connection-mssql/) | MSSQL connection provider |
