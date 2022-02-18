use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction };
use anchor_spl::token::{self, CloseAccount, Mint, SetAuthority, MintTo, TokenAccount, Transfer};
use pyth_client;
use std::mem::size_of;
use tokens::{self, token_mint_to, token_burn, token_transfer, TokenMintTo };

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod oracle {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    // Mint lpbtc stable coin
    // BTC/USD
    pub fn mint_lpbtc (
        ctx: Context<MintLpBtc>,
        btc_amount: u64
    ) -> ProgramResult {
        let user_lpbtc = ctx.accounts.user_lpbtc.to_account_info();

        // Get BTC/USD price from pyth network using their client
        let pyth_price_info = &ctx.accounts.pyth_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let btc_usd_price = pyth_price.agg.price as u64;

        if btc_usd_price < 0 {
            msg!("Invalid BTC price");
        }

        // Amount of our CBS(LpBTC) amount
        let amount_to_mint = btc_usd_price * btc_amount;

        // Mint LpToken using CPI
        let cpi_program = ctx.accounts.tokens_program.to_account_info();
        let cpi_accounts = TokenMintTo {
        }
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts;)
        tokens::cpi::token_mint_to(cpi_context, amount_to_mint);
        Ok(())
    }

    // Mint lpusd stable coin
    // USD/USD
    pub fn mint_lpusd (
        ctx: Context<MintLpUSD>,
        usd_amount: u64
    ) -> ProgramResult {
        // Get USD/USD price from pyth network using their client
        let pyth_price_info = &ctx.accounts.pyth_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_usd_price = pyth_price.agg.price as u64;

        if usdc_usd_price < 0 {
            msg!("Invalid USD price");
        }

        // Amount of our CBS(LpUSD) amount
        let amount_to_mint = usdc_usd_price * usd_amount;

        // Mint LpToken using CPI
        let cpi_program = ctx.accounts.tokens_program.to_account_info();
        let cpi_accounts = TokenMintTo {
        }
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        tokens::cpi::token_mint_to(cpi_context, amount_to_mint);
        
        Ok(())
    }

    // Mint lpcad stable coin
    // CAD/USD
    pub fn mint_lpcad (
        ctx: Context<MintLpCAD>,
        cad_amount: u64
    ) -> ProgramResult {
        // Get USD/USD price from pyth network using their client
        let pyth_price_info = &ctx.accounts.pyth_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let cad_usd_price = pyth_price.agg.price as u64;

        if cad_usd_price < 0 {
            msg!("Invalid CAD price");
        }

        // Amount of our CBS(LpCAD) amount
        let amount_to_mint = cad_usd_price * cad_amount;

        // Mint LpToken using CPI
        let cpi_program = ctx.accounts.tokens_program.to_account_info();
        let cpi_accounts = TokenMintTo {
        }
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts;)
        tokens::cpi::token_mint_to(cpi_context, amount_to_mint);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
#[instruction(bumps: OracleBumps)]
pub struct MintLpBtc<'info> {
    #[account(mut)]
    pub user_account: Signer<'info>
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct OracleBumps{
    pub lptoken_account: u8,
    pub lptoken_mint: u8
}
