const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying RockPaperScissors contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy RockPaperScissors
  const RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
  const rockPaperScissors = await RockPaperScissors.deploy();

  await rockPaperScissors.waitForDeployment();

  const contractAddress = await rockPaperScissors.getAddress();
  console.log("RockPaperScissors deployed to:", contractAddress);

  // Wait for block confirmations
  console.log("Waiting for block confirmations...");
  await rockPaperScissors.deploymentTransaction().wait(5);

  console.log("Deployment complete!");
  console.log("\nContract Address:", contractAddress);
  console.log("\nTo verify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
