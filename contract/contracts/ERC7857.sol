// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IOracle {
    function verifyProof(bytes calldata proof) external view returns (bool);
}

/// @title ERC7857 — Intelligent NFT (iNFT) for Sealbox
/// @notice ERC-721 extended with encrypted metadata, oracle-verified sealed-key
///         transfers, cloning, and usage authorization. Each token wraps a
///         sealed prompt (system prompt / agent config) stored on 0G Storage;
///         transferring the token re-binds the metadata so the encryption key
///         re-seals to the buyer — the seller cryptographically loses the
///         ability to decrypt the prompt the moment the tx confirms.
contract ERC7857 is ERC721, Ownable, ReentrancyGuard {
    /// keccak256 of the encrypted metadata blob, re-bound on every transfer.
    mapping(uint256 => bytes32) private _metadataHashes;
    /// 0G Storage root hash / URI of the encrypted vault blob.
    mapping(uint256 => string) private _encryptedURIs;
    /// Per-token usage grants: tokenId => executor => opaque permissions blob.
    mapping(uint256 => mapping(address => bytes)) private _authorizations;

    address public oracle;
    uint256 private _nextTokenId = 1;

    /// Flat listing price for every prompt. 0.1 OG goes to the seller on purchase().
    uint256 public constant LISTING_PRICE = 0.1 ether;

    event Minted(uint256 indexed tokenId, address indexed to, bytes32 metadataHash, string encryptedURI);
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newHash);
    event SealedTransfer(uint256 indexed tokenId, address indexed from, address indexed to);
    event SealedKeyDelivered(uint256 indexed tokenId, address indexed to, bytes sealedKey);
    event Purchased(uint256 indexed tokenId, address indexed from, address indexed to, uint256 priceWei);
    event Cloned(uint256 indexed sourceTokenId, uint256 indexed newTokenId, address indexed to);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor);
    event UsageRevoked(uint256 indexed tokenId, address indexed executor);
    event OracleUpdated(address indexed oracle);

    constructor(string memory name_, string memory symbol_, address oracle_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        require(oracle_ != address(0), "ERC7857: oracle is zero");
        oracle = oracle_;
        emit OracleUpdated(oracle_);
    }

    /// @dev The oracle attests that `proof` is a valid re-encryption proof.
    modifier validProof(bytes calldata proof) {
        require(IOracle(oracle).verifyProof(proof), "ERC7857: invalid proof");
        _;
    }

    function setOracle(address oracle_) external onlyOwner {
        require(oracle_ != address(0), "ERC7857: oracle is zero");
        oracle = oracle_;
        emit OracleUpdated(oracle_);
    }

    /// @notice Mint a new iNFT bound to an encrypted vault blob on 0G Storage.
    /// @dev Open mint — any wallet can publish a sealed prompt. The vault
    ///      key is generated client-side and never reaches the contract.
    function mint(address to, string calldata encryptedURI, bytes32 metadataHash)
        external
        returns (uint256 tokenId)
    {
        require(to != address(0), "ERC7857: to is zero");
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _encryptedURIs[tokenId] = encryptedURI;
        _metadataHashes[tokenId] = metadataHash;
        emit Minted(tokenId, to, metadataHash, encryptedURI);
    }

    /// @notice Transfer ownership AND re-bind the encrypted metadata together.
    ///         The oracle attests (via `proof`) that the vault key was re-sealed
    ///         for `to`; `sealedKey` is surfaced in an event for off-chain pickup.
    /// @param proof abi.encode(bytes32 newMetadataHash, string newEncryptedURI)
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external nonReentrant validProof(proof) {
        // Only the current owner can initiate a sealed transfer. The oracle
        // proof attests to the re-encryption; without this guard the proof
        // alone would let any caller move someone else's token.
        require(msg.sender == from, "ERC7857: not sender");
        require(ownerOf(tokenId) == from, "ERC7857: not owner");
        require(to != address(0), "ERC7857: to is zero");

        _applyProof(tokenId, proof);
        _transfer(from, to, tokenId);

        emit SealedTransfer(tokenId, from, to);
        emit SealedKeyDelivered(tokenId, to, sealedKey);
    }

    /// @notice Buyer-initiated atomic purchase. The buyer presents a fresh
    ///         re-encryption proof (oracle-attested) plus the AES key sealed
    ///         to themselves, pays the flat LISTING_PRICE in native OG, and
    ///         the contract atomically transfers ownership + re-binds the
    ///         encrypted metadata. Payment is forwarded to the seller.
    ///
    /// The buyer obtains the source-vault key off-chain (the seller publishes
    /// it alongside the listing) so they can decrypt, re-encrypt, and re-upload
    /// the ciphertext before calling this.
    function purchase(uint256 tokenId, bytes calldata sealedKey, bytes calldata proof)
        external
        payable
        nonReentrant
        validProof(proof)
    {
        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "ERC7857: cannot buy own token");
        require(msg.value == LISTING_PRICE, "ERC7857: wrong price");

        _applyProof(tokenId, proof);
        _transfer(seller, msg.sender, tokenId);

        (bool ok, ) = payable(seller).call{value: msg.value}("");
        require(ok, "ERC7857: pay seller failed");

        emit SealedTransfer(tokenId, seller, msg.sender);
        emit SealedKeyDelivered(tokenId, msg.sender, sealedKey);
        emit Purchased(tokenId, seller, msg.sender, msg.value);
    }

    /// @notice Create a new token carrying the same vault metadata, re-sealed
    ///         for `to`. The source token is left untouched — useful for AI
    ///         agent templates.
    function clone(
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external nonReentrant validProof(proof) returns (uint256 newTokenId) {
        require(ownerOf(tokenId) == msg.sender, "ERC7857: not owner");
        require(to != address(0), "ERC7857: to is zero");

        newTokenId = _nextTokenId++;
        _safeMint(to, newTokenId);
        _encryptedURIs[newTokenId] = _encryptedURIs[tokenId];
        _applyProof(newTokenId, proof);

        emit Cloned(tokenId, newTokenId, to);
        emit SealedKeyDelivered(newTokenId, to, sealedKey);
    }

    /// @notice Grant scoped, time-boxed usage of a vault without transferring
    ///         ownership — the AI-as-a-Service / rental path.
    function authorizeUsage(uint256 tokenId, address executor, bytes calldata permissions) external {
        require(ownerOf(tokenId) == msg.sender, "ERC7857: not owner");
        require(executor != address(0), "ERC7857: executor is zero");
        _authorizations[tokenId][executor] = permissions;
        emit UsageAuthorized(tokenId, executor);
    }

    function revokeUsage(uint256 tokenId, address executor) external {
        require(ownerOf(tokenId) == msg.sender, "ERC7857: not owner");
        delete _authorizations[tokenId][executor];
        emit UsageRevoked(tokenId, executor);
    }

    function getMetadataHash(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _metadataHashes[tokenId];
    }

    function getEncryptedURI(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _encryptedURIs[tokenId];
    }

    function authorizationOf(uint256 tokenId, address executor) external view returns (bytes memory) {
        return _authorizations[tokenId][executor];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @dev Decode the oracle-verified proof and re-bind metadata. The proof
    ///      carries the post-re-encryption hash and, optionally, a new storage
    ///      URI. A malformed proof reverts here.
    function _applyProof(uint256 tokenId, bytes calldata proof) internal {
        (bytes32 newHash, string memory newURI) = abi.decode(proof, (bytes32, string));
        _metadataHashes[tokenId] = newHash;
        if (bytes(newURI).length > 0) {
            _encryptedURIs[tokenId] = newURI;
        }
        emit MetadataUpdated(tokenId, newHash);
    }
}
