export const inftNftSnippets = {
  title: "INFT / NFT Snippets",
  erc7857Interface: `interface IERC7857 is IERC721 {
    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external;

    function clone(
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external returns (uint256 newTokenId);

    function authorizeUsage(
        uint256 tokenId,
        address executor,
        bytes calldata permissions
    ) external;
}`,
  inftContractCore: `contract ERC7857 is ERC721, Ownable, ReentrancyGuard {
    mapping(uint256 => bytes32) private _metadataHashes;
    mapping(uint256 => string) private _encryptedURIs;
    mapping(uint256 => mapping(address => bytes)) private _authorizations;

    address public oracle;

    function transfer(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata sealedKey,
        bytes calldata proof
    ) external nonReentrant validProof(proof) {
        require(ownerOf(tokenId) == from, "Not owner");
        _updateMetadataAccess(tokenId, to, sealedKey, proof);
        _transfer(from, to, tokenId);
    }
}`,
  mintExample: `function mint(
    address to,
    string calldata encryptedURI,
    bytes32 metadataHash
) external onlyOwner returns (uint256) {
    uint256 tokenId = _nextTokenId++;
    _safeMint(to, tokenId);
    _encryptedURIs[tokenId] = encryptedURI;
    _metadataHashes[tokenId] = metadataHash;
    return tokenId;
}`,
  secureMetadataPattern: `const encrypted = await encryptMetadata(metadata, ownerPublicKey);
const storageResult = await ogStorage.store(encrypted);
const sealedKey = await sealKeyForOwner(encryptionKey, ownerPublicKey);
const metadataHash = keccak256(encrypted);`,
};
