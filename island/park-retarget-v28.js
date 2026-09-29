// Mechanically extracted from Six Seven Park 24d08ced. Original untouched.
/**
 * Friendsie klipleri — goril-v1.glb'nin pişmiş kliplerini (idle/walk/run/jump/
 * fall/land/celebrate) friendsie rig'lerine yeniden hedefler.
 *
 * Friendsie GLB'lerinde klip YOK ama iskelet topolojisi gorille BİREBİR aynı
 * (aynı 20 kemik ismi). Dinlenme pozları farklı olduğundan kareler delta
 * yöntemiyle çevrilir: q' = qDstRest * inv(qSrcRest) * q — klip, kaynağın
 * dinlenmeden SAPMASINI hedefin dinlenme pozuna uygular.
 *
 * Her friendsie modelinde her mesh'in KENDİ rig kopyası var (aynı isimli
 * kemikler); mixer isimle İLK eşleşmeyi sürer — update() sonrası driven
 * kemiklerin quaternion'ları aynı isimli diğer kopyalara taşınır.
 *
 * Pozisyon track'leri atılır (oranlar farklı — goril kök zıplaması friendsie'ye
 * uymaz); sadece quaternion track'leri taşınır.
 */
import * as THREE from 'three'

const TRACK_BONES = [
  'Root',
  'Spine1',
  'Spine2',
  'Spine3',
  'Head',
  'BiscepL',
  'ArmL',
  'HandL',
  'BiscepR',
  'ArmR',
  'HandR',
  'ThighL',
  'ShinL',
  'ToeL',
  'ThighR',
  'ShinR',
  'ToeR',
]

/** Modeldeki İLK rig kopyasının dinlenme quaternion'ları (yükleme anındaki poz) */
export function restQuats(root                )                                {
  const map = new Map                          ()
  root.traverse((c) => {
    if ((c              ).isBone && !map.has(c.name)) map.set(c.name, (c              ).quaternion.clone())
  })
  return map
}

/** Klibi hedef rig'in dinlenme pozuna göre yeniden hesapla (sadece quaternion) */
export function retargetClip(
  clip                     ,
  srcRest                               ,
  dstRest                               
)                      {
  const tracks                        = []
  for (const t of clip.tracks) {
    const dot = t.name.lastIndexOf('.')
    const bone = t.name.slice(0, dot)
    const prop = t.name.slice(dot + 1)
    if (prop !== 'quaternion') continue
    const qs = srcRest.get(bone)
    const qd = dstRest.get(bone)
    if (!qs || !qd) continue
    const delta = qd.clone().multiply(qs.clone().invert()) // qd * inv(qs)
    const vals = new Float32Array(t.values.length)
    const q = new THREE.Quaternion()
    for (let i = 0; i < t.values.length; i += 4) {
      q.fromArray(Array.from(t.values.slice(i, i + 4)))
      q.premultiply(delta)
      q.toArray(vals                       , i)
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(t.name, Array.from(t.times), Array.from(vals)))
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

                                          
                                                                   
                                                                       
                                                                 
                                                             
                  
                                                          
                              
                                             
                       
                     
 

/**
 * Friendsie modeli için klip kontrolcüsü kur.
 * model: buildFriendsieModel'den çıkan kurulmuş model (kemikler dinlenme pozunda
 * olmalı — kurulumdan hemen sonra çağır).
 * srcScene: goril-v1.glb sahnesi (klip kaynağı + dinlenme pozu referansı).
 * clips: goril-v1.glb animations dizisi.
 */
export function createFriendsieAnim(
  model                ,
  srcScene                ,
  clips                       
)                          {
  const srcRest = restQuats(srcScene)
  const dstRest = restQuats(model)
  const retargeted = clips.map((c) => retargetClip(c, srcRest, dstRest))

  const mixer = new THREE.AnimationMixer(model)
  const actions                                        = {}
  for (const c of retargeted) actions[c.name] = mixer.clipAction(c)

  // Mixer'ın SÜRDÜĞÜ kemikleri bul (isimle ilk eşleşme) + diğer kopyaları topla.
  // Kopyalar iki biçimde: aynı isimli ('ThighL' — friendsie_555 mesh_0_1) ve
  // SONEKLi ('ThighL_1' — GLB'deki 4 ek rig kopyası; X meshleri bunlara bağlı).
  // Sonekli kopyalar taşınmazsa aksesuar meshler (şapka/çanta/baş) dinlenme
  // pozunda DONUK kalır — gövde yürürken parça havada asılı görünür.
  const driven = new Map                        ()
  const copies = new Map                          ()
  for (const name of TRACK_BONES) {
    const node = THREE.PropertyBinding.findNode(model, name)                         
    if (node) driven.set(name, node)
  }
  model.traverse((c) => {
    if (!(c              ).isBone) return
    const base = c.name.replace(/_\d+$/, '')
    const d = driven.get(base)
    if (d && d !== c) {
      const arr = copies.get(base) ?? []
      arr.push(c)
      copies.set(base, arr)
    }
  })

  let cur = ''
  return {
    play(name, fade = 0.16, timeScale = 1) {
      if (cur === name) {
        const a = actions[name]
        if (a && a.timeScale !== timeScale) a.timeScale = timeScale
        return
      }
      const next = actions[name]
      if (!next) return
      next.timeScale = timeScale
      next.reset().fadeIn(fade).play()
      if (cur && actions[cur]) actions[cur] .fadeOut(fade)
      cur = name
    },
    stop() {
      mixer.stopAllAction()
      cur = ''
    },
    update(dt) {
      mixer.update(dt)
      if (!cur) return
      // Sürülen kemiğin pozunu aynı isimli diğer rig kopyalarına taşı
      for (const [name, d] of driven) {
        const others = copies.get(name)
        if (!others) continue
        for (const b of others) b.quaternion.copy((d              ).quaternion)
      }
    },
    current: () => cur,
    dispose() {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    },
  }
}
