# Full Pipeline Example

This walkthrough builds a complete key-value pipeline from scratch: configure Fable, connect to RocksDB, store JSON records, scan by prefix, use batch operations, and integrate with the Meadow ORM. Every snippet has been verified against meadow-connection-rocksdb.

---

## Setup

```javascript
const libFable = require('fable');
const libMeadowConnectionRocksDB = require('meadow-connection-rocksdb');

let _Fable = new libFable(
	{
		"Product": "BookstoreExample",
		"ProductVersion": "1.0.0",
		"UUID": { "DataCenter": 0, "Worker": 0 },
		"LogStreams": [{ "streamtype": "console" }],
		"RocksDB":
		{
			"RocksDBFolder": "./dist/Bookstore-RocksDB"
		}
	});

_Fable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
_Fable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');
```

---

## Step 1: Connect

```javascript
_Fable.MeadowRocksDBProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		_Fable.log.info(`Connected: ${_Fable.MeadowRocksDBProvider.connected}`);
		// => Connected: true

		let tmpDB = _Fable.MeadowRocksDBProvider.db;

		// ... all remaining steps use tmpDB ...
	});
```

The database folder is created automatically if it does not exist.

---

## Step 2: Store a JSON Record

RocksDB stores binary data. Serialize objects to JSON strings with a structured key:

```javascript
let tmpBook =
{
	title: 'The Hobbit',
	author: 'J.R.R. Tolkien',
	year: 1937,
	price: 12.99
};

tmpDB.put('book:1', JSON.stringify(tmpBook), (pError) =>
{
	if (pError) { console.error(pError); return; }
	console.log('Book stored');
});
```

---

## Step 3: Read a Record

```javascript
tmpDB.get('book:1', (pError, pValue) =>
{
	if (pError)
	{
		if (pError.notFound) { console.log('Not found'); }
		else { console.error('Get error:', pError); }
		return;
	}

	let tmpBook = JSON.parse(pValue.toString());
	console.log(`"${tmpBook.title}" by ${tmpBook.author} ($${tmpBook.price})`);
	// => "The Hobbit" by J.R.R. Tolkien ($12.99)
});
```

The `get()` callback receives a Buffer; call `.toString()` before parsing.

---

## Step 4: Batch Insert

Insert multiple records atomically:

```javascript
let tmpBooks =
[
	{ key: 'book:2', value: { title: 'Dune', author: 'Frank Herbert', year: 1965, price: 14.99 } },
	{ key: 'book:3', value: { title: 'Neuromancer', author: 'William Gibson', year: 1984, price: 11.50 } },
	{ key: 'book:4', value: { title: 'Snow Crash', author: 'Neal Stephenson', year: 1992, price: 13.99 } },
	{ key: 'book:5', value: { title: 'Foundation', author: 'Isaac Asimov', year: 1951, price: 10.99 } }
];

let tmpBatchOps = tmpBooks.map(
	(pBook) =>
	{
		return { type: 'put', key: pBook.key, value: JSON.stringify(pBook.value) };
	});

tmpDB.batch(tmpBatchOps, (pError) =>
{
	if (pError) { console.error('Batch failed:', pError); return; }
	console.log(`Inserted ${tmpBooks.length} books atomically`);
});
```

If any operation in the batch fails, none are applied.

---

## Step 5: Prefix Scan

Scan all keys starting with `book:` to list all books:

```javascript
let tmpPrefix = 'book:';
let tmpAllBooks = [];
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
			tmpIterator.end(() =>
			{
				console.log(`Found ${tmpAllBooks.length} books:`);
				for (let i = 0; i < tmpAllBooks.length; i++)
				{
					let tmpBook = tmpAllBooks[i];
					console.log(`  [${tmpBook._key}] "${tmpBook.title}" by ${tmpBook.author}`);
				}
			});
			return;
		}

		let tmpBook = JSON.parse(pValue);
		tmpBook._key = pKey;
		tmpAllBooks.push(tmpBook);
		readNext();
	});
}
readNext();
```

Output:

```
Found 5 books:
  [book:1] "The Hobbit" by J.R.R. Tolkien
  [book:2] "Dune" by Frank Herbert
  [book:3] "Neuromancer" by William Gibson
  [book:4] "Snow Crash" by Neal Stephenson
  [book:5] "Foundation" by Isaac Asimov
```

Keys are returned in sorted order, which for sequential numeric IDs means insertion order.

---

## Step 6: Update a Record

Read the current value, modify it, and write it back:

