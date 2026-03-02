/**
* Unit tests for the Meadow Connection RocksDB module
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;

var libFS = require('fs');
var libPath = require('path');

var _RocksDBFolder = libPath.join(__dirname, '..', 'data', 'test-connection');

var libMeadowConnectionRocksDB = require('../source/Meadow-Connection-RocksDB.js');

suite
(
	'Meadow-Connection-RocksDB',
	function()
	{
		suiteSetup
		(
			function(fDone)
			{
				// Remove any previous test database
				if (libFS.existsSync(_RocksDBFolder))
				{
					libFS.rmSync(_RocksDBFolder, { recursive: true, force: true });
				}
				fDone();
			}
		);

		suite
		(
			'Object Sanity',
			function()
			{
				test
				(
					'The connection class should be a valid constructor.',
					function()
					{
						Expect(libMeadowConnectionRocksDB).to.be.a('function');
					}
				);
			}
		);

		suite
		(
			'Connection Lifecycle',
			function()
			{
				test
				(
					'Should fail to connect without a RocksDBFolder setting.',
					function(fDone)
					{
						var tmpFable = new (require('fable'))({
							LogStreams: [{ level: 'fatal', streamtype: 'process.stdout' }]
						});
						tmpFable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
						tmpFable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

						tmpFable.MeadowRocksDBProvider.connectAsync(function(pError)
						{
							Expect(pError).to.be.an('error');
							fDone();
						});
					}
				);

				test
				(
					'Should connect, put/get/delete, and close successfully.',
					function(fDone)
					{
						var tmpFable = new (require('fable'))({
							RocksDB: { RocksDBFolder: _RocksDBFolder },
							LogStreams: [{ level: 'fatal', streamtype: 'process.stdout' }]
						});
						tmpFable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
						tmpFable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

						tmpFable.MeadowRocksDBProvider.connectAsync(function(pError, pDB)
						{
							Expect(pError).to.not.exist;
							Expect(tmpFable.MeadowRocksDBProvider.connected).to.equal(true);
							Expect(tmpFable.MeadowRocksDBProvider.db).to.be.an('object');

							// Test put
							pDB.put('test-key-1', 'test-value-1', function(pPutError)
							{
								Expect(pPutError).to.not.exist;

								// Test get
								pDB.get('test-key-1', function(pGetError, pValue)
								{
									Expect(pGetError).to.not.exist;
									Expect(pValue.toString()).to.equal('test-value-1');

									// Test delete
									pDB.del('test-key-1', function(pDelError)
									{
										Expect(pDelError).to.not.exist;

										// Verify deleted
										pDB.get('test-key-1', function(pGetError2)
										{
											// Should error (not found)
											Expect(pGetError2).to.exist;

											// Test close
											tmpFable.MeadowRocksDBProvider.closeAsync(function(pCloseError)
											{
												Expect(pCloseError).to.not.exist;
												Expect(tmpFable.MeadowRocksDBProvider.connected).to.equal(false);
												fDone();
											});
										});
									});
								});
							});
						});
					}
				);

				test
				(
					'Should handle double-connect gracefully.',
					function(fDone)
					{
						var tmpFolder = libPath.join(__dirname, '..', 'data', 'test-double-connect');
						var tmpFable = new (require('fable'))({
							RocksDB: { RocksDBFolder: tmpFolder },
							LogStreams: [{ level: 'fatal', streamtype: 'process.stdout' }]
						});
						tmpFable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
						tmpFable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

						tmpFable.MeadowRocksDBProvider.connectAsync(function(pError)
						{
							Expect(pError).to.not.exist;

							// Second connect should not error
							tmpFable.MeadowRocksDBProvider.connectAsync(function(pError2)
							{
								Expect(pError2).to.not.exist;
								Expect(tmpFable.MeadowRocksDBProvider.connected).to.equal(true);

								tmpFable.MeadowRocksDBProvider.closeAsync(function()
								{
									if (libFS.existsSync(tmpFolder))
									{
										libFS.rmSync(tmpFolder, { recursive: true, force: true });
									}
									fDone();
								});
							});
						});
					}
				);

				test
				(
					'Should handle batch operations.',
					function(fDone)
					{
						var tmpFolder = libPath.join(__dirname, '..', 'data', 'test-batch');
						var tmpFable = new (require('fable'))({
							RocksDB: { RocksDBFolder: tmpFolder },
							LogStreams: [{ level: 'fatal', streamtype: 'process.stdout' }]
						});
						tmpFable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
						tmpFable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

						tmpFable.MeadowRocksDBProvider.connectAsync(function(pError, pDB)
						{
							Expect(pError).to.not.exist;

							pDB.batch([
								{ type: 'put', key: 'batch-1', value: 'val-1' },
								{ type: 'put', key: 'batch-2', value: 'val-2' },
								{ type: 'put', key: 'batch-3', value: 'val-3' }
							], function(pBatchError)
							{
								Expect(pBatchError).to.not.exist;

								pDB.get('batch-2', function(pGetError, pValue)
								{
									Expect(pGetError).to.not.exist;
									Expect(pValue.toString()).to.equal('val-2');

									tmpFable.MeadowRocksDBProvider.closeAsync(function()
									{
										if (libFS.existsSync(tmpFolder))
										{
											libFS.rmSync(tmpFolder, { recursive: true, force: true });
										}
										fDone();
									});
								});
							});
						});
					}
				);

				test
				(
					'Should support iterator prefix scanning.',
					function(fDone)
					{
						var tmpFolder = libPath.join(__dirname, '..', 'data', 'test-iter');
						var tmpFable = new (require('fable'))({
							RocksDB: { RocksDBFolder: tmpFolder },
							LogStreams: [{ level: 'fatal', streamtype: 'process.stdout' }]
						});
						tmpFable.serviceManager.addServiceType('MeadowRocksDBProvider', libMeadowConnectionRocksDB);
						tmpFable.serviceManager.instantiateServiceProvider('MeadowRocksDBProvider');

						tmpFable.MeadowRocksDBProvider.connectAsync(function(pError, pDB)
						{
							Expect(pError).to.not.exist;

							pDB.batch([
								{ type: 'put', key: 'M-E-Book-aaa', value: JSON.stringify({ Name: 'Book A' }) },
								{ type: 'put', key: 'M-E-Book-bbb', value: JSON.stringify({ Name: 'Book B' }) },
								{ type: 'put', key: 'M-E-Book-ccc', value: JSON.stringify({ Name: 'Book C' }) },
								{ type: 'put', key: 'M-E-Animal-ddd', value: JSON.stringify({ Name: 'Dog' }) }
							], function(pBatchError)
							{
								Expect(pBatchError).to.not.exist;

								// Iterate only Book records
								var tmpIterator = pDB.iterator({
									gte: 'M-E-Book-',
									lt: 'M-E-Book-\uffff'
								});
								var tmpResults = [];

								function readNext()
								{
									tmpIterator.next(function(pIterError, pKey, pValue)
									{
										if (pIterError)
										{
											return tmpIterator.end(function() { fDone(pIterError); });
										}
										if (pKey === undefined)
										{
											return tmpIterator.end(function()
											{
												Expect(tmpResults.length).to.equal(3);
												Expect(tmpResults[0].Name).to.equal('Book A');
												Expect(tmpResults[2].Name).to.equal('Book C');

												tmpFable.MeadowRocksDBProvider.closeAsync(function()
												{
													if (libFS.existsSync(tmpFolder))
													{
														libFS.rmSync(tmpFolder, { recursive: true, force: true });
													}
													fDone();
												});
											});
										}
										tmpResults.push(JSON.parse(pValue.toString()));
										readNext();
									});
								}
								readNext();
							});
						});
					}
				);
			}
		);
	}
);
