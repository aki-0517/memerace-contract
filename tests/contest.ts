import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ContestProgram } from "../target/types/contest_program";
import { MeameraceContract } from "../target/types/memerace_contract";
import { expect } from "chai";

describe("Contest Management Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MeameraceContract as Program<MeameraceContract>;
  const payer = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to payer for transaction fees
    const signature = await provider.connection.requestAirdrop(
      payer.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  });

  let platformConfigPDA: PublicKey;
  let platformConfigBump: number;

  it("Initializes the platform configuration", async () => {
    // Find PDA for platform config
    const [configPDA, configBump] = await PublicKey.findProgramAddress(
      [Buffer.from("platform-config")],
      program.programId
    );
    platformConfigPDA = configPDA;
    platformConfigBump = configBump;

    const platformFeePercentage = 10; // 10%
    const minEntryFee = new anchor.BN(100000000); // 0.1 SOL
    const minVoteFee = new anchor.BN(10000000); // 0.01 SOL

    await program.methods
      .initializePlatform(platformFeePercentage, minEntryFee, minVoteFee)
      .accounts({
        authority: payer.publicKey,
        platformConfig: platformConfigPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Fetch the platform config account
    const platformConfig = await program.account.platformConfig.fetch(
      platformConfigPDA
    );

    expect(platformConfig.authority.toString()).to.equal(
      payer.publicKey.toString()
    );
    expect(platformConfig.platformFeePercentage).to.equal(platformFeePercentage);
    expect(platformConfig.minEntryFee.toString()).to.equal(
      minEntryFee.toString()
    );
    expect(platformConfig.minVoteFee.toString()).to.equal(
      minVoteFee.toString()
    );
    expect(platformConfig.bump).to.equal(configBump);
  });

  let contestId: Uint8Array;
  let contestPDA: PublicKey;
  let contestBump: number;
  let treasuryPDA: PublicKey;
  let treasuryBump: number;

  it("Creates a contest", async () => {
    // Generate a random contest ID
    contestId = anchor.web3.Keypair.generate().publicKey.toBuffer();

    // Find PDAs for contest and treasury
    const [cPDA, cBump] = await PublicKey.findProgramAddress(
      [Buffer.from("contest"), contestId],
      program.programId
    );
    contestPDA = cPDA;
    contestBump = cBump;

    const [tPDA, tBump] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury"), contestPDA.toBuffer()],
      program.programId
    );
    treasuryPDA = tPDA;
    treasuryBump = tBump;

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now + 100); // start in 100 seconds
    const endTime = new anchor.BN(now + 86400); // end in 1 day
    const entryFee = new anchor.BN(200000000); // 0.2 SOL
    const voteFee = new anchor.BN(50000000); // 0.05 SOL

    const title = "Test Contest";
    const description = "This is a test contest description";

    await program.methods
      .createContest(
        Array.from(contestId),
        title,
        description,
        startTime,
        endTime,
        entryFee,
        voteFee
      )
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
        treasury: treasuryPDA,
        platformConfig: platformConfigPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Fetch the contest account
    const contest = await program.account.contestAccount.fetch(contestPDA);

    expect(contest.authority.toString()).to.equal(payer.publicKey.toString());
    expect(contest.title).to.equal(title);
    expect(contest.description).to.equal(description);
    expect(contest.startTime.toString()).to.equal(startTime.toString());
    expect(contest.endTime.toString()).to.equal(endTime.toString());
    expect(contest.entryFee.toString()).to.equal(entryFee.toString());
    expect(contest.voteFee.toString()).to.equal(voteFee.toString());
    expect(contest.status).to.deep.equal({ upcoming: {} });
    expect(contest.treasury.toString()).to.equal(treasuryPDA.toString());
    expect(contest.entryCount).to.equal(0);
    expect(contest.voteCount).to.equal(0);
    expect(contest.totalPrizePool.toString()).to.equal("0");
    expect(contest.winnersDecided).to.equal(false);
  });

  it("Updates a contest", async () => {
    const newTitle = "Updated Test Contest";
    const newDescription = "This is an updated test contest description";

    await program.methods
      .updateContest(newTitle, newDescription, null, null)
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Fetch the contest account
    const contest = await program.account.contestAccount.fetch(contestPDA);

    expect(contest.title).to.equal(newTitle);
    expect(contest.description).to.equal(newDescription);
  });

  it("Updates contest status to Live", async () => {
    // We need to wait until the start time
    // In a real test, we'd use a mocked clock
    // For this example, we'll just update the contest status directly
    
    await program.methods
      .updateContestStatus({ live: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Fetch the contest account
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.status).to.deep.equal({ live: {} });
  });
});
