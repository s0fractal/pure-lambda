# DOE Summary Report

**Generated:** 2025-09-16T10:16:59.585Z
**Total Tests:** 16
**Passed:** 7
**Failed:** 9
**Success Rate:** 43.8%

## Test Results Summary

| Test Name | Type | Status | Variants | Details |
|-----------|------|--------|----------|----------|
| id_basic | Tile | ❌ FAIL | 4 | 3 checks |
| focus_basic | Tile | ❌ FAIL | 3 | 2 checks |
| scan_filter | Tile | ✅ PASS | 3 | 3 checks |
| delay_async | Tile | ❌ FAIL | 3 | 2 checks |
| merge_combine | Tile | ❌ FAIL | 3 | 2 checks |
| pair_duplicate | Tile | ❌ FAIL | 3 | 2 checks |
| split_branch | Tile | ✅ PASS | 2 | 2 checks |
| map_transform | Tile | ✅ PASS | 2 | 2 checks |
| reduce_aggregate | Tile | ✅ PASS | 2 | 2 checks |
| filter_predicate | Tile | ✅ PASS | 2 | 2 checks |
| compose_chain | Tile | ✅ PASS | 2 | 1 checks |
| constant_value | Tile | ✅ PASS | 2 | 1 checks |
| split_merge_operon | Operon | ❌ FAIL | 2 | 3 checks |
| focus_delay_operon | Operon | ❌ FAIL | 2 | 3 checks |
| pair_identity_operon | Operon | ❌ FAIL | 2 | 2 checks |
| isolated_tile_operon | Operon | ❌ FAIL | 2 | 2 checks |

## Detailed Results

### id_basic

**Checks:**
- ✅ **gid_equal**: Expected equal gid: 13f1b6f67b93b7a3895b70c5b3151290fed50e0a10b888dfe732cdbd0552fb2c == 13f1b6f67b93b7a3895b70c5b3151290fed50e0a10b888dfe732cdbd0552fb2c == 13f1b6f67b93b7a3895b70c5b3151290fed50e0a10b888dfe732cdbd0552fb2c
- ✅ **iid_equal**: Expected equal iid: 28996b32ed6edc3f07b37e9978f281888c92b9dbf1f86f16f6212e61619f2f84 == 28996b32ed6edc3f07b37e9978f281888c92b9dbf1f86f16f6212e61619f2f84
- ❌ **xid_diff**: Expected different xid: a747f1a7a8aa846a982f758b6de91ae3bcc2ec410b0546f31cbc2e6fa0946362 != a747f1a7a8aa846a982f758b6de91ae3bcc2ec410b0546f31cbc2e6fa0946362

### focus_basic

**Checks:**
- ❌ **gid_equal**: Expected equal gid: 9623bee27ae4b3deef9f2dd55ebe4f0aeea1f7b4df639b36d9ffc677431a8bb0 == 8de25461b8d02781bba155ea3089e7d40f89fe895e0ddaf96c079237a3ff224d == 9623bee27ae4b3deef9f2dd55ebe4f0aeea1f7b4df639b36d9ffc677431a8bb0
- ✅ **iid_equal**: Expected equal iid: c2afd3024ab98352c6dcc9dfd21f3e1bb5ae63098a1a7dbead74e11525d83c48 == c2afd3024ab98352c6dcc9dfd21f3e1bb5ae63098a1a7dbead74e11525d83c48

### scan_filter

