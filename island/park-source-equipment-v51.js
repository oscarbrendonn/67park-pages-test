// Source: Six Seven Park 24d08ced0ed33b018353980f0ca2ed2e80a9e809. Original never modified.
import {CHARACTERS,catalog,partNames} from './park-source-data-v51.js';
const SHOPS=[];const shopState={owned:[]};
                                                                                               
                                      

                             
              
                     
                     
                       
                     
                      
                     
                      
                     
 

const LS_KEY = '67park-feel-lab.character.v3'
const LS_KEY_V2 = '67park.character.v2'
const LS_KEY_V1 = '67park.character.v1'

const CATALOG = catalog                                                   

export const POWER_IDS = ['pwr-stars', 'pwr-hearts', 'pwr-bolts']
export const VIBE_IDS = ['vibe-pink', 'vibe-mint', 'vibe-gold', 'vibe-sky']
// Sprout (canonical): tepe aksesuarı/headwear — kaynak GLB'lerde Head kemiğine
// %100 bağlı küçük parçalar (ord1 tipi). Ek çeşitlilik için kendi pastel
// stilimizde prosedürel filizler de bu slota düşer.
const SPROUT_PROC = ['spr-flower', 'spr-leaf', 'spr-antenna', 'spr-cherry']

const PART_NAMES                         = {
  'goril:TAC': 'Golden Crown',
  'goril:CICEK': 'Flower Blossom',
  'spr-flower': 'Petal Pop',
  'spr-leaf': 'Lucky Leaf',
  'spr-antenna': 'Wobble Antenna',
  'spr-cherry': 'Cherry Duo',
  'pwr-stars': 'Star Power',
  'pwr-hearts': 'Heart Power',
  'pwr-bolts': 'Bolt Power',
  'vibe-pink': 'Pink Glow',
  'vibe-mint': 'Mint Glow',
  'vibe-gold': 'Gold Glow',
  'vibe-sky': 'Sky Glow',
}

/** Her fiziksel katalog parçasının okunabilir adı (fRiENDSiES tonu) */
export const NAMES = partNames                          

/** Slot → trait kartındaki kategori adı (curated isim eşleşmesi için) */
const SLOT_CAT                         = {
  body: 'Body',
  head: 'Head',
  sprout: 'Sprout',
  back: 'Back',
  kicks: 'Kicks',
  held: 'Held',
}

export const charUi = { open: true }

/** GLB parça id'si geçerli mi (katalogda o dosya+ordinal+slot var mı) */
function isGlbPart(pid        , slot         )          {
  const m = /^([A-Za-z0-9_]+):(\d+)$/.exec(pid)
  if (!m) return false
  const entries = CATALOG[m[1]]
  if (!entries) return false
  const ord = Number(m[2])
  return entries.some((e) => e.ord === ord && e.slot === slot)
}

export function isValidPart(pid        , slot         )          {
  // Canonical slotlar (JOINTS/WEIGHTS doğrulamalı): TAC = tepe aksesuarı → sprout,
  // CICEK = AttachmentR (elde çiçek) → held
  if (pid === 'goril:TAC') return slot === 'sprout'
  if (pid === 'goril:CICEK') return slot === 'held'
  if (SPROUT_PROC.includes(pid)) return slot === 'sprout'
  if (pid === 'drink:cocktail') return slot === 'held' // havuz barı içeceği
  if (POWER_IDS.includes(pid)) return slot === 'power'
  if (VIBE_IDS.includes(pid)) return slot === 'vibe'
  if (pid.startsWith('shop:')) return shopSlotOf(pid) === slot // EXACT: item'ın gerçek slotu
  return isGlbPart(pid, slot)
}

/** Mağaza item'ının canonical slotu (id → SHOPS kaydı; yoksa null) */
function shopSlotOf(pid        )                 {
  const it = SHOPS.flatMap((s) => s.items).find((i) => `shop:${i.id}` === pid)
  return (it?.slot                       ) ?? null
}

/** Bir base'in KENDİ parçaları (dosyasındaki ilk ordinal her slot için) */
function ownParts(baseId        )                                          {
  const def = CHARACTERS.find((c) => c.id === baseId)
  const out                                          = {
    body: null,
    head: null,
    sprout: null,
    back: null,
    kicks: null,
    held: null,
  }
  if (!def) return out
  // Goril dahil HER base boş slotlarla başlar — taç/çiçek bile seçilmedikçe takılı değil
  if (!def.file) return out
  const key = def.file.replace('.glb', '')
  for (const e of CATALOG[key] ?? []) {
    if (e.slot === 'base') continue
    const s = e.slot           
    if (out[s] == null) out[s] = `${key}:${e.ord}`
  }
  return out
}

export function defaultEquip(baseId        )             {
  return {
    base: baseId,
    power: null,
    vibe: null,
    ...(ownParts(baseId)                                                                            ),
  }
}

