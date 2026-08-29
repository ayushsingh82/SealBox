const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC7857 iNFT", function () {
  let inft, oracle, owner, alice, bob, executor;

  const URI = "0gstorage://0xroothash";
  const HASH = ethers.keccak256(ethers.toUtf8Bytes("metadata-v1"));

  // proof = abi.encode(bytes32 newMetadataHash, string newEncryptedURI)
  function makeProof(newHash, newURI = "") {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "string"],
      [newHash, newURI],
    );
  }

  beforeEach(async function () {
    [owner, alice, bob, executor] = await ethers.getSigners();

    const MockOracle = await ethers.getContractFactory("MockOracle");
    oracle = await MockOracle.deploy();

    const ERC7857 = await ethers.getContractFactory("ERC7857");
    inft = await ERC7857.deploy("Sealbox", "SEAL", await oracle.getAddress());
  });

  it("mints an iNFT with encrypted metadata", async function () {
    await expect(inft.mint(alice.address, URI, HASH)).to.emit(inft, "Minted");
    expect(await inft.ownerOf(1)).to.equal(alice.address);
    expect(await inft.getEncryptedURI(1)).to.equal(URI);
    expect(await inft.getMetadataHash(1)).to.equal(HASH);
    expect(await inft.totalMinted()).to.equal(1n);
  });

  it("lets any wallet mint a sealed prompt", async function () {
    await expect(inft.connect(alice).mint(alice.address, URI, HASH))
      .to.emit(inft, "Minted");
    expect(await inft.ownerOf(1)).to.equal(alice.address);

    // Different wallet, different blob.
    const URI2 = "0gstorage://0xroot2";
    const HASH2 = ethers.keccak256(ethers.toUtf8Bytes("metadata-v3"));
    await expect(inft.connect(bob).mint(bob.address, URI2, HASH2))
      .to.emit(inft, "Minted");
    expect(await inft.ownerOf(2)).to.equal(bob.address);
  });

  it("rejects mint to the zero address", async function () {
    await expect(
      inft.connect(alice).mint(ethers.ZeroAddress, URI, HASH),
    ).to.be.revertedWith("ERC7857: to is zero");
  });

  it("transfers ownership and re-encrypts metadata together", async function () {
    await inft.mint(alice.address, URI, HASH);

    const newHash = ethers.keccak256(ethers.toUtf8Bytes("metadata-v2"));
    const newURI = "0gstorage://0xnewroot";
    const proof = makeProof(newHash, newURI);
    const sealedKey = "0xdeadbeef";

    await expect(
      inft.connect(alice).transfer(alice.address, bob.address, 1, sealedKey, proof),
    )
      .to.emit(inft, "SealedTransfer")
      .withArgs(1, alice.address, bob.address)
      .and.to.emit(inft, "MetadataUpdated")
      .withArgs(1, newHash)
      .and.to.emit(inft, "SealedKeyDelivered")
      .withArgs(1, bob.address, sealedKey);

    expect(await inft.ownerOf(1)).to.equal(bob.address);
    expect(await inft.getMetadataHash(1)).to.equal(newHash);
    expect(await inft.getEncryptedURI(1)).to.equal(newURI);
  });

  it("rejects a transfer from a non-owner", async function () {
    await inft.mint(alice.address, URI, HASH);
    const proof = makeProof(HASH);
    await expect(
      inft.connect(bob).transfer(bob.address, bob.address, 1, "0x", proof),
    ).to.be.revertedWith("ERC7857: not owner");
  });

  it("rejects a transfer from an account that isn't the seller", async function () {
    await inft.mint(alice.address, URI, HASH);
    const proof = makeProof(HASH, "0gstorage://0xother");
    // Bob tries to steal Alice's token by passing alice as `from` but signing
    // the tx himself. Without the msg.sender == from guard this would steal
    // the token under a valid oracle proof.
    await expect(
      inft.connect(bob).transfer(alice.address, bob.address, 1, "0xdeadbeef", proof),
    ).to.be.revertedWith("ERC7857: not sender");
  });

  it("rejects an empty / invalid proof at the oracle", async function () {
    await inft.mint(alice.address, URI, HASH);
    await expect(
      inft.connect(alice).transfer(alice.address, bob.address, 1, "0x", "0x"),
    ).to.be.revertedWith("ERC7857: invalid proof");
  });

  it("lets a buyer purchase a prompt atomically and pays the seller", async function () {
    await inft.mint(alice.address, URI, HASH);
    const price = await inft.LISTING_PRICE();

    const newHash = ethers.keccak256(ethers.toUtf8Bytes("buyer-resealed"));
    const proof = makeProof(newHash, "0gstorage://0xbuyerblob");
    const sealedKey = "0xbeefcafe";

    const sellerBalBefore = await ethers.provider.getBalance(alice.address);
    const tx = await inft.connect(bob).purchase(1, sealedKey, proof, { value: price });
    await expect(tx)
      .to.emit(inft, "Purchased")
      .withArgs(1, alice.address, bob.address, price)
      .and.to.emit(inft, "SealedKeyDelivered")
      .withArgs(1, bob.address, sealedKey);

    expect(await inft.ownerOf(1)).to.equal(bob.address);
    expect(await inft.getMetadataHash(1)).to.equal(newHash);
    expect(await inft.getEncryptedURI(1)).to.equal("0gstorage://0xbuyerblob");

    const sellerBalAfter = await ethers.provider.getBalance(alice.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(price);
  });

  it("rejects a purchase with the wrong price", async function () {
    await inft.mint(alice.address, URI, HASH);
    const price = await inft.LISTING_PRICE();
    const proof = makeProof(HASH, "0gstorage://0xy");
    await expect(
      inft.connect(bob).purchase(1, "0xab", proof, { value: price - 1n }),
    ).to.be.revertedWith("ERC7857: wrong price");
  });

  it("rejects the owner trying to buy their own prompt", async function () {
    await inft.mint(alice.address, URI, HASH);
    const price = await inft.LISTING_PRICE();
    const proof = makeProof(HASH, "0gstorage://0xy");
    await expect(
      inft.connect(alice).purchase(1, "0xab", proof, { value: price }),
    ).to.be.revertedWith("ERC7857: cannot buy own token");
  });

  it("clones a token while preserving the source", async function () {
    await inft.mint(alice.address, URI, HASH);

    const newHash = ethers.keccak256(ethers.toUtf8Bytes("clone-v1"));
    const proof = makeProof(newHash);

    await expect(inft.connect(alice).clone(bob.address, 1, "0xabcd", proof))
      .to.emit(inft, "Cloned")
      .withArgs(1, 2, bob.address);

    expect(await inft.ownerOf(1)).to.equal(alice.address);
    expect(await inft.ownerOf(2)).to.equal(bob.address);
    expect(await inft.getEncryptedURI(2)).to.equal(URI);
    expect(await inft.getMetadataHash(2)).to.equal(newHash);
  });

  it("authorizes and revokes usage without transferring ownership", async function () {
    await inft.mint(alice.address, URI, HASH);

    const perms = ethers.toUtf8Bytes(JSON.stringify({ maxRequests: 100 }));
    await expect(inft.connect(alice).authorizeUsage(1, executor.address, perms))
      .to.emit(inft, "UsageAuthorized")
      .withArgs(1, executor.address);

    expect(await inft.authorizationOf(1, executor.address)).to.equal(
      ethers.hexlify(perms),
    );
    expect(await inft.ownerOf(1)).to.equal(alice.address);

    await expect(inft.connect(alice).revokeUsage(1, executor.address))
      .to.emit(inft, "UsageRevoked")
      .withArgs(1, executor.address);
    expect(await inft.authorizationOf(1, executor.address)).to.equal("0x");
  });

  it("guards owner-only setOracle", async function () {
    await expect(
      inft.connect(alice).setOracle(executor.address),
    ).to.be.revertedWithCustomError(inft, "OwnableUnauthorizedAccount");

    await expect(inft.setOracle(await oracle.getAddress())).to.emit(
      inft,
      "OracleUpdated",
    );
  });
});
