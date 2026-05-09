/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/remesa_liquidez.json`.
 */
export type RemesaLiquidez = {
  "address": "Fprb6jTLfjXfZ6yuWzS7LVXxwVvPbPgPZiEqDEL9bRfj",
  "metadata": {
    "name": "remesaLiquidez",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelReservation",
      "docs": [
        "Refund path. Receiver may cancel anytime while Active; sender may only",
        "cancel after `expires_at`."
      ],
      "discriminator": [
        72,
        162,
        75,
        180,
        116,
        157,
        146,
        172
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Either the receiver (anytime) or the sender (post-expiry)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "reservation"
          ]
        },
        {
          "name": "reservation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "reservation.receiver",
                "account": "turnReservation"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "reservation"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "reservation"
              }
            ]
          }
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "docs": [
        "One-shot bootstrap: persists the protocol admin pubkey in a singleton",
        "Config PDA. Required before any treasury withdrawal."
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeReservation",
      "docs": [
        "Sender locks `amount` SPL tokens into a PDA-controlled vault for the",
        "receiver. Optionally pre-selects a merchant; otherwise the merchant",
        "slot is locked-on-claim during `validate_cashout`."
      ],
      "discriminator": [
        189,
        141,
        54,
        110,
        172,
        56,
        70,
        240
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver",
          "docs": [
            "recorded on the reservation and is validated on subsequent ixs."
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "reservation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "receiver"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "reservation"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "expirySeconds",
          "type": "i64"
        },
        {
          "name": "preferredMerchant",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "markVerified",
      "docs": [
        "Records that the receiver has completed off-chain humanity verification",
        "(World ID). Signed by the sender — whose backend integrates with the",
        "World ID API and is therefore the trust anchor for the proof. Once",
        "flipped, `validate_cashout` no longer requires the receiver's signature."
      ],
      "discriminator": [
        225,
        5,
        129,
        73,
        85,
        242,
        84,
        148
      ],
      "accounts": [
        {
          "name": "sender",
          "docs": [
            "The sender that funded the reservation. The sender's app/backend is the",
            "integration point with the World ID API and is therefore the trust",
            "anchor authorized to flip `is_verified`."
          ],
          "signer": true,
          "relations": [
            "reservation"
          ]
        },
        {
          "name": "reservation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "reservation.receiver",
                "account": "turnReservation"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "registerMerchant",
      "docs": [
        "Whitelist a merchant pubkey so it can be a counterparty in",
        "`validate_cashout`."
      ],
      "discriminator": [
        238,
        245,
        77,
        132,
        161,
        88,
        216,
        248
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Admin paying for the whitelist account creation. In a production",
            "deployment this should be gated by a Config PDA / multisig; for the",
            "MVP we trust the first account that registers a given merchant."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "merchant"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "merchant",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setMerchantStatus",
      "docs": [
        "Toggle a merchant's active flag (admin-only)."
      ],
      "discriminator": [
        76,
        172,
        99,
        200,
        233,
        226,
        212,
        102
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "merchant_account.merchant",
                "account": "merchantAccount"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "active",
          "type": "bool"
        }
      ]
    },
    {
      "name": "validateCashout",
      "docs": [
        "Merchant-only settlement that releases the vault tokens to a whitelisted",
        "merchant. Requires `is_verified == true` (set by `mark_verified`) so the",
        "receiver does not need to sign at the point of sale."
      ],
      "discriminator": [
        233,
        128,
        185,
        215,
        246,
        94,
        85,
        109
      ],
      "accounts": [
        {
          "name": "merchant",
          "docs": [
            "Merchant providing physical liquidity. Sole signer of the cash-out and",
            "payer for the lazy treasury init (cheap rent on first use per mint)."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantWhitelist",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  99,
                  104,
                  97,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              }
            ]
          }
        },
        {
          "name": "reservation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "reservation.receiver",
                "account": "turnReservation"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "SPL mint backing the reservation."
          ],
          "relations": [
            "reservation"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "reservation"
              }
            ]
          }
        },
        {
          "name": "merchantTokenAccount",
          "writable": true
        },
        {
          "name": "treasuryAuthority",
          "docs": [
            "Treasury authority PDA. Owns every per-mint treasury vault. Validated",
            "by seeds; never signs from this instruction (only fees flow in)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryTokenAccount",
          "docs": [
            "Per-mint treasury token account. Initialized lazily on the first",
            "`validate_cashout` for the given mint (merchant pays the rent)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawTreasury",
      "docs": [
        "Drain accumulated fees from the per-mint treasury vault. Admin-only."
      ],
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Must match `config.admin`."
          ],
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "treasuryAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "merchantAccount",
      "discriminator": [
        182,
        10,
        106,
        140,
        73,
        79,
        234,
        186
      ]
    },
    {
      "name": "turnReservation",
      "discriminator": [
        17,
        73,
        150,
        47,
        164,
        45,
        209,
        229
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "reservationNotActive",
      "msg": "Reservation is not in Active status"
    },
    {
      "code": 6001,
      "name": "invalidMerchant",
      "msg": "Merchant is not whitelisted or does not match the locked merchant"
    },
    {
      "code": 6002,
      "name": "reservationExpired",
      "msg": "Reservation has already expired"
    },
    {
      "code": 6003,
      "name": "unauthorizedCancellation",
      "msg": "Caller is not authorized to cancel this reservation"
    },
    {
      "code": 6004,
      "name": "waitUntilExpiration",
      "msg": "Sender must wait until expiration to cancel"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6006,
      "name": "invalidExpiry",
      "msg": "Expiry duration is invalid"
    },
    {
      "code": 6007,
      "name": "senderMismatch",
      "msg": "Provided sender does not match the reservation sender"
    },
    {
      "code": 6008,
      "name": "receiverMismatch",
      "msg": "Provided receiver does not match the reservation receiver"
    },
    {
      "code": 6009,
      "name": "mintMismatch",
      "msg": "Provided mint does not match the reservation mint"
    },
    {
      "code": 6010,
      "name": "numericOverflow",
      "msg": "Numeric overflow"
    },
    {
      "code": 6011,
      "name": "receiverNotVerified",
      "msg": "Receiver has not completed off-chain humanity verification (World ID)"
    },
    {
      "code": 6012,
      "name": "alreadyVerified",
      "msg": "Reservation has already been marked as verified"
    },
    {
      "code": 6013,
      "name": "unauthorizedAdmin",
      "msg": "Caller is not the protocol admin"
    },
    {
      "code": 6014,
      "name": "insufficientTreasury",
      "msg": "Treasury vault has insufficient funds for the requested withdrawal"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Singleton governance account that owns the protocol treasury. Its pubkey",
        "is `[CONFIG_SEED]`. The `admin` is the only account allowed to drain the",
        "per-mint treasury vaults via `withdraw_treasury`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "merchantAccount",
      "docs": [
        "Whitelist entry that authorizes a merchant pubkey to settle reservations.",
        "",
        "PDA seeds: `[b\"merchant\", merchant.key().as_ref()]`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "reservationStatus",
      "docs": [
        "Lifecycle of a turn-based remittance reservation."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "turnReservation",
      "docs": [
        "Escrow record that bridges a digital remittance with a physical cash-out.",
        "",
        "PDA seeds: `[b\"reservation\", receiver.key().as_ref()]`. This implies a",
        "single active reservation per receiver at a time, which is the \"turn\"",
        "abstraction the program is named after."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sender",
            "docs": [
              "Funder of the remittance (pays the SPL tokens, also pays rent)."
            ],
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "docs": [
              "World-ID-bound recipient that will collect cash at the merchant."
            ],
            "type": "pubkey"
          },
          {
            "name": "merchant",
            "docs": [
              "Locked merchant pubkey. `Pubkey::default()` means the slot is open and",
              "will be locked-on-claim during `validate_cashout`."
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "SPL mint backing the escrow (USDC, MXNe, etc.)."
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Tokens held in escrow."
            ],
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "docs": [
              "Unix timestamp after which the sender may cancel."
            ],
            "type": "i64"
          },
          {
            "name": "isVerified",
            "docs": [
              "Off-chain humanity verification flag (e.g. World ID). When true, the",
              "receiver no longer needs to sign at the merchant's point of sale.",
              "Flipped by `mark_verified` after the sender's backend validates the",
              "World ID proof."
            ],
            "type": "bool"
          },
          {
            "name": "status",
            "docs": [
              "Lifecycle status."
            ],
            "type": {
              "defined": {
                "name": "reservationStatus"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump for the reservation PDA."
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Bump for the vault token account PDA."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
