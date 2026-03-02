# connectAsync(fCallback)

Open a connection to the RocksDB database at the configured folder path.

## Signature

```javascript
connectAsync(fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | Yes | Callback receiving `(error, database)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `error` | Error \| null | Error object if connection failed, null on success |
| `database` | object \| undefined | The RocksDB database instance on success |

## Behavior

1. Validates that `RocksDBFolder` is configured (from Fable settings or constructor options)
2. Guards against double-connect -- if already connected, calls back with existing database
3. Opens the RocksDB database with `createIfMissing: true`
4. Sets `this.connected = true` on success
5. Logs connection events through the Fable logging system

## Basic Usage

```javascript
const libFable = require('fable');
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');

let _Fable = new libFable(
	{
		"RocksDB":
		{
			"RocksDBFolder": "./data/myapp-rocksdb"
		}
	});

_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		console.log('Connected:', _Fable.MeadowRocksDBProvider.connected);
		// => Connected: true

		// pDatabase is the same as _Fable.MeadowRocksDBProvider.db
		pDatabase.put('hello', 'world', (pPutError) =>
		{
			console.log('Write complete');
		});
	});
```

## Error Handling

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			// Common errors:
			// - RocksDBFolder not configured
			// - Permission denied on folder path
			// - Corrupt database files
			_Fable.log.error(`Connection failed: ${pError.message}`);
			process.exit(1);
		}

		// Safe to use database here
	});
```

## Double-Connect Safety

Calling `connectAsync()` when already connected is safe. The provider logs an error message but calls back with the existing database instance:

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		// First connect succeeds
		_Fable.MeadowRocksDBProvider.connectAsync(
			(pError2, pDatabase2) =>
			{
				// pDatabase2 is the same instance as pDatabase
				// An error is logged but no exception is thrown
			});
	});
```

## Per-Instance Configuration

Override the folder path for a specific provider instance:

```javascript
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider',
	{
		RocksDBFolder: './data/secondary-db'
	});

_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		// Connected to ./data/secondary-db instead of the default
	});
```

## Related

- [closeAsync](closeAsync.md) -- Close the database connection
- [db](db.md) -- Access the raw RocksDB instance
- [connect](connect.md) -- Synchronous convenience wrapper
