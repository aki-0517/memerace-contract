import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ContestProgram } from "../target/types/contest_program";
import { expect } from "chai";

describe("Treasury Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ContestProgram as Program<ContestProgram>;
  const payer = anchor.web3.Keypair.generate();
  const participant1 = anchor.web3.Keypair.generate();
  const participant2 = anchor.web3.Keypair.generate();
  const participant3 = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const contributor = anchor.web3.Keypair.generate();
  const platformWallet = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to users for transaction fees and other operations
    for (const user of [payer, participant1, participant2, participant3, voter1, contributor, platformWallet]) {
      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);
    }
  });

  let platformConfigPDA: PublicKey;
  let contestId: Uint8Array;
  let contestPDA: PublicKey;
  let treasuryPDA: PublicKey;
  let entryPDA1: PublicKey;
  let entryPDA2: PublicKey;
  let entryPDA3: PublicKey;
  let votePDA1: PublicKey;

  it("Sets up a complete contest with entries and votes", async () => {
    // Initialize platform config
    const [configPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("platform-config")],
      program.programId
    );
    platformConfigPDA = configPDA;

    await program.methods
      .initializePlatform(10, new anchor.BN(100000000), new anchor.BN(10000000))
      .accounts({
        authority: payer.publicKey,
        platformConfig: platformConfigPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Create a contest
    contestId = anchor.web3.Keypair.generate().publicKey.toBuffer();
    const [cPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("contest"), contestId],
      program.programId
    );
    contestPDA = cPDA;

    const [tPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("treasury"), contestPDA.toBuffer()],
      program.programId
    );
    treasuryPDA = tPDA;

    // Get current timestamp
    const now = Math.floor(Date.now() / 1000);
    const startTime = new anchor.BN(now - 1000); // started 1000 seconds ago
    const endTime = new anchor.BN(now - 100); // ended 100 seconds ago
    const entryFee = new anchor.BN(200000000); // 0.2 SOL
    const voteFee = new anchor.BN(50000000); // 0.05 SOL per token

    await program.methods
      .createContest(
        Array.from(contestId),
        "Treasury Test Contest",
        "Testing treasury functionality",
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

    // Update contest status to Live
    await program.methods
      .updateContestStatus({ live: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Find PDAs for entries
    const [e1PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("entry"), contestPDA.toBuffer(), participant1.publicKey.toBuffer()],
      program.programId
    );
    entryPDA1 = e1PDA;

    const [e2PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("entry"), contestPDA.toBuffer(), participant2.publicKey.toBuffer()],
      program.programId
    );
    entryPDA2 = e2PDA;

    const [e3PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("entry"), contestPDA.toBuffer(), participant3.publicKey.toBuffer()],
      program.programId
    );
    entryPDA3 = e3PDA;

    // Submit entries
    await program.methods
      .submitEntry("https://example.com/entry1")
      .accounts({
        participant: participant1.publicKey,
        contest: contestPDA,
        entry: entryPDA1,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([participant1])
      .rpc();

    await program.methods
      .submitEntry("https://example.com/entry2")
      .accounts({
        participant: participant2.publicKey,
        contest: contestPDA,
        entry: entryPDA2,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([participant2])
      .rpc();

    await program.methods
      .submitEntry("https://example.com/entry3")
      .accounts({
        participant: participant3.publicKey,
        contest: contestPDA,
        entry: entryPDA3,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([participant3])
      .rpc();

    // Update contest status to Voting
    await program.methods
      .updateContestStatus({ voting: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Find PDA for vote
    const [v1PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("vote"), voter1.publicKey.toBuffer(), entryPDA1.toBuffer()],
      program.programId
    );
    votePDA1 = v1PDA;

    // Cast vote
    await program.methods
      .castVote(new anchor.BN(5)) // 5 tokens
      .accounts({
        voter: voter1.publicKey,
        contest: contestPDA,
        entry: entryPDA1,
        vote: votePDA1,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    // Update contest status to Closed
    await program.methods
      .updateContestStatus({ closed: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Count votes
    await program.methods
      .countVotes()
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Update contest status to Finalized
    await program.methods
      .updateContestStatus({ finalized: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();
  });

  it("Adds additional funds to the prize pool", async () => {
    const additionalFunds = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL

    // Get initial treasury state
    const initialTreasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    const initialPrizePool = initialTreasury.prizePool;
    const initialTotalFunds = initialTreasury.totalFunds;

    await program.methods
      .addFundsToPrizePool(additionalFunds)
      .accounts({
        contributor: contributor.publicKey,
        contest: contestPDA,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([contributor])
      .rpc();

    // Check updated treasury state
    const updatedTreasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    expect(updatedTreasury.prizePool.toString()).to.equal(
      initialPrizePool.add(additionalFunds).toString()
    );
    expect(updatedTreasury.totalFunds.toString()).to.equal(
      initialTotalFunds.add(additionalFunds).toString()
    );

    // Check updated contest state
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.totalPrizePool.toString()).to.equal(
      updatedTreasury.prizePool.toString()
    );
  });

  it("Distributes prizes to winners", async () => {
    // Check initial distribution status
    const initialTreasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    expect(initialTreasury.isDistributed).to.equal(false);

    // For this test, we're going to use:
    // participant1 as first place winner
    // participant2 as second place winner
    // participant3 as third place winner

    // Manually set rankings for demo purposes
    // In a real implementation, this would be determined by the vote counting logic
    const entry1 = await program.account.entryAccount.fetch(entryPDA1);
    const entry2 = await program.account.entryAccount.fetch(entryPDA2);
    const entry3 = await program.account.entryAccount.fetch(entryPDA3);

    // Get initial balances
    const initialPlatformBalance = await provider.connection.getBalance(platformWallet.publicKey);
    const initialFirstPlaceBalance = await provider.connection.getBalance(participant1.publicKey);
    const initialSecondPlaceBalance = await provider.connection.getBalance(participant2.publicKey);
    const initialThirdPlaceBalance = await provider.connection.getBalance(participant3.publicKey);

    await program.methods
      .distributePrizes()
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
        treasury: treasuryPDA,
        platformWallet: platformWallet.publicKey,
        firstPlaceRecipient: participant1.publicKey,
        secondPlaceRecipient: participant2.publicKey,
        thirdPlaceRecipient: participant3.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    // Check updated distribution status
    const updatedTreasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    expect(updatedTreasury.isDistributed).to.equal(true);

    // Check balances have increased
    const finalPlatformBalance = await provider.connection.getBalance(platformWallet.publicKey);
    const finalFirstPlaceBalance = await provider.connection.getBalance(participant1.publicKey);
    const finalSecondPlaceBalance = await provider.connection.getBalance(participant2.publicKey);
    const finalThirdPlaceBalance = await provider.connection.getBalance(participant3.publicKey);

    expect(finalPlatformBalance).to.be.greaterThan(initialPlatformBalance);
    expect(finalFirstPlaceBalance).to.be.greaterThan(initialFirstPlaceBalance);
    expect(finalSecondPlaceBalance).to.be.greaterThan(initialSecondPlaceBalance);
    expect(finalThirdPlaceBalance).to.be.greaterThan(initialThirdPlaceBalance);
  });
});
