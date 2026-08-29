// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IOracle} from "./ERC7857.sol";

/// @title MockOracle — dev/testnet stand-in for the ERC-7857 transfer oracle
/// @notice A real oracle verifies a TEE or ZKP attestation that the vault key
///         was correctly re-sealed for the new owner. For local tests and
///         testnet demos we only require that a proof is present; the
///         downstream `abi.decode` in ERC7857 rejects malformed proofs.
contract MockOracle is IOracle {
    function verifyProof(bytes calldata proof) external pure returns (bool) {
        return proof.length > 0;
    }
}