**Checks:**
- ✅ **gid_equal**: Expected equal gid: b42ec29b1d83b1d38de710e8ee4375997564885084974d2d66a9b402a9b96256 == b42ec29b1d83b1d38de710e8ee4375997564885084974d2d66a9b402a9b96256
- ✅ **iid_equal**: Expected equal iid: 9cad0cee0e121e5e4ee57484b02c02fc4d23c34b097139d0c87cdd0355c0a3f3 == 9cad0cee0e121e5e4ee57484b02c02fc4d23c34b097139d0c87cdd0355c0a3f3 == 9cad0cee0e121e5e4ee57484b02c02fc4d23c34b097139d0c87cdd0355c0a3f3
- ✅ **xid_diff**: Expected different xid: 1128d7510f360c0acf012b7bc0564ac0d61b4db9aaafa5c130764e706da6001c != dacf0252400a23bb6bae8a328e87656820b7a47b21c3e7341b0e89b48daf10b9

### delay_async

**Checks:**
- ❌ **iid_equal**: Expected equal iid: 54fcb690e4146ab7b2dd518c1fe4962ba2422e19b66b363bd4b2fa9c14ba9627 == 7c0aa8f3f8e500e1ba43661d88ea4170eb9a4bcacd1e8d63490ce2a81ed867e9
- ✅ **xid_diff**: Expected different xid: 875227a3b5170f3b7686c25fed4120f5eb106a7d26b6b3410385ba436fc7c867 != 247de08b0d1c5ba8fe076c6562739432a13981c0c86afad42a60806199ab6746

### merge_combine

**Checks:**
- ✅ **iid_equal**: Only 1 elements in group
- ❌ **xid_diff**: Expected different xid: 36d92d19a09320ccd27422df0b7148c53212a97c712df17d8e571357ca4028ba != 36d92d19a09320ccd27422df0b7148c53212a97c712df17d8e571357ca4028ba != 36d92d19a09320ccd27422df0b7148c53212a97c712df17d8e571357ca4028ba

### pair_duplicate

**Checks:**
- ❌ **gid_equal**: Expected equal gid: 9fc32dfe87b8f41b61c914638291865bcaa23bf5ed25759e480f8f0530ca6b38 == 3a8997d962fea99c2bb5c8bf982e98e7eabefc63731fb8afe04e01dfc78f25c8 == 9fc32dfe87b8f41b61c914638291865bcaa23bf5ed25759e480f8f0530ca6b38
- ✅ **iid_equal**: Expected equal iid: 933074c47c1aedfce1fe7f5f52d56cedd33e86cca7746cec78c7b4210dd6f7c8 == 933074c47c1aedfce1fe7f5f52d56cedd33e86cca7746cec78c7b4210dd6f7c8 == 933074c47c1aedfce1fe7f5f52d56cedd33e86cca7746cec78c7b4210dd6f7c8

### split_branch

**Checks:**
- ✅ **gid_equal**: Expected equal gid: f4fb189484eba4b2d2330ae28c98d097aaf3ab2418e737bebdcc82d2de9d20d8 == f4fb189484eba4b2d2330ae28c98d097aaf3ab2418e737bebdcc82d2de9d20d8
- ✅ **iid_equal**: Expected equal iid: 49ca5032f7dd7fa8085c1ba005cc11b2b8a95eb1f90cc426c3fb025c2b78e52e == 49ca5032f7dd7fa8085c1ba005cc11b2b8a95eb1f90cc426c3fb025c2b78e52e

### map_transform

**Checks:**
- ✅ **gid_equal**: Only 1 elements in group
- ✅ **iid_equal**: Expected equal iid: efeb91a0c0a26501eef34547a45000a2d9f4bf91490e307dae578e69413ae8f1 == efeb91a0c0a26501eef34547a45000a2d9f4bf91490e307dae578e69413ae8f1

### reduce_aggregate

**Checks:**
- ✅ **gid_equal**: Expected equal gid: 4c2944e641e5864059da435007a6a284d3efb42d3187da0f4f3bfae68f701846 == 4c2944e641e5864059da435007a6a284d3efb42d3187da0f4f3bfae68f701846
- ✅ **iid_equal**: Expected equal iid: de3d238f5ff84bc632c13389efd1921a27de7b99560377a6eb83ef4b12882eeb == de3d238f5ff84bc632c13389efd1921a27de7b99560377a6eb83ef4b12882eeb

