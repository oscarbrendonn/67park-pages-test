// Mechanically extracted from Six Seven Park 24d08ced. Original untouched.
import * as THREE from 'three';
const CATALOG={
  "friendsie_1": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        1218,
        1218
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1800
      ]
    },
    {
      "ord": 2,
      "slot": "held",
      "prims": [
        1614
      ]
    },
    {
      "ord": 3,
      "slot": "kicks",
      "prims": [
        659
      ]
    }
  ],
  "friendsie_100": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2146
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        1084
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1800
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        1514
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        2385
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        2992
      ]
    }
  ],
  "friendsie_1000": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        71865
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        239
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "back",
      "prims": [
        614
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        860
      ]
    }
  ],
  "friendsie_1111": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2251
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        956
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        1614
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        3009
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        1853
      ]
    }
  ],
  "friendsie_12": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        1116,
        1116
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 2,
      "slot": "held",
      "prims": [
        1278
      ]
    },
    {
      "ord": 3,
      "slot": "back",
      "prims": [
        1193
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        659
      ]
    }
  ],
  "friendsie_123": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        933
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        1743
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1800
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        435
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        1497
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        1648
      ]
    }
  ],
  "friendsie_200": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        3606
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        513
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        727
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        740
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        659
      ]
    }
  ],
  "friendsie_2000": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2056
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        513
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        418
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        2946
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        861
      ]
    }
  ],
  "friendsie_250": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2835
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 2,
      "slot": "held",
      "prims": [
        805
      ]
    },
    {
      "ord": 3,
      "slot": "back",
      "prims": [
        715
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        2657
      ]
    }
  ],
  "friendsie_2500": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        4747,
        4747
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 2,
      "slot": "back",
      "prims": [
        1258
      ]
    },
    {
      "ord": 3,
      "slot": "kicks",
      "prims": [
        860
      ]
    }
  ],
  "friendsie_333": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2964,
        2964
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 2,
      "slot": "held",
      "prims": [
        685
      ]
    },
    {
      "ord": 3,
      "slot": "back",
      "prims": [
        1885
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        767
      ]
    }
  ],
  "friendsie_3333": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2182,
        2182
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        1729
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        1201
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        1258
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        910
      ]
    }
  ],
  "friendsie_404": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        1147,
        1147
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        555
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        418
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        715
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        10921
      ]
    }
  ],
  "friendsie_500": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        789,
        789
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        2716
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        472
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        1661
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        2634
      ]
    }
  ],
  "friendsie_5000": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        890,
        890
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        1500
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        1201
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        659
      ]
    }
  ],
  "friendsie_555": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        626,
        626
      ]
    },
    {
      "ord": 1,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 2,
      "slot": "held",
      "prims": [
        1201
      ]
    },
    {
      "ord": 3,
      "slot": "back",
      "prims": [
        1374
      ]
    },
    {
      "ord": 4,
      "slot": "kicks",
      "prims": [
        861
      ]
    }
  ],
  "friendsie_666": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2388
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        399
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        1424
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        3136
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        860
      ]
    }
  ],
  "friendsie_777": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        2729
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        1743
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        805
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        2110
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        664
      ]
    }
  ],
  "friendsie_88": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        3606
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        959
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1800
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        539
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        425
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        2634
      ]
    }
  ],
  "friendsie_888": [
    {
      "ord": 0,
      "slot": "head",
      "prims": [
        3690,
        3690
      ]
    },
    {
      "ord": 1,
      "slot": "sprout",
      "prims": [
        515
      ]
    },
    {
      "ord": 2,
      "slot": "body",
      "prims": [
        1796
      ]
    },
    {
      "ord": 3,
      "slot": "held",
      "prims": [
        418
      ]
    },
    {
      "ord": 4,
      "slot": "back",
      "prims": [
        614
      ]
    },
    {
      "ord": 5,
      "slot": "kicks",
      "prims": [
        860
      ]
    }
  ]
}
;
export function meshesByOrd(root                , key        )                                   {
  const entries = (CATALOG[key] ?? []).slice().sort((a, b) => a.ord - b.ord)
  const out = new Map                             ()
  const hasPrims = entries.some((e) => (e.prims?.length ?? 0) > 0)
  let oi = 0
  let pi = 0
  let legacy = -1
  root.traverse((c) => {
    const sm = c                     
    if (!sm.isSkinnedMesh) return
    if (!hasPrims) {
      // eski katalog: düz sıra (tek primitifli dosyalarda doğruydu)
      legacy++
      const e = entries[legacy]
      if (e) {
        const arr = out.get(e.ord) ?? []
        arr.push(sm)
        out.set(e.ord, arr)
      }
      return
    }
    const count = sm.geometry?.attributes?.position?.count ?? -1
    while (oi < entries.length) {
      const prims = entries[oi].prims ?? []
      if (pi < prims.length && prims[pi] === count) {
        const arr = out.get(entries[oi].ord) ?? []
        arr.push(sm)
        out.set(entries[oi].ord, arr)
        pi++
        return
      }
      oi++
      pi = 0
    }
    // katalog dışı mesh (sonradan eklenmiş olabilir) — ord'suz bırak, budanmaz
  })
  return out
}

export function canonicalBaseBounds(root                , key        )             {
  root.updateMatrixWorld(true) // precondition'a güvenme — direct kullanımda da doğru
  const box = new THREE.Box3()
  const byOrd = meshesByOrd(root, key)
  for (const e of CATALOG[key] ?? []) {
    if (e.slot !== 'body' && e.slot !== 'head') continue
    for (const m of byOrd.get(e.ord) ?? []) box.expandByObject(m)
  }
  if (box.isEmpty()) box.setFromObject(root) // katalog dışı savunma
  return box
}

