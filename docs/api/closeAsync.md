# closeAsync(fCallback)

Close the RocksDB database, flush pending writes, and release file locks.

## Signature

```javascript
closeAsync(fCallback)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fCallback` | function | No | Callback receiving `(error)` |

## Callback Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `error` | Error \| undefined | Error object if close failed, undefined on success |

## Behavior

1. If not connected or no database handle exists, calls back immediately (safe no-op)
2. Closes the underlying RocksDB database handle
3. Flushes any pending writes to disk
4. Releases the file lock (allowing another process to open the database)
5. Sets `this.connected = false`
6. Sets `this._database = false`

## Basic Usage

```javascript
_Fable.MeadowRocksDBProvider.closeAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('Error closing database:', pError);
			return;
		}

		console.log('Connected:', _Fable.MeadowRocksDBProvider.connected);
		// => Connected: false

		console.log('Database:', _Fable.MeadowRocksDBProvider.db);
		// => false
	});
```

## Safe Multiple Calls

Calling `closeAsync()` when already closed is safe -- no error is thrown:

```javascript
_Fable.MeadowRocksDBProvider.closeAsync(() =>
{
	// First close succeeds

	_Fable.MeadowRocksDBProvider.closeAsync(() =>
	{
		// Second close is a no-op, no error
	});
});
```

## Application Shutdown

Use `closeAsync()` during graceful shutdown to ensure all data is flushed:

```javascript
process.on('SIGINT', () =>
{
	_Fable.MeadowRocksDBProvider.closeAsync((pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`Shutdown error: ${pError.message}`);
		}
		_Fable.log.info('Database closed, exiting');
		process.exit(0);
	});
});
```

## Without Callback

If no callback is provided, `closeAsync()` uses a no-op function internally:

```javascript
// Safe, but you won't know when close completes
_Fable.MeadowRocksDBProvider.closeAsync();
```

## Related

- [connectAsync](connectAsync.md) -- Open the database connection
- [db](db.md) -- Access the raw RocksDB instance (returns false after close)
