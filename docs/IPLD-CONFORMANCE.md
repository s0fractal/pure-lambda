<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# IPLD/CAR Conformance Checklist for B2/Hex

This document outlines the minimal conformance requirements for exporting B2/Hex tile graphs as IPLD CAR files.

---

### 1. Deterministic Ordering

To ensure that identical graphs produce identical CAR files, all data must be serialized in a deterministic order.

- [ ] **Tile Properties:** Keys within a tile's data structure (e.g., `name`, `type`, `gid`, `iid`, `xid`, `code`) must be sorted alphabetically before serialization.
- [ ] **Neighbor Lists:** The list of a tile's neighbors used to compute its XID must be sorted by the neighbor's IID before hashing.
- [ ] **Operon/Graph Tile List:** When serializing a graph of multiple tiles, the list of tiles itself must be sorted alphabetically by tile name or another deterministic key.
- [ ] **IPLD Block Ordering:** Blocks within the final CAR file should be ordered deterministically, typically by sorting their CIDs.

---

### 2. CAR Integrity Verification

After a CAR file is generated, its integrity should be verified.

- **Step 1: List CIDs:** Unpack the CAR file and list the CIDs of the blocks it contains.
  ```bash
  # Using a hypothetical 'car' utility or ipfs-car
  car list-roots < my-graph.car
  car list-cids < my-graph.car
  ```

- **Step 2: Verify Block Hashes:** Manually or programmatically verify that the hash of each block's content matches its CID.
  ```bash
  # Example for a single block using IPFS
  cat block.bin | ipfs dag put --input-enc=raw --store-codec=dag-cbor
  ```

- **Step 3: Full Graph Traversal:** Starting from the root CID, traverse the entire IPLD graph to ensure all links are present and resolve correctly within the CAR file.
  ```bash
  # Using a tool like 'dag-explore' or a custom script
  dag-explore <root-cid> --car-file=my-graph.car
  ```

---

### 3. Expected Failure Modes & Recovery

- **Missing Neighbor IID:**
  - **Failure Mode:** A tile's connection points to a non-existent neighbor, or the neighbor tile fails to compute its IID.
  - **Recovery:** When computing a tile's XID, any missing neighbor IID must be replaced with a default null identifier, represented as **`ø`** (or a specific, constant CID for `null`). This ensures that the XID can still be computed and signals that the tile is at the "edge" of a partial or broken graph.

- **Invalid Code Payload:**
  - **Failure Mode:** The `code` field of a tile is malformed, empty, or fails a security check.
  - **Recovery:** The tile's GID computation fails. The tile should be marked as invalid and excluded from the final CAR export. The system should report an error specifying the invalid tile.

- **Circular Dependencies in ABI:**
  - **Failure Mode:** Two or more tiles have ABIs that reference each other in a way that creates an unresolvable circular dependency for IID computation.
  - **Recovery:** This is a design-time error. The IID generation algorithm should include cycle detection. If a cycle is detected, the operation must fail with an error indicating the tiles involved in the circular dependency.
