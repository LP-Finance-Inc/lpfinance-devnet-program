/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  AccountInfo,
} from '@solana/web3.js';

import path from 'path';
import * as borsh from 'borsh';
  
import {
  parseMappingData,
  parsePriceData,
  parseProductData,
} from "@pythnetwork/client";

const ORACLE_PUBLIC_KEY = "BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2";
 
const chunks = (array, size) => {
  return Array.apply(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}

export const getMultipleAccounts = async (
  connection,
  keys,
  commitment
) => {
  const result = await Promise.all(
    chunks(keys, 99).map((chunk) =>
      getMultipleAccountsCore(connection, chunk, commitment)
    )
  );

  const array = result
    .map((a) => a.array.map((acc) => {
      if (!acc) return undefined;

      const { data, ...rest } = acc;
      const obj = {
        ...rest,
        data: Buffer.from(data[0], "base64"),
      };
      return obj;
    }).filter((_) => _)
    )
    .flat();
  return { keys, array };
};
  
const getMultipleAccountsCore = async (
  connection,
  keys,
  commitment
) => {
  const args = connection._buildArgs([keys], commitment, "base64");

  const unsafeRes = await connection._rpcRequest("getMultipleAccounts", args);
  if (unsafeRes.error) {
    throw new Error(
      "failed to get info about account " + unsafeRes.error.message
    );
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value;
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};

/**
 * 
 * Get Tokens' Price List from Pyth.net
 */
export async function getTokensPriceList(connection) {
  let priceList = [];
  // read mapping account
  const publicKey = new PublicKey(ORACLE_PUBLIC_KEY);

  try {
    const accountInfo = await connection.getAccountInfo(publicKey);   
      
    const {
      productAccountKeys,
      nextMappingAccount,
    } = parseMappingData(accountInfo.data);
    let allProductAccountKeys = [...productAccountKeys];
    let anotherMappingAccount = nextMappingAccount;

    while (anotherMappingAccount) {
      const accountInfo = await connection.getAccountInfo(
        anotherMappingAccount
      );
      if (!accountInfo || !accountInfo.data) {
        anotherMappingAccount = null;
      } else {
        const { productAccountKeys, nextMappingAccount } = parseMappingData(
          accountInfo.data
        );
        allProductAccountKeys = [
          ...allProductAccountKeys,
          ...productAccountKeys,
        ];
        anotherMappingAccount = nextMappingAccount;
      }
    }
    // setIsLoading(false);
    // setNumProducts(productAccountKeys.length);
    const productsInfos = await getMultipleAccounts(
      connection,
      productAccountKeys.map((p) => p.toBase58()),
      "confirmed"
    );
    const productsData = productsInfos.array.map((p) =>
      parseProductData(p.data)
    );
    const priceInfos = await getMultipleAccounts(
      connection,
      productsData.map((p) => p.priceAccountKey.toBase58()),
      "confirmed"
    );
    for (let i = 0; i < productsInfos.keys.length; i++) {
      const key = productsInfos.keys[i];

      const productData = productsData[i];
      const product = productData.product;
      const symbol = product["symbol"];
      const priceAccountKey = productData.priceAccountKey;
      const priceInfo = priceInfos.array[i];

      // console.log(
      //   `Product ${symbol} key: ${key} price: ${priceInfos.keys[i]}`
      // );
      
      if (!accountInfo || !accountInfo.data) return;
      
      const price = parsePriceData(priceInfo.data);
      if (price.priceType !== 1)
        console.log('Not 1:',symbol, price.priceType, price.nextPriceAccountKey);
      priceList.push({'Symbol' : symbol, 'Price': price.price})
    }
    return priceList;
  } catch (e) {
    console.warn(
      e
    );
  }
}