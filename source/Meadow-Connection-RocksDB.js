/**
* Meadow RocksDB Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libRocksDB = require('rocksdb');

/*
	Configuration pattern:

	{
		"RocksDB": {
			"RocksDBFolder": "./data/rocksdb"
		}
	}
*/

class MeadowConnectionRocksDB extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionRocksDB';

		this.connected = false;
		this._database = false;

		if (this.fable.settings.hasOwnProperty('RocksDB'))
		{
			if (this.fable.settings.RocksDB.hasOwnProperty('RocksDBFolder'))
			{
				this.options.RocksDBFolder = this.fable.settings.RocksDB.RocksDBFolder;
			}
		}
	}

	connect()
	{
		this.connectAsync();
	}

	connectAsync(fCallback)
	{
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow RocksDB connect() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}

		let tmpConnectionSettings = this.options;

		if (!tmpConnectionSettings.RocksDBFolder)
		{
			this.log.error(`Meadow-Connection-RocksDB trying to connect to RocksDB but the database folder path is invalid; RocksDBFolder must be in either the fable.settings.RocksDB object or the connection provider constructor options.`, tmpConnectionSettings);
			return tmpCallback(new Error(`Meadow-Connection-RocksDB trying to connect to RocksDB but the database folder path is invalid.`));
		}

		if (this.connected)
		{
			this.log.error(`Meadow-Connection-RocksDB trying to connect to RocksDB but is already connected - skipping the second connect call.`);
			return tmpCallback(null, this._database);
		}
		else
		{
			try
			{
				this.log.info(`Meadow-Connection-RocksDB connecting to folder [${tmpConnectionSettings.RocksDBFolder}].`);
				this._database = libRocksDB(tmpConnectionSettings.RocksDBFolder);
				this._database.open({ createIfMissing: true }, (pError) =>
				{
					if (pError)
					{
						this.log.error(`Meadow-Connection-RocksDB error opening database at [${tmpConnectionSettings.RocksDBFolder}]: ${pError}`);
						return tmpCallback(pError);
					}
					this.log.info(`Meadow-Connection-RocksDB successfully connected to RocksDB folder [${tmpConnectionSettings.RocksDBFolder}].`);
					this.connected = true;
					return tmpCallback(null, this._database);
				});
			}
			catch (pError)
			{
				this.log.error(`Meadow-Connection-RocksDB error connecting to RocksDB folder [${tmpConnectionSettings.RocksDBFolder}]: ${pError}`);
				return tmpCallback(pError);
			}
		}
	}

	closeAsync(fCallback)
	{
		let tmpCallback = (typeof (fCallback) === 'function') ? fCallback : () => { };
		if (!this.connected || !this._database)
		{
			return tmpCallback();
		}
		this._database.close((pError) =>
		{
			if (pError)
			{
				this.log.error(`Meadow-Connection-RocksDB error closing database: ${pError}`);
			}
			this.connected = false;
			this._database = false;
			return tmpCallback(pError);
		});
	}

	get db()
	{
		return this._database;
	}
}

module.exports = MeadowConnectionRocksDB;
