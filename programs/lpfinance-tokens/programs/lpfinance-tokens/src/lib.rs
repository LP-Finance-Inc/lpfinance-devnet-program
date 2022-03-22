use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Transfer, Token, TokenAccount }
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const LP_TOKEN_DECIMALS: u8 = 9;

#[program]
pub mod lpfinance_tokens {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        program_name: String,
        bumps: ProgramBumps
    ) -> Result<()> {
        msg!("INITIALIZE TOKEN PROGRAM");

        let state_account = &mut ctx.accounts.state_account;

        let name_bytes = program_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        state_account.program_name = name_data;
        state_account.bumps = bumps;
        state_account.owner = ctx.accounts.authority.key();
        state_account.lpbtc_mint = ctx.accounts.lpbtc_mint.key();
        state_account.lpsol_mint = ctx.accounts.lpsol_mint.key();
        state_account.lpusd_mint = ctx.accounts.lpusd_mint.key();

        Ok(())
    }

    pub fn mint_lptoken(
        ctx: Context<MintLpToken>,
        amount: u64
    ) -> Result<()> {
        if amount == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }

        // Mint
        let seeds = &[
            ctx.accounts.state_account.program_name.as_ref(),
            &[ctx.accounts.state_account.bumps.state_account]
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.lptoken_mint.to_account_info(),
            to: ctx.accounts.cbs_lptoken.to_account_info(),
            authority: ctx.accounts.state_account.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::mint_to(cpi_ctx, amount)?;
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(program_name: String, bumps: ProgramBumps)]
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
    pub state_account: Box<Account<'info, TokenStateAccount>>,

    #[account(init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = state_account,
        seeds = [program_name.as_bytes(), b"lpsol_mint".as_ref()],
        bump,
        payer = authority
    )]
    pub lpsol_mint: Box<Account<'info, Mint>>,  

    #[account(init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = state_account,
        seeds = [program_name.as_bytes(), b"lpusd_mint".as_ref()],
        bump,
        payer = authority
    )]
    pub lpusd_mint: Box<Account<'info, Mint>>,

    #[account(init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = state_account,
        seeds = [program_name.as_bytes(), b"lpbtc_mint".as_ref()],
        bump,
        payer = authority
    )]
    pub lpbtc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct MintLpToken<'info> {
    #[account(mut)]
    pub auction_account: Signer<'info>,
    #[account(mut,
        seeds = [state_account.program_name.as_ref()],
        bump = state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, TokenStateAccount>>,
    #[account(
        mut,
        constraint = cbs_lptoken.mint == lptoken_mint.key(),
        constraint = cbs_lptoken.owner == auction_account.key()
    )]
    pub cbs_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lptoken_mint: Account<'info, Mint>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct TokenStateAccount {
    pub program_name: [u8; 10],
    pub bumps: ProgramBumps,
    pub owner: Pubkey,
    pub lpbtc_mint: Pubkey,
    pub lpusd_mint: Pubkey,
    pub lpsol_mint: Pubkey,
    pub auction_pool: Pubkey
}

#[derive(AnchorDeserialize, AnchorSerialize, Default, Clone)]
pub struct ProgramBumps {
    pub state_account: u8,
    pub lpbtc_mint: u8,
    pub lpsol_mint: u8,
    pub lpusd_mint: u8
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Amount")]
    InvalidAmount
}