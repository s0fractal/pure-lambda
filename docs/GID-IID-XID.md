<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2025 Pure Lambda Authors -->

# GID, IID, XID: Understanding Tile Identity

In the B2/Hex system, every computational tile has a three-part identity: GID, IID, and XID. These identifiers help us understand what a tile *is*, how it *connects*, and where it *sits*.

- **GID (Gene ID):** The tile's "gene". This is a content-addressable hash of the tile's core logic and parameters (its `phash` or protein-hash). It represents the semantic essence of the tile. Two tiles with the same GID are functionally identical, regardless of how they are wired up.

- **IID (Interface ID):** The tile's "interface" or "socket type". This is a hash of the tile's Application Binary Interface (ABI), which includes its input/output ports (names, types, order). The IID determines compatibility. Two tiles can be swapped if and only if they have the same IID.

- **XID (eXecution context ID):** The tile's "context" or "location". This is a hash of the IIDs of all its immediate neighbors. The XID captures the tile's specific position within a larger computational fabric (an "operon"). If a neighbor is swapped with another tile (even one with a different GID but the same IID), the XID remains the same. If a neighbor is swapped with a tile that has a *different IID*, the XID changes.

---

### Examples of Tile Swapping

Here are three examples illustrating how IIDs govern tile substitution:

*   **Allowed Swap (Same GID, Same IID):** You have a `v1_adder` tile. You can replace it with an identical `v1_adder` tile. This is the most basic substitution. The GID, IID, and the resulting XID of its neighbors all remain unchanged.

*   **Allowed Swap (Different GID, Same IID):** You have a `v1_adder` tile that takes two numbers and outputs their sum. You've created a highly optimized `v2_adder_fast` that does the same thing but with a more efficient algorithm. As long as `v2_adder_fast` exposes the exact same ports (e.g., `in1`, `in2`, `out`), it will have the same IID as `v1_adder`. You can safely swap them. The GID changes, but the IID does not, and the XIDs of its neighbors remain stable.

*   **Breaking Change (Different IID):** You try to replace your `v1_adder` (ports: `in1`, `in2`, `out`) with a `v1_accumulator` that has only one input and one output (ports: `in`, `out`). Because the ports are different, their IIDs will not match. This swap is invalid and would break the computational graph. The system would reject this change, and if it were forced, the XIDs of all neighbors would change, signaling a major architectural shift.

---

### FAQ

**Q: Why not make the GID (or `phash`) depend on neighbors?**

**A:** The primary reason is to support **portability and substitution**. The GID represents the intrinsic, self-contained function of the tile—its "gene". By keeping it independent of its environment, we can:
1.  **Reuse Tiles:** A tile with a specific GID can be certified once and then reused in any number of computational graphs, confident that its core behavior is unchanged.
2.  **Enable Polymorphism:** We can create libraries of tiles that share an IID (interface) but have different GIDs (implementations). This allows for hot-swapping, optimization, and experimentation without breaking the surrounding architecture. If the GID depended on neighbors, every time you moved a tile, its fundamental identity would change, defeating the purpose of a reusable component model.
