// Source: Six Seven Park 24d08ced0ed33b018353980f0ca2ed2e80a9e809. Original never modified.
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


