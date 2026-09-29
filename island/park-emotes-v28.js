// Mechanically extracted from Six Seven Park 24d08ced. Original untouched.
/**
 * Emote/dans sistemi — prosedürel kemik sürücüleri.
 * HeroPlayer, FriendsiePlayer ve RemotePlayers aynı kataloğu kullanır:
 * bir emote, kemik taban rotasyonlarına (rx/ry/rz) faz-bağlı ofsetler uygular.
 * Klip tabanlı sistemle uyum: emote başlarken mixer durdurulur, bitince
 * kemikler taban poza döndürülür ve klipler yumuşakça devralır.
 */
                                         

                                                                                           
/** Oturma/yatma pozları — emote ÇARKINA girmez, koltuk sistemi (seats.ts)
    sürer; applyEmote aynı prosedürel dille uygular */
                                           

                           
             
               
              
                         
               
 

export const EMOTES             = [
  { id: 'club', label: 'Club Groove', icon: '🪩', tempo: 5.4 },
  { id: 'wave', label: 'Wave', icon: '👋', tempo: 6.2 },
  { id: 'bounce', label: 'Bounce', icon: '⬆️', tempo: 7.0 },
  { id: 'spin', label: 'Spin', icon: '🌀', tempo: 4.4 },
  { id: 'robot', label: 'Robot', icon: '🤖', tempo: 4.0 },
  { id: 'cheer', label: 'Cheer', icon: '🎉', tempo: 6.6 },
  { id: 'groundsit', label: 'Sit Down', icon: '🪑', tempo: 1.0 },
]

/** Playernun o an çalıştırdığı emote (modül seviyesi, input/HUD okur-yazar) */
export const emoteState = {
  /** null = emote yok */
  current: null                  ,
  /** HUD paneli açık mı */
  panelOpen: false,
  /** React'i uyarmak için monoton sürüm */
  version: 0,
  listeners: new Set            (),
}

export function setEmote(id                ) {
  if (emoteState.current === id) return
  emoteState.current = id
  emoteState.version++
  emoteState.listeners.forEach((f) => f())
}

export function setEmotePanel(open         ) {
  if (emoteState.panelOpen === open) return
  emoteState.panelOpen = open
  emoteState.version++
  emoteState.listeners.forEach((f) => f())
}

/** Kemik ofset yardımcıları — HeroPlayer/FriendsiePlayer'daki setX/setZ kalıbı */
                                                                 

function makeSetters(bones         ) {
  const setX        = (name, fn) => {
    const arr = bones.get(name)
    if (arr) for (const bo of arr) bo.o.rotation.x = fn(bo.rx)
  }
  const setY        = (name, fn) => {
    const arr = bones.get(name)
    if (arr) for (const bo of arr) bo.o.rotation.y = fn(bo.ry)
  }
  const setZ        = (name, fn) => {
    const arr = bones.get(name)
    if (arr) for (const bo of arr) bo.o.rotation.z = fn(bo.rz)
  }
  return { setX, setY, setZ }
}

/** Quantize: robot stili kesikli hareket için fazı kademeler */
const step = (v        , steps        ) => Math.round(v * steps) / steps

/**
 * Emote'u kemiklere uygula. `p` = birikimli faz (tempo ile artar).
 * Gövde kök salınımı için opsiyonel `root` döndürme değeri döner (spin).
 */
