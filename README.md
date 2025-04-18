### deploy手順
- anchor build --no-idl
- 違うterminalで solana-test-validator
- anchor test --no-idl  --skip-local-validator
- Anchor.tomlで cluster = "Devnet" に設定
- anchor deploy
- close programは solana program close 3ynNB373Q3VAzKp7m4x238po36hjAGFXFJB4ybN2iTyg --bypass-warning

```shell
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: /Users/user/.config/solana/id.json
Deploying program "memerace_contract"...
Program path: /Users/user/Desktop/memerace/memerace-contract/target/deploy/memerace_contract.so...
Program Id: 3WMtUx9sjZyXirzj3uegBG3rFspTPgQqu6X2jtBc7fks

Signature: e9YqXqduPcZerKkUGE7vH5JHBPSTiokmjXzM8wVnpanJbosKc9Y3antyyMS4Ps7Qa8dE15u9E5NKXEMLnukHaz5
```

### wallet確認
- solana balance --url devnet
- solana address