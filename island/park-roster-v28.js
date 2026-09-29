// Mechanically extracted from Six Seven Park 24d08ced. Original untouched.
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
