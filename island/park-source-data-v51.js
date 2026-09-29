// Source: Six Seven Park 24d08ced0ed33b018353980f0ca2ed2e80a9e809. Original never modified.
/**
 * Karakter kadrosu — friendsie base listesi + fRiENDSiES stili trait/rarity
 * sunum verisi. Seçim/kuşanma durumu ve kalıcılık equip.ts'tedir (slot sistemi).
 * Buradaki traits dizileri artık PARÇA ETİKETLERİ için kullanılır (partLabel).
 */

/** Trait kategorisi — fRiENDSiES sunum stili; 8 slot: Head, Body, Sprout, Back, Kicks, Held, Power, Vibe */
                        
             
              
               
 

                                                             

                               
            
              
                                                               
                     
                                             
            
                
                    
                 
 

const T = (cat        , icon        , value        )        => ({ cat, icon, value })

export const RARITY_STYLE                                                            = {
  Common: { bg: '#f3e4c2', fg: '#a98f6a', label: 'COMMON' },
  Rare: { bg: '#d8ebff', fg: '#3a6ea8', label: 'RARE ✦' },
  Epic: { bg: '#e9dfff', fg: '#7a4fd0', label: 'EPIC ✦✦' },
  Legendary: { bg: '#ffefc2', fg: '#a8780a', label: 'LEGENDARY 👑' },
}

/**
 * Karakter kadrosu — her buddy'nin trait kartı fRiENDSiES tonunda:
 * kısa, oyunbaz isimler; kategori başına bir parça; nadirlik adedi.
 * (Trait isimleri slot sistemindeki GLB parçalarının etiketi olarak kullanılır.)
 */
