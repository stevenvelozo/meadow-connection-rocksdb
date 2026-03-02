# Meadow Connection RocksDB <small>0</small>

> Embedded key-value database provider for the Meadow data layer

Connect any Fable application to a local RocksDB database through the service provider pattern. Built on Facebook's RocksDB engine for high-throughput writes, sorted key iteration, and atomic batch operations -- all with zero server infrastructure.

- **No Server Required** -- Embedded storage engine with no daemon process
- **Write-Optimized** -- LSM-tree architecture tuned for high-throughput write workloads
- **Prefix Scanning** -- Iterate all keys sharing a prefix using sorted key ranges
- **Atomic Batches** -- Group multiple operations into a single atomic write
- **Service Integration** -- Registers as a Fable service with dependency injection and lifecycle logging

[Quick Start](README.md)
[API Reference](api/reference.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-rocksdb)
