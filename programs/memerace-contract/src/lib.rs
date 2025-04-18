use anchor_lang::prelude::*;

declare_id!("3WMtUx9sjZyXirzj3uegBG3rFspTPgQqu6X2jtBc7fks");

#[program]
pub mod memerace_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
