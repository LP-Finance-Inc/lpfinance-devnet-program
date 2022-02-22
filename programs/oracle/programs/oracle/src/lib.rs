use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction };
use anchor_spl::token::{self, CloseAccount, Mint, SetAuthority, MintTo, TokenAccount, Transfer};
use pyth_client;
use std::mem::size_of;
use tokens::{self, token_mint_to, token_burn, token_transfer, TokenMintTo };

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Mainnet-beta data
const BTC_MINT:Pubkey = new Pubkey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
const USDC_MINT:Pubkey = new Pubkey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const LpBTC_MINT:Pubkey = new Pubkey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E');
const LpUSD_MINT:Pubkey = new Pubkey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const LTV:u64 = 85;
const DOMINATOR:u64 = 100;

#[program]
pub mod oracle {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    pub fn deposit_btc(
        ctx: Context<DepositCollateral>,
        amount: u64
    )-> ProgramResult {
        msg!("Deposit BTC");
        
        if ctx.accounts.user_collateral.amount < amount {
            return Err(ErrorCode::InsufficientAmount.into());
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.collateral_pool.to_account_info(),
            to: ctx.accounts.user_collateral.to_account_info(),
            authority: ctx.accounts.user_authority.to_account_info()
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount);

        let user_account =&mut ctx.accounts.user_account;

        if ctx.accounts.user_collateral.mint == BTC_MINT {
            user_account.btc_amount = user_account.btc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == USDC_MINT {
            user_account.usdc_amount = user_account.usdc_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == LpUSD_MINT {
            user_account.lpusd_amount = user_account.lpusd_amount + amount;
        }

        if ctx.accounts.user_collateral.mint == LpBTC_MINT {
            user_account.lpbtc_amount = user_account.lpbtc_amount + amount;
        }

        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSOL>,
        amount: u64
    ) -> ProgramResult {
        msg!("Deposit SOL");

        if **ctx.accounts.user_sol.lamports.borrow() < amount {
            msg!("Insufficient SOL");
            return;
        }

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user_sol.key,
                ctx.accounts.sol_pool.key,
                amount
            ),
            &[
                ctx.accounts.user_sol.to_account_info().clone(),
                ctx.accounts.sol_pool.clone(),
                ctx.accounts.system_program.clone()
            ]
        )?;

        let user_account = &mut ctx.accounts.user_account;
        user_account.sol_amount = user_account.sol_amount + amount;

        Ok(())
    }

    pub fn borrow_lpusd(
        ctx: Context<BorrowLpUSD>,
        amount: u64
    ) -> ProgramResult {
        msg!("Borrow LpUSD");

        // Borrowable TotalPrice. Need to be calculated with LTV
        let &mut total_price = 0;
        let user_account = &mut ctx.accounts.user_account;

        // BTC price
        let pyth_price_info = &ctx.accounts.pyth_btc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let btc_price = pyth_price.agg.price as u64;

        total_price += btc_price * user_account.btc_amount * LTV / DOMINATOR;

        // SOL price
        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;

        total_price += sol_price * user_account.sol_amount * LTV / DOMINATOR;

        // USDC price
        let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_price = pyth_price.agg.price as u64;
        // We think LTV as 100% because of same kind of assets
        total_price += usdc_price * user_account.usdc_amount;

        // LpUSD price
        // We think LTV as 100% because of same kind of assets
        let lpusd_price = usdc_price;        
        total_price += lpusd_price * user_account.lpusd_amount;

        // LpBTC price
        let lpbtc_price = btc_price;
        total_price += lpbtc_price * user_account.lpbtc_amount * LTV / DOMINATOR;

        let &mut borrow_value = lpusd_price * amount;
        if total_price > borrow_value {
            // Mint
            let cpi_program = ctx.accounts.tokens_program.to_account_info();
            let cpi_accounts = TokenMintTo {

            }
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            tokens::cpi::token_mint_to(cpi_context, amount);

            // LpUSD
            if user_account.lpusd_amount > 0 && borrow_value  > 0 {
                if lpusd_price * user_account.lpusd_amount >= borrow_value {
                    user_account.lpusd_amount = user_account.lpusd_amount - borrow_value / lpusd_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpusd_price * user_account.lpusd_amount;
                    user_account.lpusd_amount = 0;
                }
                // Burn with repayment
            }

            // LpBTC
            if user_account.lpbtc_amount > 0 && borrow_value  > 0 {
                if lpbtc_price * user_account.lpbtc_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.lpbtc_amount = user_account.lpbtc_amount - borrow_value / lpbtc_price  * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpbtc_price * user_account.lpbtc_amount * LTV / DOMINATOR;
                    user_account.lpbtc_amount = 0;
                }
            }

            // UDSC
            if user_account.usdc_amount > 0 && borrow_value  > 0 {
                if usdc_price * user_account.usdc_amount >= borrow_value {
                    user_account.usdc_amount = user_account.usdc_amount - borrow_value / usdc_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - usdc_price * user_account.usdc_amount;
                    user_account.usdc_amount = 0;
                }
            }

            // SOL
            if user_account.sol_amount > 0 && borrow_value  > 0 {
                if sol_price * user_account.sol_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.sol_amount = user_account.sol_amount - borrow_value / sol_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - sol_price * user_account.sol_amount* LTV / DOMINATOR;
                    user_account.sol_amount = 0;
                }
            }

