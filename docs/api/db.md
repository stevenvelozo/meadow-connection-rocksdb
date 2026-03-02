# db (getter)

Returns the underlying RocksDB database instance for direct key-value operations.

## Signature

```javascript
get db()
```

## Return Value

| Type | Description |
|------|-------------|
| `object` | The RocksDB database instance (after successful `connectAsync()`) |
| `false` | Before connection or after `closeAsync()` |

## Basic Usage

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError) =>
	{
		if (pError) { return; }

		let tmpDB = _Fable.MeadowRocksDBProvider.db;

		// tmpDB is the raw rocksdb LevelDOWN instance
		tmpDB.put('key', 'value', (pPutError) =>
		{
			tmpDB.get('key', (pGetError, pValue) =>
			{
				console.log(pValue.toString());
				// => 'value'
			});
		});
	});
```

## Available Operations

The RocksDB database instance exposes these methods:

### put(key, value, callback)

Write a key-value pair:

```javascript
let tmpDB = _Fable.MeadowRocksDBProvider.db;

tmpDB.put('user:1', JSON.stringify({ name: 'Alice', age: 30 }), (pError) =>
{
	if (pError) { console.error('Put failed:', pError); }
});
```

### get(key, callback)

Read a value by key:

```javascript
tmpDB.get('user:1', (pError, pValue) =>
{
	if (pError)
	{
		if (pError.notFound)
		{
			console.log('Key not found');
			return;
		}
		console.error('Get failed:', pError);
		return;
	}
	let tmpUser = JSON.parse(pValue.toString());
	console.log(tmpUser.name);
	// => 'Alice'
});
```

### del(key, callback)

Delete a key:

```javascript
tmpDB.del('user:1', (pError) =>
{
	if (pError) { console.error('Delete failed:', pError); }
});
```

### batch(operations, callback)

Execute multiple operations atomically:

```javascript
tmpDB.batch(
	[
		{ type: 'put', key: 'user:1', value: JSON.stringify({ name: 'Alice' }) },
		{ type: 'put', key: 'user:2', value: JSON.stringify({ name: 'Bob' }) },
		{ type: 'del', key: 'user:old' }
	],
	(pError) =>
	{
		// All operations applied atomically, or none if error
	});
```

### iterator(options)

Create a sorted key iterator for range queries and prefix scanning:

```javascript
let tmpIterator = tmpDB.iterator(
	{
		gte: 'user:',              // Start at 'user:' (inclusive)
		lt: 'user:\uffff',         // End before 'user:\uffff' (exclusive)
		keyAsBuffer: false,        // Return keys as strings
		valueAsBuffer: false       // Return values as strings
	});

function scanNext()
{
	tmpIterator.next((pError, pKey, pValue) =>
	{
		if (pError || pKey === undefined)
		{
			// End of range or error
			tmpIterator.end(() => { console.log('Scan complete'); });
			return;
		}

		console.log(pKey, '=>', JSON.parse(pValue));
		scanNext();
	});
}
scanNext();
```

**Iterator Options:**

| Option | Type | Description |
|--------|------|-------------|
| `gte` | string | Greater than or equal (inclusive start) |
| `gt` | string | Greater than (exclusive start) |
| `lte` | string | Less than or equal (inclusive end) |
| `lt` | string | Less than (exclusive end) |
| `reverse` | boolean | Iterate in reverse order |
| `limit` | number | Maximum number of entries to return |
| `keyAsBuffer` | boolean | Return keys as Buffers (default: true) |
| `valueAsBuffer` | boolean | Return values as Buffers (default: true) |

## Checking Connection State

Always check that the database is available before using it:

```javascript
let tmpDB = _Fable.MeadowRocksDBProvider.db;
if (!tmpDB)
{
	console.error('Database not connected');
	return;
}

// Safe to use tmpDB here
```

Or rely on the `connected` property:

```javascript
if (!_Fable.MeadowRocksDBProvider.connected)
{
	console.error('Not connected');
	return;
}

let tmpDB = _Fable.MeadowRocksDBProvider.db;
```

## Related

- [connectAsync](connectAsync.md) -- Open the database connection
- [closeAsync](closeAsync.md) -- Close the database connection
