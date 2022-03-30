# LP Finance Program
LP Finance is a decentralized synthetic asset protocol on Solana. LP Finance Protocol allows users to earn interest on supplied tokens and borrow USD and SOL, BTC pegged stablecoin interest-free.

## Contributing/Building
The LP Finance protocol is open source with a focus on developer friendliness and integrations.

## LP Finance Program Library

### Development
Program was developed with [anchor](https://github.com/project-serum/anchor) framework.

#### Environment Setup

1. Install the lastest Rust stable from https://rustup.rs/
2. Install Solana v1.6.1 or later from https://docs.solana.com/cli/install-solana-cli-tools
3. Install anchor environment from [here](https://project-serum.github.io/anchor/getting-started/installation.html)
4. Install the `libudev` development package for your distribution (`libudev-dev` on Debian-derived distros, `libudev-devel` on Redhat-derived).

#### Build

The anchor build is available for building programs against your host machine:

```
$ anchor build
```

To deploy the program
```
$ anchor deploy
```

To initialize the program with tokens and other configurations
```
$ anchor migrate
```

#### Test
To test the program
```
anchor test
```