            // BTC
            if user_account.btc_amount > 0 && borrow_value  > 0 {
                if btc_price * user_account.btc_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.btc_amount = user_account.btc_amount - borrow_value / btc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - btc_price * user_account.btc_amount;
                    user_account.btc_amount = 0;
                }
            }
        }
    }

    pub fn borrow_lpbtc(
        ctx: Context<BorrowLpBTC>,
        amount: u64
    ) -> ProgramResult {
        msg!("Borrow LpBTC");

        // Borrowable TotalPrice. Need to be calculated with LTV
        let &mut total_price = 0;
        let user_account = &mut ctx.accounts.user_account;

        // BTC price
        let pyth_price_info = &ctx.accounts.pyth_btc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let btc_price = pyth_price.agg.price as u64;

        total_price += btc_price * user_account.btc_amount * LTV / DOMINATOR;

        // SOL price
        let pyth_price_info = &ctx.accounts.pyth_sol_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let sol_price = pyth_price.agg.price as u64;

        total_price += sol_price * user_account.sol_amount * LTV / DOMINATOR;

        // USDC price
        let pyth_price_info = &ctx.accounts.pyth_usdc_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

        let usdc_price = pyth_price.agg.price as u64;
        // We think LTV as 100% because of same kind of assets
        total_price += usdc_price * user_account.usdc_amount;

        // LpUSD price
        // We think LTV as 100% because of same kind of assets
        let lpusd_price = usdc_price;        
        total_price += lpusd_price * user_account.lpusd_amount;

        // LpBTC price
        let lpbtc_price = btc_price;
        total_price += lpbtc_price * user_account.lpbtc_amount * LTV / DOMINATOR;

        let &mut borrow_value = lpbtc_price * amount;

        if total_price > borrow_value {
            // Mint
            let cpi_program = ctx.accounts.tokens_program.to_account_info();
            let cpi_accounts = TokenMintTo {

            }
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            tokens::cpi::token_mint_to(cpi_context, amount);

            // LpUSD
            if user_account.lpusd_amount > 0 && borrow_value  > 0 {
                if lpusd_price * user_account.lpusd_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.lpusd_amount = user_account.lpusd_amount - borrow_value / lpusd_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpusd_price * user_account.lpusd_amount * LTV / DOMINATOR;
                    user_account.lpusd_amount = 0;
                }
                // Burn with repayment
            }

            // LpBTC
            if user_account.lpbtc_amount > 0 && borrow_value  > 0 {
                if lpbtc_price * user_account.lpbtc_amount >= borrow_value {
                    user_account.lpbtc_amount = user_account.lpbtc_amount - borrow_value / lpbtc_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - lpbtc_price * user_account.lpbtc_amount;
                    user_account.lpbtc_amount = 0;
                }
            }

            // UDSC
            if user_account.usdc_amount > 0 && borrow_value  > 0 {
                if usdc_price * user_account.usdc_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.usdc_amount = user_account.usdc_amount - borrow_value / usdc_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - usdc_price * user_account.usdc_amount * LTV / DOMINATOR;
                    user_account.usdc_amount = 0;
                }
            }

            // SOL
            if user_account.sol_amount > 0 && borrow_value  > 0 {
                if sol_price * user_account.sol_amount >= borrow_value * DOMINATOR / LTV {
                    user_account.sol_amount = user_account.sol_amount - borrow_value / sol_price * DOMINATOR / LTV;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - sol_price * user_account.sol_amount * LTV / DOMINATOR;
                    user_account.sol_amount = 0;
                }
            }

            // BTC
            if user_account.btc_amount > 0 && borrow_value  > 0 {
                if btc_price * user_account.btc_amount >= borrow_value {
                    user_account.btc_amount = user_account.btc_amount - borrow_value / btc_price;

                    borrow_value = 0;
                } else {
                    borrow_value = borrow_value - btc_price * user_account.btc_amount;
                    user_account.btc_amount = 0;
                }
            }
        }        
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

#[error]
pub enum ErrorCode {
    #[msg("Insufficient Amount")]
    InsufficientAmount
}