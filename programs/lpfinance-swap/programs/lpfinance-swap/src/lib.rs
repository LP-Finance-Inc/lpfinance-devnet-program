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
    pub fn initialize(
        ctx: Context<Initialize>,
        swap_name: String,
        bumps: SwapBumps,
    ) -> Result<()> {
        msg!("INITIALIZE SWAP");

        let state_account = &mut ctx.accounts.state_account;

        let name_bytes = swap_name.as_bytes();
        let mut name_data = [b' '; 10];
        name_data[..name_bytes.len()].copy_from_slice(name_bytes);

        state_account.swap_name = name_data;
        state_account.bumps = bumps;
        state_account.btc_mint = ctx.accounts.btc_mint.key();
        state_account.usdc_mint = ctx.accounts.usdc_mint.key();
        state_account.lpusd_mint = ctx.accounts.lpusd_mint.key();
        state_account.lpsol_mint = ctx.accounts.lpsol_mint.key();
        state_account.owner = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn swap_sol_to_token(
        ctx: Context<SwapSOLToToken>,
        quote_amount: u64
    ) -> Result<()> {
        if **ctx.accounts.user_authority.lamports.borrow() < quote_amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user_authority.key,
                ctx.accounts.swap_pool.to_account_info().key,
                quote_amount
            ),
            &[
                ctx.accounts.user_authority.to_account_info().clone(),
                ctx.accounts.swap_pool.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone()
            ]
        )?;

        let pyth_price_info = &ctx.accounts.pyth_quote_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let quote_price = pyth_price.agg.price as u64;
        let quote_total = quote_price * quote_amount;

        // destination token
        let pyth_price_info = &ctx.accounts.pyth_del_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let dest_price = pyth_price.agg.price as u64;

        let transfer_amount = quote_total/dest_price;

        let cpi_accounts = Transfer {
            from: ctx.accounts.dest_pool.to_account_info(),
            to: ctx.accounts.user_dest.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, transfer_amount)?;

        Ok(())
    }

    pub fn swap_token_to_sol(
        ctx: Context<SwapSOLToToken>,
        quote_amount: u64
    ) -> Result<()> {
        if **ctx.accounts.user_quote.amount < quote_amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_quote.to_account_info(),
            to: ctx.accounts.quote_pool.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, quote_amount)?;

        let pyth_price_info = &ctx.accounts.pyth_quote_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let quote_price = pyth_price.agg.price as u64;
        let quote_total = quote_price * quote_amount;

        // destination token
        let pyth_price_info = &ctx.accounts.pyth_del_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let dest_price = pyth_price.agg.price as u64;


        let transfer_amount = quote_total/dest_price;

        invoke(
            &system_instruction::transfer(
                ctx.accounts.swap_pool.to_account_info().key,
                ctx.accounts.user_authority.key,
                transfer_amount
            ),
            &[
                ctx.accounts.swap_pool.to_account_info().clone(),
                ctx.accounts.user_authority.to_account_info().clone(),
                ctx.accounts.system_program.to_account_info().clone()
            ]
        )?;
        Ok(())
    }

    pub fn swap_token_to_token(
        ctx: Context<SwapTokenToToken>,
        quote_amount: u64
    ) -> Result<()> {
        if **ctx.accounts.user_quote.amount < quote_amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }


        let pyth_price_info = &ctx.accounts.pyth_quote_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let quote_price = pyth_price.agg.price as u64;
        let quote_total = quote_price * quote_amount;

        // destination token
        let pyth_price_info = &ctx.accounts.pyth_del_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let dest_price = pyth_price.agg.price as u64;

        let transfer_amount = quote_total/dest_price;

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_quote.to_account_info(),
            to: ctx.accounts.quote_pool.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, quote_amount)?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.dest_pool.to_account_info(),
            to: ctx.accounts.user_dest.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, transfer_amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // Token program authority
    #[account(mut)]
    pub authority: Signer<'info>,
    // State Accounts
    #[account(init,
        seeds = [swap_name.as_bytes()],
        bump,
        payer = authority
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    
    pub usdc_mint: Box<Account<'info, Mint>>,
    pub btc_mint: Box<Account<'info, Mint>>,
    #[account(mut,
        seeds = [protocal_name.as_bytes(), b"lpsol_mint".as_ref()]
    )]
    pub lpsol_mint: Box<Account<'info, Mint>>,

    #[account(mut,
        seeds = [protocal_name.as_bytes(), b"lpusd_mint".as_ref()],
    )]
    pub lpusd_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

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
        constraint = user_dest.owner == user_authority.key(),
        constraint = user_dest.mint == dest_mint.key()
    )]
    pub user_dest : Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = dest_pool.owner == state_account.key(),
        constraint = dest_pool.mint == dest_mint.key()
    )]
    pub dest_pool : Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref(), b"swap_pool".as_ref()],
        bump = state_account.bumps.swap_pool)]
    pub swap_pool: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub dest_mint: Account<'info,Mint>,
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct SwapTokenToSOL<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        constraint = user_quote.owner == user_authority.key(),
        constraint = user_quote.mint == quote_mint.key()
    )]
    pub user_quote : Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = quote_pool.owner == state_account.key(),
        constraint = quote_pool.mint == dest_mint.key()
    )]
    pub quote_pool : Box<Account<'info, TokenAccount>>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref(), b"swap_pool".as_ref()],
        bump = state_account.bumps.swap_pool)]
    pub swap_pool: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_mint: Account<'info,Mint>,
    pub pyth_btc_account: AccountInfo<'info>,
    pub pyth_usdc_account: AccountInfo<'info>,
    pub pyth_sol_account: AccountInfo<'info>,
    // Programs and Sysvars
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>
}


#[derive(Accounts)]
pub struct SwapTokenToToken<'info> {
    #[account(mut)]
    pub user_authority: Signer<'info>,
    #[account(mut,
        seeds = [state_account.swap_name.as_ref()],
        bump= state_account.bumps.state_account
    )]
    pub state_account: Box<Account<'info, StateAccount>>,
    #[account(
        mut,
        constraint = user_quote.owner == user_authority.key(),
        constraint = user_quote.mint == quote_mint.key()
    )]
    pub user_quote : Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = quote_pool.owner == state_account.key(),
        constraint = quote_pool.mint == dest_mint.key()
    )]
    pub quote_pool : Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_mint: Account<'info,Mint>,
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