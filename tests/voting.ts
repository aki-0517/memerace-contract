import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ContestProgram } from "../target/types/contest_program";
import { expect } from "chai";

describe("Voting Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ContestProgram as Program<ContestProgram>;
  const payer = anchor.web3.Keypair.generate();
  const participant1 = anchor.web3.Keypair.generate();
  const participant2 = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to users for transaction fees, entry fees, and vote fees
    for (const user of [payer, participant1, participant2, voter1, voter2]) {
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
  let votePDA1: PublicKey;
  let votePDA2: PublicKey;

  it("Sets up the test environment with entries", async () => {
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
    const voteFee = new anchor.BN(50000000); // 0.05 SOL per token

    await program.methods
      .createContest(
        Array.from(contestId),
        "Voting Test Contest",
        "Testing voting functionality",
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

    // Update contest status to Voting
    await program.methods
      .updateContestStatus({ voting: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Find PDAs for votes
    const [v1PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("vote"), voter1.publicKey.toBuffer(), entryPDA1.toBuffer()],
      program.programId
    );
    votePDA1 = v1PDA;

    const [v2PDA] = await PublicKey.findProgramAddress(
      [Buffer.from("vote"), voter2.publicKey.toBuffer(), entryPDA2.toBuffer()],
      program.programId
    );
    votePDA2 = v2PDA;
  });

  it("Casts votes for entries", async () => {
    // Voter 1 votes for entry 1 with 2 tokens
    const tokenAmount1 = new anchor.BN(2);

    await program.methods
      .castVote(tokenAmount1)
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

    // Voter 2 votes for entry 2 with 3 tokens
    const tokenAmount2 = new anchor.BN(3);

    await program.methods
      .castVote(tokenAmount2)
      .accounts({
        voter: voter2.publicKey,
        contest: contestPDA,
        entry: entryPDA2,
        vote: votePDA2,
        treasury: treasuryPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    // Check vote records
    const vote1 = await program.account.voteAccount.fetch(votePDA1);
    expect(vote1.voter.toString()).to.equal(voter1.publicKey.toString());
    expect(vote1.entry.toString()).to.equal(entryPDA1.toString());
    expect(vote1.tokenAmount.toString()).to.equal(tokenAmount1.toString());

    const vote2 = await program.account.voteAccount.fetch(votePDA2);
    expect(vote2.voter.toString()).to.equal(voter2.publicKey.toString());
    expect(vote2.entry.toString()).to.equal(entryPDA2.toString());
    expect(vote2.tokenAmount.toString()).to.equal(tokenAmount2.toString());

    // Check entry vote count and weighted votes
    const entry1 = await program.account.entryAccount.fetch(entryPDA1);
    expect(entry1.voteCount).to.equal(1);
    expect(entry1.weightedVotes.toString()).to.equal(tokenAmount1.toString());

    const entry2 = await program.account.entryAccount.fetch(entryPDA2);
    expect(entry2.voteCount).to.equal(1);
    expect(entry2.weightedVotes.toString()).to.equal(tokenAmount2.toString());

    // Check contest vote count
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.voteCount).to.equal(2);

    // Check treasury
    const treasury = await program.account.treasuryAccount.fetch(treasuryPDA);
    const entryFees = new anchor.BN(200000000).mul(new anchor.BN(2)); // 2 entries at 0.2 SOL
    const voteFee = new anchor.BN(50000000); // 0.05 SOL per token
    const vote1Fees = voteFee.mul(tokenAmount1);
    const vote2Fees = voteFee.mul(tokenAmount2);
    const expectedTotalFunds = entryFees.add(vote1Fees).add(vote2Fees);
    
    expect(treasury.totalFunds.toString()).to.equal(expectedTotalFunds.toString());
  });

  it("Counts votes and finalizes contest", async () => {
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

    // Check that winners have been decided
    const contest = await program.account.contestAccount.fetch(contestPDA);
    expect(contest.winnersDecided).to.equal(true);

    // Update contest status to Finalized
    await program.methods
      .updateContestStatus({ finalized: {} })
      .accounts({
        authority: payer.publicKey,
        contest: contestPDA,
      })
      .signers([payer])
      .rpc();

    // Fetch final contest status
    const finalContest = await program.account.contestAccount.fetch(contestPDA);
    expect(finalContest.status).to.deep.equal({ finalized: {} });
  });
});
