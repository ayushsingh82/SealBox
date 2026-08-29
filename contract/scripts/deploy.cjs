const hre = require("hardhat");

// Deploys MockOracle, then the ERC7857 iNFT contract wired to it.
// Run against 0G Galileo: npm run deploy:galileo  (needs PRIVATE_KEY in .env)
async function main() {
  const { ethers, network } = hre;

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set PRIVATE_KEY in contract/.env");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Network: ", network.name);
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "OG\n");

  const MockOracle = await ethers.getContractFactory("MockOracle");
  const oracle = await MockOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("MockOracle deployed:", oracleAddr);

  const ERC7857 = await ethers.getContractFactory("ERC7857");
  const inft = await ERC7857.deploy("Sealbox", "SEAL", oracleAddr);
  await inft.waitForDeployment();
  const inftAddr = await inft.getAddress();
  console.log("ERC7857 deployed:   ", inftAddr);

  console.log("\nWire these into the frontend (app/lib/contract.ts):");
  console.log(`  export const INFT_ADDRESS = "${inftAddr}";`);
  console.log(`  export const ORACLE_ADDRESS = "${oracleAddr}";`);
  if (network.name === "ogGalileo") {
    console.log(`\nExplorer: https://chainscan-galileo.0g.ai/address/${inftAddr}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