/**
 * Bir parça id'sinin canonical slotu (v2→v3 migrasyonunda kayan slotları
 * düzeltmek için): goril özel parçaları JOINTS/WEIGHTS doğrulamalı yeni
 * slotlarında; GLB parçaları düzeltilmiş katalog slotunda; mağaza itemları
 * SHOPS kaydındaki gerçek slotunda. Hiçbiri değilse null.
 */
function canonicalSlotOf(pid        , fromSlot         )                 {
  if (pid === 'goril:TAC') return 'sprout'
  if (pid === 'goril:CICEK') return 'held'
  if (pid.startsWith('shop:')) return shopSlotOf(pid)
  const m = /^([A-Za-z0-9_]+):(\d+)$/.exec(pid)
  if (m && CATALOG[m[1]]) {
    const e = (CATALOG[m[1]] ?? []).find((x) => x.ord === Number(m[2]))
    return (e?.slot           ) ?? null
  }
  return isValidPart(pid, fromSlot) ? fromSlot : null
}

const SLOT_ORDER = ['body', 'head', 'sprout', 'held', 'back', 'kicks', 'power', 'vibe']             

/** Eski hatalı goril varsayılanı parmak izi — taç head'de + çiçek sprout'ta
 * ÖNCEDEN DOLU gelirdi; oyuncu hiç özelleştirmemiş demektir */
function isStaleGorilDefault(d                     )          {
  return (
    d.base === 'goril' &&
    d.head === 'goril:TAC' &&
    d.sprout === 'goril:CICEK' &&
    !d.body &&
    !d.back &&
    !d.kicks &&
    !d.held &&
    !d.power &&
    !d.vibe
  )
}

function allNullCombo(base        )             {
  return { base, body: null, head: null, sprout: null, back: null, kicks: null, held: null, power: null, vibe: null }
}

/**
 * v3 YÜKLEME — yalnız current canonical validation (idempotent sanitize).
 * Legacy remap UYGULANMAZ: geçersiz string → null; eksik anahtar → kendi
 * varsayılan parçası; açık null → null.
 */
export function sanitizeV3(d                     )                    {
  if (!d || typeof d.base !== 'string' || !CHARACTERS.some((c) => c.id === d.base)) return null
  const eq = defaultEquip(d.base)
  for (const s of SLOT_ORDER) {
    const v = d[s]
    if (v === undefined) continue // eksik anahtar — varsayılan kalır
    if (v === null) {
      eq[s] = null
      continue
    }
    eq[s] = typeof v === 'string' && isValidPart(v, s) ? v : null
  }
  return eq
}


const optCache = new Map                            ()
export function slotOptions(slot         )                    {
  if (slot === 'base') return CHARACTERS.map((c) => c.id)
  if (slot === 'power') return [null, ...POWER_IDS]
  if (slot === 'vibe') return [null, ...VIBE_IDS]
  let out = optCache.get(slot)
  if (!out) {
    out = [null]
    if (slot === 'sprout') out.push(...SPROUT_PROC) // prosedürel filizler herkese
    for (const c of CHARACTERS) {
      if (!c.file) {
        if (slot === 'sprout') out.push('goril:TAC') // tepe aksesuarı (canonical)
        if (slot === 'held') out.push('goril:CICEK') // elde çiçek (AttachmentR)
        continue
      }
      const key = c.file.replace('.glb', '')
      for (const e of CATALOG[key] ?? []) {
        if (e.slot === slot) out.push(`${key}:${e.ord}`)
      }
    }
    optCache.set(slot, out)
  }
  // Sahip olunan mağaza itemları da aynı slota düşer (dinamik kuyruk)
  const owned = SHOPS.flatMap((s) => s.items).filter((i) => i.slot === slot && shopState.owned.includes(i.id))
  const dyn = owned.map((i) => `shop:${i.id}`).filter((p) => !out .includes(p))
  return [...out, ...dyn]
}

/** Parça etiketi — curated trait adı varsa o, yoksa kategori parçası */
export function partLabel(pid               )         {
  if (pid == null) return '— None'
  if (PART_NAMES[pid]) return PART_NAMES[pid]
  if (pid.startsWith('shop:')) {
    const it = SHOPS.flatMap((s) => s.items).find((i) => `shop:${i.id}` === pid)
    return it ? `${it.icon} ${it.name}` : 'Shop item'
  }
  const m = /^([A-Za-z0-9_]+):(\d+)$/.exec(pid)
  if (!m) return pid
  if (NAMES[pid]) return NAMES[pid] // her parçanın okunabilir adı (fRiENDSiES tonu)
  const def = CHARACTERS.find((c) => c.file === `${m[1]}.glb`)
  const entries = (CATALOG[m[1]] ?? []).filter((e) => e.ord === Number(m[2]))
  const slot = entries[0]?.slot ?? ''
  const cat = SLOT_CAT[slot] ?? 'Trait'
  const trait = def?.traits.find((t) => t.cat === cat)
  if (trait) return trait.value
  return `${cat} piece · ${def?.name ?? m[1]}`
}


