use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Burn, Token, TokenAccount, Transfer },
};

use std::ops::Deref;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const LP_TOKEN_DECIMALS: u8 = 9;

#[program]
pub mod tokens {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>,
        token_title: String,
        bumps: TokenBumps,
    ) -> ProgramResult {
        msg!("INITIALIZE TOKEN PROGRAM");

        let lp_token_account = &mut ctx.accounts.lp_token_account;

        let name_bytes = token_title.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        lp_token_account.token_title = name_data;
        lp_token_account.bumps = bumps;
        lp_token_account.lptoken_mint = ctx.accounts.lptoken_mint.key();

        Ok(())
    }

    pub fn token_mint_to(
        ctx:Context<TokenMintTo>,
        amount: u64 // amount to mint
    ) -> ProgramResult {
        msg!("TOKEN MINT");

        let token_title = ctx.accounts.lp_token_account.token_title.as_ref();
        let seeds = &[
            token_title.trim_ascii_whitespace(),
            &[ctx.accounts.lp_token_account.bumps.lp_token_account]
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.user_token.to_account_info(),
            authority: ctx.accounts.lp_token_account.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::mint_to(cpi_ctx, amount);

        Ok(())
    }

    pub fn token_transfer(
        ctx:Context<TokenTransfer>,
        amount: u64 // amount to transfer
    ) -> ProgramResult {
        msg!("TOKEN Transfer");

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_lptoken.to_account_info(),
            to: ctx.accounts.to_lptoken.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn token_burn(
        ctx:Context<TokenBurn>,
        amount: u64 // amount to burn
    ) -> ProgramResult {
        msg!("TOKEN Transfer");

        let cpi_accounts = Burn {
            mint: ctx.accounts.user_lptoken.to_account_info(),
            to: ctx.accounts.to_lptoken.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(token_title: String, bumps: TokenBumps)]
pub struct Initialize<'info> {
    #[account(init,
        seeds = [token_title.as_bytes()],
        bump = bumps.lptoken_account,
        payer = authority
    )]
    pub lp_token_account: Account<'info, LpTokenAccount>,
    
    #[account(
        init,
        mint::decimals = LP_TOKEN_DECIMALS,
        mint::authority = lp_token_account,
        seeds = [tokoen_title.as_bytes(), b"lptoken_mint".as_ref()],
        bump = bumps.lptoken_mint,
        payer = authrotiy
    ]
    pub lptoken_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct TokenMintTo<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user_authority,
        associated_token::mint = lptoken_mint,
        associated_token::authortiy = user_authority,
        space = 8 + 42
    )]
    pub user_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lptoken_mint: Account<'info, Mint>,
    #[account(mut, 
        seeds = [lptoken_account.token_title.as_ref().trim_ascii_whitespace()],
        bump = lp_token_account.bumps.lptoken_account,
        has_one = lptoken_mint
    )]
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct TokenTransfer<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user_authority,
        associated_token::mint = lptoken_mint,
        associated_token::authortiy = user_authority,
        space = 8 + 42
    )]
    pub user_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user_authority,
        associated_token::mint = lptoken_mint,
        associated_token::authortiy = user_authority,
        space = 8 + 42
    )]
    pub to_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lptoken_mint: Account<'info, Mint>,
    #[account(mut, 
        seeds = [lptoken_account.token_title.as_ref().trim_ascii_whitespace()],
        bump = lp_token_account.bumps.lptoken_account,
        has_one = lptoken_mint
    )]
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct TokenBurn<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user_authority,
        associated_token::mint = lptoken_mint,
        associated_token::authortiy = user_authority,
        space = 8 + 42
    )]
    pub user_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user_authority,
        associated_token::mint = lptoken_mint,
        associated_token::authortiy = user_authority,
        space = 8 + 42
    )]
    pub to_lptoken: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub lptoken_mint: Account<'info, Mint>,
    #[account(mut, 
        seeds = [lptoken_account.token_title.as_ref().trim_ascii_whitespace()],
        bump = lp_token_account.bumps.lptoken_account,
        has_one = lptoken_mint
    )]
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>
}

#[account]
#[derive(Default)]
pub struct LpTokenAccount {
    pub token_title: [u8; 10],
    pub bumps: TokenBumps,
    pub authority: Pubkey,
    pub lptoken_mint: Pubkey
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct TokenBumps{
    pub lptoken_account: u8,
    pub lptoken_mint: u8
}