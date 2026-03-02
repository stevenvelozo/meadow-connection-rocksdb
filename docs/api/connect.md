# connect()

Synchronous convenience wrapper that calls `connectAsync()` without a callback.

## Signature

```javascript
connect()
```

## Parameters

None.

## Return Value

None.

## Behavior

1. Calls `connectAsync()` with no callback argument
2. `connectAsync()` detects the missing callback and logs an error warning about potential race conditions
3. An internal no-op callback is used to prevent exceptions

## Usage

```javascript
// Not recommended -- use connectAsync() instead
_Fable.MeadowRocksDBProvider.connect();

// You cannot know when the connection is ready:
// _Fable.MeadowRocksDBProvider.db may still be false here
```

## Why connectAsync() Is Preferred

The `connect()` method provides no way to know when the database is ready or if an error occurred. This can lead to race conditions where code attempts to use the database before it is open:

```javascript
// BAD -- race condition
_Fable.MeadowRocksDBProvider.connect();
let tmpDB = _Fable.MeadowRocksDBProvider.db;
// tmpDB is likely still false here

// GOOD -- callback guarantees readiness
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError) { return; }
		// Database is guaranteed to be ready here
		pDatabase.put('key', 'value', () => {});
	});
```

## When connect() Is Acceptable

The `connect()` method exists for compatibility with fire-and-forget patterns where the caller has another mechanism to detect readiness (e.g., polling `connected` in a retry loop). For most use cases, `connectAsync()` is the correct choice.

## Related

- [connectAsync](connectAsync.md) -- Preferred async connection with callback
- [closeAsync](closeAsync.md) -- Close the database connection
