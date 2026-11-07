/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/oja.json`.
 */
export type Oja = {
  "address": "6rpwpnvUSRzTMNR5R7kNAC9PFJJugJLCQUL9yZfRAwRu",
  "metadata": {
    "name": "oja",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Òjà: Solana Pay receipts that build a trader's credit history, and advances that repay themselves"
  },
  "instructions": [
    {
      "name": "cancelAdvance",
      "discriminator": [
        57,
        217,
        75,
        4,
        100,
        121,
        216,
        180
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "merchant",
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
                "path": "owner"
              }
            ]
          },
          "relations": [
            "advance"
          ]
        },
        {
          "name": "advance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  118,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "account",
                "path": "advance.index",
                "account": "advance"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "fundAdvance",
      "discriminator": [
        166,
        61,
        17,
        242,
        252,
        112,
        35,
        22
      ],
      "accounts": [
        {
          "name": "lender",
          "writable": true,
          "signer": true
        },
        {
          "name": "merchant",
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
                "path": "merchant.owner",
                "account": "merchant"
              }
            ]
          },
          "relations": [
            "advance"
          ]
        },
        {
          "name": "advance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  118,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "account",
                "path": "advance.index",
                "account": "advance"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "lenderToken",
          "writable": true
        },
        {
          "name": "merchantToken",
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
      "name": "initMerchant",
      "discriminator": [
        209,
        11,
        214,
        195,
        222,
        157,
        124,
        192
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "merchant",
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
                "path": "owner"
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
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "payInvoice",
      "discriminator": [
        104,
        6,
        62,
        239,
        197,
        206,
        208,
        220
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "feePayer",
          "docs": [
            "Pays the receipt's rent and usually the transaction fee: the shop's sponsor, or the payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "merchant",
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
                "path": "merchant.owner",
                "account": "merchant"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "payerToken",
          "writable": true
        },
        {
          "name": "merchantToken",
          "writable": true
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "arg",
                "path": "invoiceId"
              }
            ]
          }
        },
        {
          "name": "advance",
          "writable": true,
          "optional": true
        },
        {
          "name": "lenderToken",
          "writable": true,
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "invoiceId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "requestAdvance",
      "discriminator": [
        30,
        94,
        222,
        131,
        223,
        83,
        0,
        28
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "merchant"
          ]
        },
        {
          "name": "merchant",
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
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "advance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  118,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "merchant"
              },
              {
                "kind": "account",
                "path": "merchant.advanceCount",
                "account": "merchant"
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
          "name": "principal",
          "type": "u64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "repayBps",
          "type": "u16"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "advance",
      "discriminator": [
        66,
        25,
        217,
        133,
        38,
        192,
        224,
        218
      ]
    },
    {
      "name": "merchant",
      "discriminator": [
        71,
        235,
        30,
        40,
        231,
        21,
        32,
        64
      ]
    },
    {
      "name": "receipt",
      "discriminator": [
        39,
        154,
        73,
        106,
        80,
        102,
        145,
        153
      ]
    }
  ],
  "events": [
    {
      "name": "advanceFunded",
      "discriminator": [
        45,
        71,
        181,
        151,
        172,
        82,
        223,
        40
      ]
    },
    {
      "name": "advanceRepaid",
      "discriminator": [
        185,
        191,
        136,
        90,
        224,
        95,
        1,
        197
      ]
    },
    {
      "name": "advanceRequested",
      "discriminator": [
        139,
        249,
        209,
        108,
        1,
        107,
        150,
        25
      ]
    },
    {
      "name": "saleRecorded",
      "discriminator": [
        142,
        88,
        165,
        117,
        120,
        73,
        169,
        110
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidName",
      "msg": "Shop name must be 1 to 32 bytes"
    },
    {
      "code": 6001,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6002,
      "name": "wrongMint",
      "msg": "This token is not the currency this shop accepts"
    },
    {
      "code": 6003,
      "name": "wrongPayerAccount",
      "msg": "The paying token account does not belong to the payer"
    },
    {
      "code": 6004,
      "name": "wrongMerchantAccount",
      "msg": "The receiving token account does not belong to the shop owner"
    },
    {
      "code": 6005,
      "name": "advanceAccountsMissing",
      "msg": "This shop has an advance, so the advance account must be included"
    },
    {
      "code": 6006,
      "name": "wrongAdvance",
      "msg": "That is not this shop's current advance"
    },
    {
      "code": 6007,
      "name": "wrongLenderAccount",
      "msg": "Repayment must go to the lender's own token account"
    },
    {
      "code": 6008,
      "name": "notMerchantOwner",
      "msg": "Only the shop owner can do this"
    },
    {
      "code": 6009,
      "name": "advanceAlreadyOpen",
      "msg": "This shop already has an open advance"
    },
    {
      "code": 6010,
      "name": "selfPayment",
      "msg": "A shop cannot pay itself"
    },
    {
      "code": 6011,
      "name": "notEnoughHistory",
      "msg": "Not enough recorded sales to qualify for an advance yet"
    },
    {
      "code": 6012,
      "name": "notEnoughPayers",
      "msg": "Not enough different customers to qualify for an advance yet"
    },
    {
      "code": 6013,
      "name": "advanceTooLarge",
      "msg": "Advance is larger than the limit set by recorded sales"
    },
    {
      "code": 6014,
      "name": "aboveCreditLadder",
      "msg": "Advance is above this shop's credit ladder step; repay advances to climb"
    },
    {
      "code": 6015,
      "name": "repayShareOutOfRange",
      "msg": "Repayment share must be between 5% and 50% of each sale"
    },
    {
      "code": 6016,
      "name": "feeTooHigh",
      "msg": "Fee can be at most 20%"
    },
    {
      "code": 6017,
      "name": "advanceNotRequested",
      "msg": "This advance is not waiting for funding"
    },
    {
      "code": 6018,
      "name": "selfFunding",
      "msg": "A shop cannot fund its own advance"
    },
    {
      "code": 6019,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "advance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u32"
          },
          {
            "name": "lender",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "feeBps",
            "type": "u16"
          },
          {
            "name": "repayBps",
            "type": "u16"
          },
          {
            "name": "totalDue",
            "type": "u64"
          },
          {
            "name": "repaid",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "advanceStatus"
              }
            }
          },
          {
            "name": "requestedTs",
            "type": "i64"
          },
          {
            "name": "fundedTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "advanceFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "advance",
            "type": "pubkey"
          },
          {
            "name": "lender",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "advanceRepaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "advance",
            "type": "pubkey"
          },
          {
            "name": "totalRepaid",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "advanceRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "advance",
            "type": "pubkey"
          },
          {
            "name": "principal",
            "type": "u64"
          },
          {
            "name": "totalDue",
            "type": "u64"
          },
          {
            "name": "repayBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "advanceStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "requested"
          },
          {
            "name": "active"
          },
          {
            "name": "repaid"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "merchant",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalReceived",
            "type": "u64"
          },
          {
            "name": "saleCount",
            "type": "u32"
          },
          {
            "name": "uniquePayers",
            "type": "u32"
          },
          {
            "name": "recentPayers",
            "type": {
              "array": [
                "pubkey",
                16
              ]
            }
          },
          {
            "name": "payerCursor",
            "type": "u8"
          },
          {
            "name": "advanceCount",
            "type": "u32"
          },
          {
            "name": "completedAdvances",
            "type": "u16"
          },
          {
            "name": "firstSaleTs",
            "type": "i64"
          },
          {
            "name": "lastSaleTs",
            "type": "i64"
          },
          {
            "name": "currentAdvance",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "receipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "invoiceId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lenderShare",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "saleRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "receipt",
            "type": "pubkey"
          },
          {
            "name": "payer",
            "type": "pubkey"
          },
          {
            "name": "invoiceId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lenderShare",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
