# Quick Start

This guide walks you through setting up a RocksDB connection, performing basic key-value operations, and integrating with the Meadow ORM in under five minutes.

---

## Standalone Connection

### Install

```bash
npm install meadow-connection-rocksdb fable
```

### Configure and Connect

```javascript
const libFable = require('fable');
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');

let _Fable = new libFable(
	{
		"Product": "QuickStartApp",
		"RocksDB":
		{
			"RocksDBFolder": "./data/quickstart-db"
		}
	});

// Register the service type and instantiate
_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

// Connect
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		console.log('Connected:', _Fable.MeadowRocksDBProvider.connected);
		// => Connected: true

		let tmpDB = _Fable.MeadowRocksDBProvider.db;

		// Your RocksDB operations go here...
	});
```

---

## Basic Key-Value Operations

All RocksDB operations use Node.js-style callbacks: `(error, result)`.

### Put / Get / Delete

```javascript
let tmpDB = _Fable.MeadowRocksDBProvider.db;

// Store a value
tmpDB.put('greeting', 'Hello, RocksDB!', (pError) =>
{
	if (pError) { console.error(pError); return; }

	// Retrieve the value
	tmpDB.get('greeting', (pGetError, pValue) =>
	{
		console.log(pValue.toString());
		// => 'Hello, RocksDB!'

		// Delete the key
		tmpDB.del('greeting', (pDelError) =>
		{
			console.log('Key deleted');
		});
	});
});
```

### Storing JSON Objects

RocksDB stores binary data. Serialize objects to JSON strings:

```javascript
let tmpRecord = { name: 'Alice', email: 'alice@example.com', age: 30 };

tmpDB.put('user:1', JSON.stringify(tmpRecord), (pError) =>
{
	tmpDB.get('user:1', (pGetError, pValue) =>
	{
		let tmpUser = JSON.parse(pValue.toString());
		console.log(tmpUser.name);
		// => 'Alice'
	});
});
```

---

## Batch Operations

Group multiple writes into a single atomic operation:

```javascript
tmpDB.batch(
	[
		{ type: 'put', key: 'user:1', value: JSON.stringify({ name: 'Alice' }) },
		{ type: 'put', key: 'user:2', value: JSON.stringify({ name: 'Bob' }) },
		{ type: 'put', key: 'user:3', value: JSON.stringify({ name: 'Charlie' }) },
		{ type: 'del', key: 'user:old' }
	],
	(pError) =>
	{
		if (pError) { console.error(pError); return; }
		console.log('Batch complete -- all operations applied atomically');
	});
```

If the batch fails, none of the operations are applied.

---

## Prefix Iteration

Scan all keys sharing a common prefix using RocksDB's sorted key iterator:

```javascript
let tmpPrefix = 'user:';
let tmpIterator = tmpDB.iterator(
	{
		gte: tmpPrefix,
		lt: tmpPrefix + '\uffff',
		keyAsBuffer: false,
		valueAsBuffer: false
	});

function readNext()
{
	tmpIterator.next((pError, pKey, pValue) =>
	{
		if (pError || pKey === undefined)
		{
			// End of iteration
			tmpIterator.end(() =>
			{
				console.log('Scan complete');
			});
			return;
		}

		let tmpRecord = JSON.parse(pValue);
		console.log(`${pKey} => ${tmpRecord.name}`);
		readNext();
	});
}
readNext();
```

Output:

```
user:1 => Alice
user:2 => Bob
user:3 => Charlie
Scan complete
```

---

## Meadow ORM Integration

The connection provider is designed to work with Meadow's RocksDB provider for full ORM capabilities:

```javascript
const libFable = require('fable');
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');
const libMeadow = require('meadow');

let _Fable = new libFable(
	{
		"RocksDB":
		{
			"RocksDBFolder": "./data/meadow-rocksdb"
		}
	});

_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

_Fable.MeadowRocksDBProvider.connectAsync((pError) =>
{
	if (pError) { console.error(pError); return; }

	let tmpAnimalMeadow = libMeadow.new(_Fable, 'Animal')
		.setProvider('RocksDB')
		.setDefaultIdentifier('IDAnimal')
		.setSchema(
			[
				{ Column: 'IDAnimal', Type: 'AutoIdentity' },
				{ Column: 'GUIDAnimal', Type: 'AutoGUID' },
				{ Column: 'Name', Type: 'String' },
				{ Column: 'Type', Type: 'String' },
				{ Column: 'CreateDate', Type: 'CreateDate' },
				{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
				{ Column: 'UpdateDate', Type: 'UpdateDate' },
				{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
				{ Column: 'Deleted', Type: 'Deleted' },
				{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
				{ Column: 'DeleteDate', Type: 'DeleteDate' }
			])
		.setDefault(
			{
				IDAnimal: null,
				GUIDAnimal: '',
				Name: 'Unknown',
				Type: 'Unclassified',
				CreateDate: false,
				CreatingIDUser: 0,
				UpdateDate: false,
				UpdatingIDUser: 0,
				Deleted: 0,
				DeletingIDUser: 0,
				DeleteDate: false
			});

	// Create a record
	let tmpQuery = tmpAnimalMeadow.query.clone()
		.addRecord({ Name: 'Fido', Type: 'Dog' });

	tmpAnimalMeadow.doCreate(tmpQuery,
		(pCreateError, pQuery, pQueryRead, pRecord) =>
		{
			console.log('Created:', pRecord.Name, '(ID:', pRecord.IDAnimal + ')');
			// => Created: Fido (ID: 1)
		});
});
```

See the [Full Pipeline](examples-pipeline.md) example for a complete CRUD walkthrough with the Meadow ORM.

---

## Closing the Connection

When your application shuts down, close the database to flush pending writes:

```javascript
_Fable.MeadowRocksDBProvider.closeAsync((pError) =>
{
	if (pError)
	{
		console.error('Error closing:', pError);
	}
	console.log('Database closed');
});
```