```javascript
tmpDB.get('book:2', (pError, pValue) =>
{
	if (pError) { console.error(pError); return; }

	let tmpBook = JSON.parse(pValue.toString());
	tmpBook.price = 16.99;
	tmpBook.updated = new Date().toISOString();

	tmpDB.put('book:2', JSON.stringify(tmpBook), (pPutError) =>
	{
		if (pPutError) { console.error(pPutError); return; }
		console.log(`Updated Dune price to $${tmpBook.price}`);
	});
});
```

---

## Step 7: Delete a Record

```javascript
tmpDB.del('book:3', (pError) =>
{
	if (pError) { console.error(pError); return; }
	console.log('Deleted book:3 (Neuromancer)');
});
```

After deletion, `get('book:3')` returns a `notFound` error and prefix scans skip the key.

---

## Step 8: Multiple Key Spaces

Use different prefixes to organize different entity types in the same database:

```javascript
// Store authors alongside books
let tmpAuthors =
[
	{ key: 'author:1', value: { name: 'J.R.R. Tolkien', born: 1892 } },
	{ key: 'author:2', value: { name: 'Frank Herbert', born: 1920 } },
	{ key: 'author:3', value: { name: 'Isaac Asimov', born: 1920 } }
];

let tmpAuthorOps = tmpAuthors.map(
	(pAuthor) =>
	{
		return { type: 'put', key: pAuthor.key, value: JSON.stringify(pAuthor.value) };
	});

tmpDB.batch(tmpAuthorOps, (pError) =>
{
	if (pError) { console.error(pError); return; }

	// Scan only authors -- books are untouched
	let tmpAuthorIterator = tmpDB.iterator(
		{
			gte: 'author:',
			lt: 'author:\uffff',
			keyAsBuffer: false,
			valueAsBuffer: false
		});

	// ... iterate authors without seeing any book records
});
```

This prefix-based organization is exactly how the Meadow RocksDB provider separates entity scopes.

---

## Step 9: Meadow ORM Integration

The connection provider integrates with Meadow for full ORM capabilities:

```javascript
const libMeadow = require('meadow');

let tmpBookMeadow = libMeadow.new(_Fable, 'Book')
	.setProvider('RocksDB')
	.setDefaultIdentifier('IDBook')
	.setSchema(
		[
			{ Column: 'IDBook', Type: 'AutoIdentity' },
			{ Column: 'GUIDBook', Type: 'AutoGUID' },
			{ Column: 'Title', Type: 'String' },
			{ Column: 'Author', Type: 'String' },
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
			IDBook: null,
			GUIDBook: '',
			Title: '',
			Author: '',
			CreateDate: false,
			CreatingIDUser: 0,
			UpdateDate: false,
			UpdatingIDUser: 0,
			Deleted: 0,
			DeletingIDUser: 0,
			DeleteDate: false
		});

// Create
let tmpCreateQuery = tmpBookMeadow.query.clone()
	.addRecord({ Title: 'Hyperion', Author: 'Dan Simmons' });

tmpBookMeadow.doCreate(tmpCreateQuery,
	(pError, pQuery, pQueryRead, pRecord) =>
	{
		console.log(`Created: ${pRecord.Title} (ID: ${pRecord.IDBook})`);
		// => Created: Hyperion (ID: 1)

		// Read with filter
		let tmpReadQuery = tmpBookMeadow.query
			.addFilter('Author', '%Simmons%', 'LIKE');

		tmpBookMeadow.doReads(tmpReadQuery,
			(pReadError, pReadQuery, pRecords) =>
			{
				console.log(`Found ${pRecords.length} book(s) by Simmons`);
				// => Found 1 book(s) by Simmons
			});
	});
```

---

## Step 10: Close

```javascript
_Fable.MeadowRocksDBProvider.closeAsync((pError) =>
{
	if (pError)
	{
		console.error('Close error:', pError);
		return;
	}
	console.log('Database closed');
});
```

After closing, the database folder can be reopened by a new connection or archived for backup.

---

## Pipeline Summary

| Step | Method | What It Does |
|------|--------|-------------|
| Connect | `connectAsync(cb)` | Opens the database folder, creates if missing |
| Put | `db.put(key, val, cb)` | Writes a key-value pair |
| Get | `db.get(key, cb)` | Reads a value by key, returns Buffer |
| Batch | `db.batch(ops, cb)` | Applies multiple put/del operations atomically |
| Scan | `db.iterator({ gte, lt })` | Iterates all keys in a sorted range |
| Update | `db.get()` + `db.put()` | Read-modify-write cycle |
| Delete | `db.del(key, cb)` | Removes a key-value pair |
| Close | `closeAsync(cb)` | Flushes writes, releases file lock |