export function applyEmote(bones         , id                      , p        )                                                              {
  const { setX, setY, setZ } = makeSetters(bones)
  switch (id) {
    case 'benchsit': {
      // Bank/tabure oturuşu: kalça 90° bükük (bacaklar öne), dizler 90°
      // (kaval kemikleri aşağı), gövde dik, eller dizlerde, baş ileride
      setX('ThighL', (rx) => rx - 1.5)
      setX('ThighR', (rx) => rx - 1.5)
      setX('ShinL', (rx) => rx + 1.5)
      setX('ShinR', (rx) => rx + 1.5)
      setX('Spine2', (rx) => rx - 0.06)
      setX('BiscepL', (rx) => rx - 0.35)
      setX('BiscepR', (rx) => rx - 0.35)
      setX('ArmL', (rx) => rx - 0.45)
      setX('ArmR', (rx) => rx - 0.45)
      setZ('BiscepL', (rz) => rz + 0.12)
      setZ('BiscepR', (rz) => rz - 0.12)
      setX('Head', (rx) => rx + 0.04)
      return {}
    }
    case 'lie': {
      // Şezlong yatışı: görsel kök geriye yatar (yüz yukarı), dizler hafif
      // kırık, kollar yanda, baş gövdeyle aynı hizada
      setX('ThighL', (rx) => rx - 0.12)
      setX('ThighR', (rx) => rx - 0.12)
      setX('ShinL', (rx) => rx + 0.22)
      setX('ShinR', (rx) => rx + 0.22)
      setX('Spine2', (rx) => rx - 0.08)
      setZ('BiscepL', (rz) => rz + 0.3)
      setZ('BiscepR', (rz) => rz - 0.3)
      setX('ArmL', (rx) => rx - 0.15)
      setX('ArmR', (rx) => rx - 0.15)
      return { rootPitch: -1.42, rootBobY: 0.1 }
    }
    case 'club': {
      // kollar yukarı, dönüşümlü sallanma + gövde groove
      setX('BiscepL', (rx) => rx - 2.2 + Math.sin(p) * 0.5)
      setX('BiscepR', (rx) => rx - 2.2 + Math.sin(p + Math.PI) * 0.5)
      setX('ArmL', (rx) => rx - 0.6 + Math.max(0, Math.sin(p)) * 0.4)
      setX('ArmR', (rx) => rx - 0.6 + Math.max(0, Math.sin(p + Math.PI)) * 0.4)
      setZ('BiscepL', (rz) => rz + 0.5 + Math.sin(p) * 0.3)
      setZ('BiscepR', (rz) => rz - 0.5 - Math.sin(p + Math.PI) * 0.3)
      setX('Spine2', (rx) => rx + Math.sin(p * 2) * 0.08)
      setZ('Spine2', (rz) => rz + Math.sin(p) * 0.12)
      setX('Head', (rx) => rx + Math.sin(p * 2) * 0.1)
      setX('ThighL', (rx) => rx + Math.max(0, Math.sin(p * 2)) * 0.25)
      setX('ThighR', (rx) => rx + Math.max(0, Math.sin(p * 2 + Math.PI)) * 0.25)
      return { rootBobY: Math.abs(Math.sin(p)) * 0.06 }
    }
    case 'wave': {
      // sağ kol yukarı kalkık, bilekten sallanır; sol kol gevşek
      setZ('BiscepR', (rz) => rz - 2.4)
      setX('BiscepR', (rx) => rx - 0.3)
      setZ('ArmR', (rz) => rz - 0.3 + Math.sin(p) * 0.45)
      setX('BiscepL', (rx) => rx + 0.1)
      setZ('Head', (rz) => rz + Math.sin(p) * 0.06)
      setZ('Spine2', (rz) => rz - 0.06)
      return {}
    }
    case 'bounce': {
      // iki kol yumruk, ritmik gövde çökmesi + topuk kalkışı hissi
      const k = Math.abs(Math.sin(p))
      setX('BiscepL', (rx) => rx - 1.2 + k * 0.35)
      setX('BiscepR', (rx) => rx - 1.2 + k * 0.35)
      setX('ArmL', (rx) => rx - 1.5)
      setX('ArmR', (rx) => rx - 1.5)
      setX('Spine2', (rx) => rx + 0.12 + k * 0.1)
      setX('ThighL', (rx) => rx + k * 0.4)
      setX('ThighR', (rx) => rx + k * 0.4)
      setX('ShinL', (rx) => rx + k * 0.5)
      setX('ShinR', (rx) => rx + k * 0.5)
      setX('Head', (rx) => rx - 0.08 + k * 0.06)
      return { rootBobY: k * 0.14 }
    }
    case 'spin': {
      // kollar yana açık piruet — kök yaw'ı oyuncu grubuna uygulanır
      setZ('BiscepL', (rz) => rz + 1.35)
      setZ('BiscepR', (rz) => rz - 1.35)
      setX('ArmL', (rx) => rx - 0.25)
      setX('ArmR', (rx) => rx - 0.25)
      setX('Head', (rx) => rx - 0.06)
      setX('ThighL', (rx) => rx + 0.12)
      setX('ShinR', (rx) => rx + 0.18)
      return { rootYaw: p }
    }
    case 'robot': {
      // kademeli kol/baş hareketleri, gövde kilitli
      const q = (v        ) => step(v, 2)
      setZ('BiscepL', (rz) => rz + 1.1 + q(Math.sin(p)) * 0.4)
      setZ('BiscepR', (rz) => rz - 1.1 - q(Math.sin(p + Math.PI / 2)) * 0.4)
      setX('ArmL', (rx) => rx - 0.9 + q(Math.sin(p + Math.PI / 2)) * 0.35)
      setX('ArmR', (rx) => rx - 0.9 + q(Math.sin(p)) * 0.35)
      setY('Head', (ry) => ry + q(Math.sin(p * 0.5)) * 0.5)
      setZ('Spine2', (rz) => rz + q(Math.sin(p)) * 0.06)
      setX('ThighL', (rx) => rx + Math.max(0, q(Math.sin(p))) * 0.2)
      setX('ThighR', (rx) => rx + Math.max(0, q(Math.sin(p + Math.PI))) * 0.2)
      return {}
    }
    case 'cheer': {
      // iki kol V, sıçrayarak alkış temposu
      const k = Math.max(0, Math.sin(p))
      setX('BiscepL', (rx) => rx - 2.5 + k * 0.2)
      setX('BiscepR', (rx) => rx - 2.5 + k * 0.2)
      setZ('BiscepL', (rz) => rz + 0.45)
      setZ('BiscepR', (rz) => rz - 0.45)
      setX('ArmL', (rx) => rx - 0.35)
      setX('ArmR', (rx) => rx - 0.35)
      setX('Head', (rx) => rx - 0.18)
      setX('Spine2', (rx) => rx - 0.06)
      setX('ThighL', (rx) => rx + k * 0.35)
      setX('ThighR', (rx) => rx + k * 0.35)
      setX('ShinL', (rx) => rx + k * 0.4)
      setX('ShinR', (rx) => rx + k * 0.4)
      return { rootBobY: k * 0.12 }
    }
    case 'groundsit': {
      // Yerde oturuş: bacaklar öne uzanır, gövde dik, kollar yanda destek
      setX('ThighL', (rx) => rx - 1.35)
      setX('ThighR', (rx) => rx - 1.35)
      setX('ShinL', (rx) => rx + 0.35)
      setX('ShinR', (rx) => rx + 0.35)
      setX('Spine2', (rx) => rx + 0.08)
      setX('BiscepL', (rx) => rx + 0.4)
      setX('BiscepR', (rx) => rx + 0.4)
      setZ('BiscepL', (rz) => rz + 0.25)
      setZ('BiscepR', (rz) => rz - 0.25)
      setX('Head', (rx) => rx - 0.05)
      return { rootBobY: -0.42 }
    }
  }
}

/** Emote bitişinde kemikleri taban poza döndür */
export function resetEmoteBones(bones         ) {
  for (const arr of bones.values())
    for (const bo of arr) bo.o.rotation.set(bo.rx, bo.ry, bo.rz)
}
