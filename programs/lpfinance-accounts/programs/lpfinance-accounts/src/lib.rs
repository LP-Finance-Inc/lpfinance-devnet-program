use anchor_lang::prelude::*;

declare_id!("CaBy6Mh16bVQpnqY7Crt13hU4Zyv8QbW55GfTvVFwxYh");

#[program]
pub mod lpfinance_accounts {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        program_name: String,
        bumps: AccountsBumps
    ) -> Result<()> {
        msg!("INITIALIZE TOKEN PROGRAM");

        let state_account = &mut ctx.accounts.state_account;

        let name_bytes = program_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        state_account.program_name = name_data;
        state_account.bumps = bumps;
        state_account.owner = ctx.accounts.authority.key();
        state_account.cbs_account = ctx.accounts.cbs_account.key();

        Ok(())
    }

    pub fn add_wallet(
        ctx: Context<AddWallet>,
        new_account: Pubkey
    ) -> Result<()> {
        msg!("ADD WALLET");
        let state_account = &mut ctx.accounts.state_account;
        
        let mut account_list = vec![];
        account_list.push(new_account);
        msg!("ADD WALLET2");
        state_account.account_list = account_list;
        msg!("ADD WALLET3");        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct AddWallet<'info> {
    // State Accounts
    #[account(mut,
        seeds = [state_account.program_name.as_ref()],
        bump = state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
#[instruction(program_name: String, bumps: AccountsBumps)]
pub struct Initialize<'info> {
    // Token program owner
    #[account(mut)]
    pub authority: Signer<'info>,
    // State Accounts
    #[account(init,
        seeds = [program_name.as_bytes()],
        bump,
        payer = authority
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    pub cbs_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct StateAccount {
    pub program_name: [u8; 10],
    pub bumps: AccountsBumps,
    pub owner: Pubkey,
    pub cbs_account: Pubkey,
    pub account_list: Vec<Pubkey>
}

#[derive(AnchorDeserialize, AnchorSerialize, Default, Clone)]
pub struct AccountsBumps {
    pub state_account: u8
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Amount")]
    InvalidAmount
}