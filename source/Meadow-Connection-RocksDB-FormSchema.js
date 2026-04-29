/**
 * Connection form schema for RocksDB.
 *
 * Consumed by meadow-connection-manager#getProviderFormSchema('RocksDB').
 * Pure data — safe to require() in any environment.  See
 * meadow-connection-mysql/source/Meadow-Connection-MySQL-FormSchema.js
 * for the field contract.
 */
'use strict';

module.exports =
{
	Provider:    'RocksDB',
	DisplayName: 'RocksDB',
	Description: 'Open or create a local RocksDB key-value store.',
	Fields:
	[
		{
			Name:        'RocksDBFolder',
			Label:       'RocksDB Folder Path',
			Type:        'Path',
			Default:     'data/rocksdb',
			Required:    true,
			Placeholder: 'data/rocksdb',
			Help:        'Directory will be created automatically if it does not exist.'
		}
	]
};