export const CHARACTERS                 = [
  {
    id: 'goril', name: 'Gorilla 67', file: null, no: 0,
    rarity: 'Legendary', rarityNote: 'the one and only',
    traits: [T('Sprout', '👑', 'Golden Crown'), T('Held', '🌸', 'Flower Blossom'), T('Vibe', '✨', 'Park Champion')],
  },
  { id: 'friendsie_1', name: 'Buddy #1', file: 'friendsie_1.glb', no: 1, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🧢', 'Happy Cap'), T('Sprout', '🌱', 'Little Sprout'), T('Back', '🎒', 'Star Pack'), T('Vibe', '☀️', 'Sunny')] },
  { id: 'friendsie_100', name: 'Buddy #100', file: 'friendsie_100.glb', no: 2, rarity: 'Rare', rarityNote: 'rare find', traits: [T('Head', '🤠', 'Cowboy Hat'), T('Back', '🐱', 'Travel Cat'), T('Kicks', '👟', 'Dusty Boots'), T('Vibe', '🧭', 'Wanderer')] },
  { id: 'friendsie_1000', name: 'Buddy #1000', file: 'friendsie_1000.glb', no: 3, rarity: 'Epic', rarityNote: 'super rare', traits: [T('Head', '👸', 'Princess Crown'), T('Back', '🪽', 'Pretty Wings'), T('Vibe', '💖', 'Royal')] },
  { id: 'friendsie_1111', name: 'Buddy #1111', file: 'friendsie_1111.glb', no: 4, rarity: 'Epic', rarityNote: 'super rare', traits: [T('Head', '🧙', 'Wizardance'), T('Sprout', '🔮', 'Magic'), T('Back', '📿', 'Spell Bag'), T('Vibe', '🌙', 'Mystic')] },
  { id: 'friendsie_12', name: 'Buddy #12', file: 'friendsie_12.glb', no: 5, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🐰', 'Bunbun Ears'), T('Back', '🐞', 'Hugbug'), T('Vibe', '🤗', 'Cuddly')] },
  { id: 'friendsie_123', name: 'Buddy #123', file: 'friendsie_123.glb', no: 6, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '💐', 'Flower Light'), T('Sprout', '🌼', 'Blue Daisy'), T('Back', '🌷', 'Flowery'), T('Vibe', '🌿', 'Garden')] },
  { id: 'friendsie_200', name: 'Buddy #200', file: 'friendsie_200.glb', no: 7, rarity: 'Rare', rarityNote: 'rare find', traits: [T('Head', '📡', 'Rainbow Antenna'), T('Back', '🚀', 'Rocket'), T('Kicks', '👟', 'Turbo Laces'), T('Vibe', '💨', 'Zoom')] },
  { id: 'friendsie_2000', name: 'Buddy #2000', file: 'friendsie_2000.glb', no: 8, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🥤', 'Pop Top Red'), T('Back', '🧃', 'Juice'), T('Vibe', '🫧', 'Fizzy')] },
  { id: 'friendsie_250', name: 'Buddy #250', file: 'friendsie_250.glb', no: 9, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '👨‍🍳', 'Chef'), T('Back', '🌮', 'Taco'), T('Vibe', '😋', 'Tasty')] },
  { id: 'friendsie_2500', name: 'Buddy #2500', file: 'friendsie_2500.glb', no: 10, rarity: 'Rare', rarityNote: 'rare find', traits: [T('Head', '☁️', 'Happy Cloud'), T('Back', '🛹', 'Skate or Die'), T('Kicks', '🛼', 'Deck Rollers'), T('Vibe', '🔥', 'Shredder')] },
  { id: 'friendsie_333', name: 'Buddy #333', file: 'friendsie_333.glb', no: 11, rarity: 'Rare', rarityNote: 'rare find', traits: [T('Head', '🐈‍⬛', 'Black Kitty'), T('Back', '👻', 'Ghostin'), T('Vibe', '🎃', 'Spooky-cute')] },
  { id: 'friendsie_3333', name: 'Buddy #3333', file: 'friendsie_3333.glb', no: 12, rarity: 'Legendary', rarityNote: '1 of 1', traits: [T('Head', '🧚', 'Golden Fairy'), T('Back', '🌈', 'Rainbow Wings'), T('Vibe', '🌇', 'Golden Hour')] },
  { id: 'friendsie_404', name: 'Buddy #404', file: 'friendsie_404.glb', no: 13, rarity: 'Epic', rarityNote: 'super rare', traits: [T('Head', '🤖', 'Blip'), T('Back', '📼', 'Glitch Pack'), T('Vibe', '📺', 'Lost Signal')] },
  { id: 'friendsie_500', name: 'Buddy #500', file: 'friendsie_500.glb', no: 14, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🐱', 'Cyan Kitty'), T('Back', '🤿', 'Aqualung'), T('Vibe', '💦', 'Splash')] },
  { id: 'friendsie_5000', name: 'Buddy #5000', file: 'friendsie_5000.glb', no: 15, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🍒', 'Cherry'), T('Back', '🍨', 'Ice Cream Scoop'), T('Vibe', '🍬', 'Sweet')] },
  { id: 'friendsie_555', name: 'Buddy #555', file: 'friendsie_555.glb', no: 16, rarity: 'Rare', rarityNote: 'rare find', traits: [T('Head', '⚡', 'Zap'), T('Back', '🔋', 'Battery Pack'), T('Kicks', '👟', 'Volt Runners'), T('Vibe', '🔌', 'Charged')] },
  { id: 'friendsie_666', name: 'Buddy #666', file: 'friendsie_666.glb', no: 17, rarity: 'Epic', rarityNote: 'super rare', traits: [T('Head', '😈', 'Spirit Horns'), T('Back', '🔥', 'Flame'), T('Vibe', '🌶️', 'Little Devil')] },
  { id: 'friendsie_777', name: 'Buddy #777', file: 'friendsie_777.glb', no: 18, rarity: 'Legendary', rarityNote: '1 of 1', traits: [T('Head', '🍄', 'Sacred Gnome'), T('Back', '🌠', 'Wishes'), T('Vibe', '🍀', 'Lucky')] },
  { id: 'friendsie_88', name: 'Buddy #88', file: 'friendsie_88.glb', no: 19, rarity: 'Common', rarityNote: 'a classic garden friend', traits: [T('Head', '🎀', 'Bow Red'), T('Back', '⭐', 'Star Bag'), T('Vibe', '💫', 'Twinkle')] },
  { id: 'friendsie_888', name: 'Buddy #888', file: 'friendsie_888.glb', no: 20, rarity: 'Legendary', rarityNote: '1 of 1', traits: [T('Head', '🌥️', 'Little Golden Cloud'), T('Back', '🦇', 'Golden Bat'), T('Vibe', '🎰', 'Jackpot')] },
]

export const catalog={
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
export const partNames={
  "friendsie_1:0": "Sunny Romper",
  "friendsie_1:1": "Sunny Core",
  "friendsie_1:2": "Flower Blossom",
  "friendsie_1:3": "Puddle Hoppers",
  "friendsie_100:0": "Wanderer Poncho",
  "friendsie_100:1": "Cowboy Hat",
  "friendsie_100:2": "Wanderer Core",
  "friendsie_100:3": "Pocket Pal",
  "friendsie_100:4": "Travel Cat",
  "friendsie_100:5": "Dusty Boots",
  "friendsie_1000:0": "Royal Gown",
  "friendsie_1000:1": "Princess Crown",
  "friendsie_1000:2": "Royal Core",
  "friendsie_1000:3": "Pretty Wings",
  "friendsie_1000:4": "Glass Slippers",
  "friendsie_1111:0": "Mystic Robe",
  "friendsie_1111:1": "Wizardance",
  "friendsie_1111:2": "Mystic Core",
  "friendsie_1111:3": "Mystic Bloom",
  "friendsie_1111:4": "Spell Bag",
  "friendsie_1111:5": "Cloud Walkers",
  "friendsie_12:0": "Cuddly Onesie",
  "friendsie_12:1": "Cuddly Core",
  "friendsie_12:2": "Cuddle Muff",
  "friendsie_12:3": "Hugbug",
  "friendsie_12:4": "Bunny Slippers",
  "friendsie_123:0": "Garden Dress",
  "friendsie_123:1": "Flower Light",
  "friendsie_123:2": "Garden Core",
  "friendsie_123:3": "Blue Daisy",
  "friendsie_123:4": "Flowery",
  "friendsie_123:5": "Petal Steps",
  "friendsie_200:0": "Zoom Suit",
  "friendsie_200:1": "Rainbow Antenna",
  "friendsie_200:2": "Zoom Core",
  "friendsie_200:3": "Turbo Treat",
  "friendsie_200:4": "Rocket",
  "friendsie_200:5": "Turbo Laces",
  "friendsie_2000:0": "Fizzy Pop Suit",
  "friendsie_2000:1": "Pop Top Red",
  "friendsie_2000:2": "Fizzy Core",
  "friendsie_2000:3": "Juice Box",
  "friendsie_2000:4": "Juice",
  "friendsie_2000:5": "Bubble Runners",
  "friendsie_250:0": "Chef Apron",
  "friendsie_250:1": "Tasty Core",
  "friendsie_250:2": "Sous Chef",
  "friendsie_250:3": "Taco",
  "friendsie_250:4": "Kitchen Clogs",
  "friendsie_2500:0": "Shredder Tee",
  "friendsie_2500:1": "Shredder Core",
  "friendsie_2500:2": "Skate or Die",
  "friendsie_2500:3": "Deck Rollers",
  "friendsie_333:0": "Spooky-cute Suit",
  "friendsie_333:1": "Spooky-cute Core",
  "friendsie_333:2": "Black Kitty",
  "friendsie_333:3": "Ghostin",
  "friendsie_333:4": "Ghostly Boots",
  "friendsie_3333:0": "Golden Hour Gown",
  "friendsie_3333:1": "Golden Fairy",
  "friendsie_3333:2": "Golden Hour Core",
  "friendsie_3333:3": "Stardust Wand",
  "friendsie_3333:4": "Rainbow Wings",
  "friendsie_3333:5": "Sunbeam Steps",
  "friendsie_404:0": "Lost Signal Suit",
  "friendsie_404:1": "Blip",
  "friendsie_404:2": "Lost Signal Core",
  "friendsie_404:3": "Glitch Pack",
  "friendsie_404:4": "Error Wings",
  "friendsie_404:5": "Pixel Stompers",
  "friendsie_500:0": "Splash Suit",
  "friendsie_500:1": "Cyan Kitty",
  "friendsie_500:2": "Splash Core",
  "friendsie_500:3": "Fish Friend",
  "friendsie_500:4": "Aqualung",
  "friendsie_500:5": "Bubble Fins",
  "friendsie_5000:0": "Sweet Swirl Suit",
  "friendsie_5000:1": "Cherry",
  "friendsie_5000:2": "Sweet Core",
  "friendsie_5000:3": "Ice Cream Scoop",
  "friendsie_5000:4": "Sprinkle Steps",
  "friendsie_555:0": "Charged Jumpsuit",
  "friendsie_555:1": "Charged Core",
  "friendsie_555:2": "Volt Orb",
  "friendsie_555:3": "Battery Pack",
  "friendsie_555:4": "Volt Runners",
  "friendsie_666:0": "Little Devil Suit",
  "friendsie_666:1": "Spirit Horns",
  "friendsie_666:2": "Little Devil Core",
  "friendsie_666:3": "Flame",
  "friendsie_666:4": "Ember Wings",
  "friendsie_666:5": "Hot Steps",
  "friendsie_777:0": "Lucky Cloak",
  "friendsie_777:1": "Sacred Gnome",
  "friendsie_777:2": "Lucky Core",
  "friendsie_777:3": "Wishing Star",
  "friendsie_777:4": "Wishes",
  "friendsie_777:5": "Clover Kicks",
  "friendsie_88:0": "Twinkle Dress",
  "friendsie_88:1": "Bow Red",
  "friendsie_88:2": "Twinkle Core",
  "friendsie_88:3": "Star Wand",
  "friendsie_88:4": "Star Bag",
  "friendsie_88:5": "Twinkle Toes",
  "friendsie_888:0": "Jackpot Suit",
  "friendsie_888:1": "Little Golden Cloud",
  "friendsie_888:2": "Jackpot Core",
  "friendsie_888:3": "Lucky Coin",
  "friendsie_888:4": "Golden Bat",
  "friendsie_888:5": "Gold Rush Boots"
}
;
/**
 * Power / Vibe efekt stilleri — react'ten bağımsız saf veri.
 * Player (local), RemotePlayers (ağ) ve CharacterSelect (önizleme) aynı
 * görünümü buradan alır (8-slot parity); audit de kapsamayı buradan doğrular.
 */

export const POWER_STYLE                                                                      = {
  'pwr-stars': { color: '#ffd23f', shape: 'star' },
  'pwr-hearts': { color: '#ff8ab5', shape: 'heart' },
  'pwr-bolts': { color: '#ffb26b', shape: 'bolt' },
}

export const VIBE_COLOR                         = {
  'vibe-pink': '#ff9fc6',
  'vibe-mint': '#9be08d',
  'vibe-gold': '#ffd23f',
  'vibe-sky': '#7cc4ff',
}

