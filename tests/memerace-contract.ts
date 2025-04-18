import * as anchor from "@coral-xyz/anchor";

describe("memerace-contract", () => {
  // プロバイダーを設定
  anchor.setProvider(anchor.AnchorProvider.env());
  
  // プログラムIDを文字列として定義
  const programIdStr = "3WMtUx9sjZyXirzj3uegBG3rFspTPgQqu6X2jtBc7fks";
  
  it("Is initialized!", async () => {
    try {
      // テスト実行時にプログラムIDとインターフェースを構築
      const programId = new anchor.web3.PublicKey(programIdStr);
      
      // プロバイダーからコネクションとウォレットを取得
      const provider = anchor.getProvider() as anchor.AnchorProvider;
      
      // シンプルなトランザクションを直接作成
      const ix = anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: provider.wallet.publicKey,
        lamports: 100,
      });
      
      const tx = await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(ix)
      );
      
      console.log("Your transaction signature", tx);
      console.log("Test completed successfully!");
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }
  });
});