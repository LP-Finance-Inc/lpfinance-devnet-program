use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction };
use pyth_client;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Transfer, Token, TokenAccount }
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod lpfinance_swap {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn swap_sol_to_token(
        ctx: Context<SwapSOLToToken>,
        amount: u64
    ) -> Result<()> {
        if **ctx.accounts.user_authority.lamports.borrow() < amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user_authority.key,
                ctx.accounts.swap_pool.to_account_info().key,
                amount
            ),
            &[
                ctx.accounts.user_authority.to_account_info().clone(),
                ctx.accounts.swap_pool.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone()
            ]
        )?;

        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;

        

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct SwapSOLToToken<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        constraint = user_destination.owner == user_authority.key(),
        constraint = user_destination.mint == destination_mint.key()
    )]
    pub user_destination : Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref(), b"swap_pool".as_ref()],
        bump = state_account.bumps.swap_pool)]
    pub swap_pool: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub destination_mint: Account<'info,Mint>,
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct StateAccount {
    pub swap_name: [u8; 10],
    pub bumps: SwapBumps,
    pub owner: Pubkey,
    pub lpsol_mint: Pubkey,
    pub lpusd_mint: Pubkey,
    pub btc_mint: Pubkey,
    pub usdc_mint: Pubkey
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SwapBumps{
    pub state_account: u8,
    pub swap_pool: u8
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient Amount")]
    InsufficientAmount
}