import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ContestProgram } from "../target/types/contest_program";
import { expect } from "chai";

describe("Entry Management Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ContestProgram as Program<ContestProgram>;
  const payer = anchor.web3.Keypair.generate();
  const participant1 = anchor.web3.Keypair.generate();
  const participant2 = anchor.web3.Keypair.generate();
  const participant3 = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to participants for transaction fees and entry fees
    for (const user of [payer, participant1, participant2, participant3]) {
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

  it("Sets up the test environment", async () => {
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
    const startTime = new anchor.BN(now - 100); // started 100 seconds ago
    const endTime = new anchor.BN(now + 86400); // ends in 1 day
    const entryFee = new anchor.BN(200000000); // 0.2 SOL
    const voteFee = new anchor.BN(50000000); // 0.05 SOL

    await program.methods
      .createContest(
        Array.from(contestId),
        "Entry Test Contest",
        "Testing entry submissions",
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
  });

  it("Submits an entry to the contest", async () => {
    const contentUri = "https://example.com/entry1";

    await program.methods
      .submitEntry(contentUri)
      .accounts({
        participant: participant1.publicKey,
        contest: contestPDA,
        entry: entryPDA1,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([participant1])
      .rpc();

    // Fetch the entry account
    const entry = await program.account.entryAccount.fetch(entryPDA1);
    
    expect(entry.contest.toString()).to.equal(contestPDA.toString());
    expect(entry.participant.toString()).to.equal(participant1.publicKey.toString());
    expect(entry.contentUri).to.equal(contentUri);
    expect(entry.voteCount).to.equal(0);
    expect(entry.weightedVotes.toNumber()).to.equal(0);
    expect(entry.rank).to.equal(null);

    // Fetch the contest account to check entry count
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.entryCount).to.equal(1);
  });

  it("Updates an entry", async () => {
    const newContentUri = "https://example.com/entry1-updated";

    await program.methods
      .updateEntry(newContentUri)
      .accounts({
        participant: participant1.publicKey,
        contest: contestPDA,
        entry: entryPDA1,
      })
      .signers([participant1])
      .rpc();

    // Fetch the updated entry account
    const entry = await program.account.entryAccount.fetch(entryPDA1);
    expect(entry.contentUri).to.equal(newContentUri);
  });

  it("Submits multiple entries from different participants", async () => {
    // Participant 2 submits an entry
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

    // Participant 3 submits an entry
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

    // Fetch the contest account to check entry count
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.entryCount).to.equal(3);

    // Fetch the treasury account to check funds
    const treasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    const entryFee = new anchor.BN(200000000); // 0.2 SOL
    const expectedTotalFunds = entryFee.mul(new anchor.BN(3));
    
    expect(treasury.totalFunds.toString()).to.equal(expectedTotalFunds.toString());
  });
});
