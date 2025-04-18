// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ContestProgram } from "../target/types/contest_program";

async function main() {
  // Configure the client to use the Solana cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ContestProgram as Program<ContestProgram>;
  
  console.log("Program ID:", program.programId.toString());

  // Initialize platform configuration
  const [platformConfigPDA, platformConfigBump] = await PublicKey.findProgramAddress(
    [Buffer.from("platform-config")],
    program.programId
  );

  const platformFeePercentage = 10; // 10%
  const minEntryFee = new anchor.BN(100000000); // 0.1 SOL
  const minVoteFee = new anchor.BN(10000000); // 0.01 SOL

  try {
    await program.methods
      .initializePlatform(platformFeePercentage, minEntryFee, minVoteFee)
      .accounts({
        authority: provider.wallet.publicKey,
        platformConfig: platformConfigPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Platform configuration initialized successfully!");
    console.log("Platform config PDA:", platformConfigPDA.toString());
  } catch (error) {
    console.error("Error initializing platform configuration:", error);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