### filter_predicate

**Checks:**
- ✅ **gid_equal**: Expected equal gid: ba41b4411d5e73f2617a1e797af0b610adafa301b6ad76d0c82a39aede069a94 == ba41b4411d5e73f2617a1e797af0b610adafa301b6ad76d0c82a39aede069a94
- ✅ **iid_equal**: Expected equal iid: 229f15fb666c1be43f644db4d43b57138d65c36147edd1c94db6905910744291 == 229f15fb666c1be43f644db4d43b57138d65c36147edd1c94db6905910744291

### compose_chain

**Checks:**
- ✅ **iid_equal**: Expected equal iid: f28ab76b7d0838c02049bbea2825bb33f4ad2c693f047b1fd0470443020a2fcd == f28ab76b7d0838c02049bbea2825bb33f4ad2c693f047b1fd0470443020a2fcd

### constant_value

**Checks:**
- ✅ **iid_equal**: Expected equal iid: 6041f0116a05a0ee7e12f46e2b052c139a0d72689023ad181740e34bdd918079 == 6041f0116a05a0ee7e12f46e2b052c139a0d72689023ad181740e34bdd918079

### split_merge_operon

**Checks:**
- ❌ **gid_equal**: Expected equal gid: e7d863885ec2b9566b65668513f8356961407937001c3d1ba7a11178b4fa235c == 13f1b6f67b93b7a3895b70c5b3151290fed50e0a10b888dfe732cdbd0552fb2c
- ✅ **iid_equal**: Only 1 elements in group
- ✅ **xid_diff**: XID changes detected between variants: true

### focus_delay_operon

**Checks:**
- ✅ **gid_equal**: Only 1 elements in group
- ❌ **iid_equal**: Expected equal iid: 6a1d38eb94db78fda848460d44f63b2a7d2574bdda28ff88003531b570dab3d8 == 00bcef9290848eb134062ab362cfd11fba6a33a23f72fe7e5c66c6867ed210fa
- ✅ **xid_diff**: XID changes detected between variants: true

### pair_identity_operon

**Checks:**
- ❌ **gid_equal**: Expected equal gid: 9fc32dfe87b8f41b61c914638291865bcaa23bf5ed25759e480f8f0530ca6b38 == 13f1b6f67b93b7a3895b70c5b3151290fed50e0a10b888dfe732cdbd0552fb2c
- ❌ **iid_equal**: Expected equal iid: e7240c3c74940ff9775dbda811b7f6960c7eae79d2d5140d141b2252a9eb8814 == 9257f6176d41fe56879ef8f3f094562d2ced8b757c2c966ecb80aa665eb14dc0

### isolated_tile_operon

**Checks:**
- ✅ **gid_equal**: Only 1 elements in group
- ❌ **iid_equal**: Expected equal iid: 1763ac20cb1bedcd53c8c16ec22df1b2ff32282deb3ed968db9b02af3f37ff9b == 82c35d5e5cc4e1c8e7b38df6b3572c56aaac73f64d383fe06c9deca95f4a825a

## Invariant Analysis

### GID (Genomic ID) Invariants
- **✅ Code normalization**: Whitespace and variable renaming should not affect GID
- **✅ Semantic equivalence**: Functionally equivalent code should have same GID
- **❌ Different logic**: Changed algorithms should produce different GIDs

### IID (Interface ID) Invariants
- **✅ Port consistency**: Same port names and types should have same IID
- **✅ ABI stability**: Same interface contract should have same IID
- **❌ Interface changes**: Different port names or types should produce different IIDs

### XID (Context ID) Invariants
- **✅ Neighbor sensitivity**: XID should change when neighbor IIDs change
- **✅ Isolation**: Disconnected tiles should have constant XIDs
- **✅ Permutation invariance**: Swapping identical neighbors should not affect XID

