// Source: Six Seven Park 24d08ced0ed33b018353980f0ca2ed2e80a9e809. Original never modified.
/**
 * Karakter montajı — slot-bazlı kuşanma sistemi için model inşası.
 *
 * GLB analizi: her friendsie dosyasında trait'ler AYRI SkinnedMesh'ler;
 * hepsi aynı 20 eklemli iskeletin (isimleri birebir aynı) bir kopyasına bağlı.
 * Bu yüzden:
 *  - Base dosyasından gelen parçalar: clone içinde PRUNE edilir (donanımsız
 *    mesh'ler atılır, seçili olanlar kendi rig kopyasında kalır — animasyon
 *    kodu aynı isimli TÜM kemikleri sürdüğü için takip eder).
 *  - BAŞKA dosyadan gelen parça: kaynak sahneden ordinalle bulunur, klonlanır,
 *    base clone'un master kemiklerine isimle RE-BIND edilir (bind-pose
 *    tersleri master'ın dinlenme pozundan yeniden hesaplanır).
 *  - Mağaza itemları: prosedürel mini-aksesuar olarak ilgili kemiğe takılır.
 */
import * as THREE from 'three'
import {cloneSkinnedScene as clone} from './park-skeleton-v51.js';
const SkeletonUtils={clone};
import { CHARACTERS,catalog } from './park-source-data-v51.js'
const SHOPS=[];
                                         


const CATALOG = catalog                                                                     

/**
 * Runtime SkinnedMesh'leri katalog ord'larına eşler.
 * GLTFLoader çok primitifli bir glTF mesh'ini birden çok SkinnedMesh'e BÖLER
 * (mesh_0, mesh_0_1…) — katalog ord'ları ise glTF MESH bazlıdır. Düz sayaçla
 * budama yapınca indeksler kayar ve BACAKLAR gibi yanlış mesh'ler atılırdı
 * (5k: karakterin gövdesi kayboluyordu). Primitif vertex sayıları (prims)
 * sırayla eşleştirilerek aynı glTF mesh'inin primitifleri tek ord'a toplanır.
 */
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

                          
                   
            
            
            
 
                                            

/** partId → { file, ord } (GLB parçasıysa; değilse null) */
export function parseGlbPart(pid               )                                       {
  if (!pid) return null
  const m = /^([A-Za-z0-9_]+):(\d+)$/.exec(pid)
  if (!m || !CATALOG[m[1]]) return null
  return { file: m[1], ord: Number(m[2]) }
}

/** Master kemik sözlüğü: clone'daki İLK rig kopyasının kemikleri (isim → ilk eşleşme) */
export function masterBones(root                )                          {
  const map = new Map                    ()
  root.traverse((c) => {
    if ((c              ).isBone && !map.has(c.name)) map.set(c.name, c              )
  })
  return map
}

/** Animasyon kemik haritası (FriendsiePlayer/HeroPlayer ortak deseni) */
export function collectBones(root                )          {
  const map          = new Map()
  root.traverse((c) => {
    if (c.name && !(c              ).isMesh) {
      const arr = map.get(c.name) ?? []
      arr.push({ o: c, rx: c.rotation.x, ry: c.rotation.y, rz: c.rotation.z })
      map.set(c.name, arr)
    }
  })
  return map
}

/** Kaynak sahnede ordinal'daki glTF mesh'inin TÜM SkinnedMesh primitiflerini bul */
function meshesAtOrdinal(scene                , key        , ord        )                      {
  return meshesByOrd(scene, key).get(ord) ?? []
}

/** Kaynak sahnede isimle SkinnedMesh bul (goril TAC/CICEK gibi özel parçalar) */
function meshByName(scene                , name        )                           {
  let found                           = null
  scene.traverse((c) => {
    if ((c                     ).isSkinnedMesh && c.name === name && !found) found = c                     
  })
  return found
}

/**
 * Kaynak mesh'i klonla, base clone'a aynı göreli konumla yerleştir, master
 * kemiklere isimle re-bind et — ÇİFT YÖNLÜ çalışır: friendsie parçası gorile,
 * goril parçası (TAC/CICEK) friendsie'ye. Her iki taraf da aynı 20 eklemli
 * iskeleti paylaştığı için parça TÜM animasyonları takip eder.
 */
export function attachMeshRef(
  clone             ,
  master                         ,
  srcScene             ,
  src                   
)       {
  srcScene.updateMatrixWorld(true)
  const mesh = new THREE.SkinnedMesh(src.geometry, src.material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false // re-bind sonrası bounding box güvenilmez
  // Kaynak mesh'in sahne köküne göreli konumu (kök identity varsayımı)
  const rel = new THREE.Matrix4().copy(srcScene.matrixWorld).invert().multiply(src.matrixWorld)
  rel.decompose(mesh.position, mesh.quaternion, mesh.scale)
  clone.add(mesh)
  clone.updateMatrixWorld(true)
  // Master kemiklere isimle re-bind. İKİ KRİTİK KURAL:
  //  1) İNDEKS KAYMAZ: src.skeleton.bones SIRASI birebir korunur (JOINTS_0
  //     indeksleri bu sıraya göredir); master'da olmayan kemik yerine kaynağın
  //     kendi kemiği konur (sahne dışı, dinlenmede kalır — parça kaybolmaz).
  //  2) BIND-POZ KAYNAĞINKİDİR: boneInverses KAYNAK iskeletten alınır. Baz
  //     buddy'lerin dinlenme pozları/oranları farklıdır; baz tersleriyle
  //     bağlanınca vertex'ler 6-7 birim savrulup parça bozuk çizgi gibi
  //     görünüyordu ("çanta değişmiyor"). Kaynak tersleriyle parça baz
  //     rig'inin pozuna oturur ve tüm animasyonları izler.
  const bones               = []
  const inverses                  = []
  src.skeleton.bones.forEach((b, i) => {
    bones.push(master.get(b.name) ?? master.get(b.name.replace(/_\d+$/, '')) ?? b)
    inverses.push(src.skeleton.boneInverses[i].clone())
  })
  if (!bones.length) return
  mesh.bind(new THREE.Skeleton(bones, inverses), mesh.matrixWorld.clone())
}

/** Başka dosyadan parça tak (katalog ordinali ile — çok primitifli parçanın HEPSİ) */
export function attachGlbPart(
  clone             ,
  master                         ,
  srcScene             ,
  key        ,
  ord        
)       {
  for (const src of meshesAtOrdinal(srcScene, key, ord)) attachMeshRef(clone, master, srcScene, src)
}

/** Gorilin kendi parçasını (TAC taç / CICEK çiçek) herhangi bir karaktere tak */
export function attachGorilSpecial(
  clone             ,
  master                         ,
  gorilScene             ,
  name                 
)       {
  const src = meshByName(gorilScene, name)
  if (src) attachMeshRef(clone, master, gorilScene, src)
}

/* ---------------- Mağaza aksesuarları (prosedürel, kemiğe rijit) ---------------- */

function findBone(root                , name        )                    {
  let found                    = null
  root.traverse((c) => {
    if ((c              ).isBone && c.name === name && !found) found = c              
  })
  return found
}

function accMat(color        )                             {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 })
}

/** "shop:<itemId>" → ilgili kemiğe takılan minik prosedürel aksesuar (ham model ölçüsünde) */
export function attachShopAccessory(clone             , pid        , isGoril = false)       {
  const item = SHOPS.flatMap((s) => s.items).find((i) => `shop:${i.id}` === pid)
  if (!item) return
  const g = new THREE.Group()
  g.name = `acc-${item.id}`
  if (item.id === 'cap') {
    const bone = findBone(clone, 'Head')
    if (!bone) return
    if (isGoril) {
      // GORİL: kafa gövdeye göre çok büyük — sabit boyutlu şapka kafanın içinde
      // kaybolur. Kafanın TEPESİNE, model sınırına oranlı yerleştir.
      clone.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(clone)
      const H = Math.max(box.max.y - box.min.y, 0.001)
      const r = H * 0.22
      const cx = (box.min.x + box.max.x) / 2
      const cz = (box.min.z + box.max.z) / 2
      const sitY = box.max.y - r * 1.05 // kubbe tabanı kafa tepesine gömülü oturur
      const top = bone.worldToLocal(new THREE.Vector3(cx, sitY, cz))
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        accMat(item.color),
      )
      dome.position.copy(top)
      const brimPos = bone.worldToLocal(new THREE.Vector3(cx, sitY, cz + r * 0.85))
      const brim = new THREE.Mesh(new THREE.BoxGeometry(r * 1.3, r * 0.22, r * 0.8), accMat(item.color))
      brim.position.copy(brimPos)
      // kutu kenarları dünya eksenlerine hizalı kalsın (kemik dönüşünü telafi et)
      brim.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert())
      g.add(dome, brim)
      g.traverse((c) => {
        if ((c              ).isMesh) c.castShadow = true
      })
      bone.add(g)
      return
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), accMat(item.color))
    dome.position.y = 0.035
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.055), accMat(item.color))
    brim.position.set(0, 0.035, 0.062)
    g.add(dome, brim)
    bone.add(g)
  } else if (item.id === 'bag') {
    const bone = findBone(clone, 'Backpiece_Attachment')
    if (!bone) return
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.1, 0.05), accMat(item.color))
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.055), accMat('#fff8ec'))
    flap.position.y = 0.045
    g.add(pack, flap)
    bone.add(g)
  } else if (item.id === 'tshirt' || item.id === 'hoodie') {
    const bone = findBone(clone, 'Spine2')
    if (!bone) return
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.075, 0.14), accMat(item.color))
    g.add(vest)
    if (item.id === 'hoodie') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), accMat(item.color))
      hood.position.set(0, 0.05, -0.05)
      g.add(hood)
    }
    bone.add(g)
  } else {
    // el itemları: kite / ball / teddy → sol el
    const bone = findBone(clone, 'AttachmentL')
    if (!bone) return
    if (item.id === 'kite') {
      const kite = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), accMat(item.color))
      kite.scale.set(1, 1.3, 0.35)
      g.add(kite)
    } else if (item.id === 'teddy') {
      const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), accMat(item.color))
      const headM = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), accMat(item.color))
      headM.position.y = 0.055
      const earL = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), accMat(item.color))
      earL.position.set(-0.024, 0.08, 0)
      const earR = earL.clone()
      earR.position.x = 0.024
      g.add(bodyM, headM, earL, earR)
    } else {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), accMat(item.color))
      g.add(ball)
    }
    g.position.y = 0.02
    bone.add(g)
  }
  g.traverse((c) => {
    if ((c              ).isMesh) {
      c.castShadow = true
    }
  })
}

/* ---------------- Prosedürel sprout parçaları (pastel stil, Head kemiğine) ---------------- */

/**
 * Canonical modelde Sprout = tepe aksesuarı/headwear (kaynak GLB'lerde Head
 * kemiğine %100 bağlı küçük parçalar; ord1 tipi). Filiz çeşitliliğini
 * artırmak için kendi pastel stilimizde prosedürel parçalar da var.
 * Head kemiğine rijit takılır — tüm animasyonları izler.
 */
export function attachProcedural(clone             , pid        )       {
  // sprout'lar kafaya, el itemları (içecek) sol ele takılır
  const boneName = pid.startsWith('drink:') ? 'AttachmentL' : 'Head'
  const bone = findBone(clone, boneName)
  if (!bone) return
  const g = new THREE.Group()
  g.name = `proc-${pid}`
  const mat = (c        ) => accMat(c)
  if (pid === 'spr-flower') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), mat('#7cb56a'))
    stem.position.y = 0.035
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat('#ffd23f'))
    core.position.y = 0.078
    g.add(stem, core)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat('#ff9fc6'))
      petal.position.set(Math.cos(a) * 0.026, 0.078, Math.sin(a) * 0.026)
      petal.scale.y = 0.55
      g.add(petal)
    }
  } else if (pid === 'spr-leaf') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), mat('#7cb56a'))
    stem.position.y = 0.025
    g.add(stem)
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#9be08d'))
      leaf.scale.set(1, 0.35, 0.55)
      leaf.position.set(s * 0.02, 0.055, 0)
      leaf.rotation.z = s * -0.5
      g.add(leaf)
    }
  } else if (pid === 'spr-antenna') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), mat('#b8a6d9'))
    rod.position.y = 0.045
    rod.rotation.z = 0.18
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat('#7cc4ff'))
    ball.position.set(0.016, 0.095, 0)
    g.add(rod, ball)
  } else if (pid === 'spr-cherry') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), mat('#7cb56a'))
    stem.position.y = 0.025
    g.add(stem)
    for (const s of [-1, 1]) {
      const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mat('#ff5d7e'))
      cherry.position.set(s * 0.016, 0.052, 0)
      g.add(cherry)
    }
  } else if (pid === 'drink:cocktail') {
    // havuz barı içeceği — elde taşınır (yürürken de), E ile bitirilir
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.035, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: '#ff9fc6', roughness: 0.3, transparent: true, opacity: 0.9 })
    )
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), accMat('#fdfbf6'))
    straw.position.set(0.025, 0.1, 0)
    straw.rotation.z = -0.3
    const umb = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.04, 10), accMat('#ffd23f'))
    umb.position.set(-0.03, 0.1, 0)
    g.add(glass, straw, umb)
    g.position.y = 0.03
    bone.add(g)
  } else {
    return
  }
  g.position.y = 0.02
  g.traverse((c) => {
    if ((c              ).isMesh) c.castShadow = true
  })
  bone.add(g)
}

/* ---------------- Birleşik parça takıcı (her iki base yolu da bunu kullanır) ---------------- */

/**
 * Tek parçayı slota göre tak — ÇİFT YÖNLÜ + TEK YOL:
 *  - "file:ord"     → başka friendsie dosyasından re-bind (aynı dosyaysa prune'da kalır)
 *  - "goril:TAC"    → goril taç (her karaktere)
 *  - "goril:CICEK"  → goril çiçek (her karaktere)
 *  - "spr-*"        → prosedürel sprout
 *  - "shop:<id>"    → mağaza aksesuarı
 * Seçim önizlemesi ve oyun içi oyuncu AYNI fonksiyondan geçer — sahnede ne
 * görüyorsan dünyada da o.
 */
export function attachPartToSlot(
  clone             ,
  master                         ,
  pid               ,
  ownFile               ,
  getScene                                           
)       {
  if (!pid) return
  if (pid === 'goril:TAC' || pid === 'goril:CICEK') {
    const gs = getScene('goril-v1.glb')
    if (gs) attachGorilSpecial(clone, master, gs, pid === 'goril:TAC' ? 'TAC' : 'CICEK')
    return
  }
  if (pid.startsWith('spr-') || pid.startsWith('drink:')) {
    attachProcedural(clone, pid)
    return
  }
  if (pid.startsWith('shop:')) {
    attachShopAccessory(clone, pid, ownFile === null) // ownFile null = goril yolu
    return
  }
  const p = parseGlbPart(pid)
  if (!p || p.file === ownFile) return
  const src = getScene(`${p.file}.glb`)
  if (src) attachGlbPart(clone, master, src, p.file, p.ord)
}

/* ---------------- Goril giydirme (HeroPlayer + önizleme ortak) ---------------- */

/**
 * Goril mesh → slot haritası — JOINTS_0/WEIGHTS_0 analiziyle doğrulanan
 * canonical eşleme:
 *   FS_Body     çok-kemikli (Spine/Toe/El)  → BODY katmanı.
 *   GORIL_KAFA  %100 Head kemiği            → HEAD katmanı (tam kafa/yüz kabuğu).
 *   TAC         %100 Head kemiği (tepe)     → SPROUT/headwear slotu.
 *   CICEK       %100 AttachmentR            → HELD slotu (elde çiçek).
 *   Goril_El_L/R %100 HandL/HandR           → gövdenin parçası — hiç gizlenmez.
 * Gorilde body/head/back/kicks slotları YOKTUR (dış friendsie parçaları ham
 * ölçekte gorilin ~7 katı — uymaz): FS_Body ve GORIL_KAFA HER ZAMAN görünür,
 * dış GLB parçası gorile hiç takılmaz. null dönerse mesh'in görünürlüğüne
 * dokunulmaz.
 */
export function gorilMeshVisibility(name        , eq            )                 {
  if (name.includes('TAC')) return eq.sprout === 'goril:TAC'
  if (name.includes('CICEK')) return eq.held === 'goril:CICEK'
  if (name.includes('GORIL_KAFA')) return true
  if (name.includes('FS_Body')) return true
  return null
}

/**
 * Goril clone'unu kuşanma durumuna göre giydir:
 * pişmiş mesh'lerin görünürlüğü gorilMeshVisibility ile slotlara bağlanır
 * (başka parça seçildiyse goril mesh'i gizlenir, yerine attachPartToSlot dış
 * parçayı takar), friendsie parçaları re-bind, prosedürel/mağaza itemları
 * kemiğe takılır. Ölçek/merkez ÇAĞIRANIN işi.
 */
export function dressGorilClone(
  clone             ,
  eq            ,
  getScene                                           
)       {
  clone.traverse((c) => {
    if ((c              ).isMesh) {
      const v = gorilMeshVisibility(c.name, eq)
      if (v !== null) c.visible = v
    }
  })
  clone.updateMatrixWorld(true)
  const master = masterBones(clone)
  // Gorilde yalnız sprout + held gerçek slottur — body/head/back/kicks'teki
  // dış friendsie parçaları ölçek olarak uymaz, hiç takılmaz (sanitize zaten
  // null'lar; bu ikinci savunma hattı)
  for (const s of ['sprout', 'held']         ) {
    const pid = eq[s]
    // gorilin kendi pişmiş parçaları görünürlükle yönetilir — dışarıdan takılmaz
    if (pid === 'goril:TAC' || pid === 'goril:CICEK') continue
    attachPartToSlot(clone, master, pid, null, getScene)
  }
}

/* ---------------- Ana inşaat ---------------- */

                                     
                    
                
 

/**
 * PRUNE keep-set — canonical slot modeli (saf fonksiyon; audit'te doğrulanır):
 *  - BODY ve HEAD fallback katmanlardır: slot null / prosedürel / mağaza
 *    itemı / goril özel parçası iken dosyanın KENDİ ord'u kalır; yalnız DIŞ
 *    bir GLB parçası (başka dosya) takılınca kendi ord'u budanır ve dış parça
 *    re-bind ile takılır (None'da fallback geri gelir).
 *  - SPROUT / BACK / KICKS / HELD fallback'sizdir: yalnız kuşanılan kendi
 *    dosyasına ait parça kalır; null iken hiçbir şey kalmaz.
 * Bir slot değişince YALNIZ o slotun katkısı değişir — diğer slotların
 * keep-set'i aynı kalır (5d izolasyon koşulu).
 */
export function pruneKeepOrds(key        , eq            )              {
  const keep = new Set        ()
  const entries = CATALOG[key] ?? []
  for (const s of ['body', 'head']         ) {
    const p = parseGlbPart(eq[s])
    if (p && p.file === key) keep.add(p.ord)
    else if (!p) for (const e of entries) if (e.slot === s) keep.add(e.ord)
  }
  for (const s of ['sprout', 'back', 'kicks', 'held']         ) {
    const p = parseGlbPart(eq[s])
    if (p && p.file === key) keep.add(p.ord)
  }
  return keep
}

/**
 * Canonical ölçü/merkez sınırı — yalnız fallback BODY+HEAD mesh'lerinden,
 * kuşanma seçiminden BAĞIMSIZ ve her zaman finite. Prune ÖNCESİ çağrılır;
 * body ve head aynı anda external GLB olsa bile fallback mesh'ler katalog
 * gereği her dosyada bulunduğu için sınır asla boş/Infinity olmaz.
 */
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

/**
 * Kuşanma durumundan friendsie modeli kur:
 * prune (aynı dosya) + rebind (başka dosya) + mağaza aksesuarları + ölçek/merkez.
 * getScene: dosya adı ("friendsie_123.glb") → yüklenmiş GLTF sahnesi.
 */
export function buildFriendsieModel(
  eq            ,
  getScene                                           
)                            {
  const def = CHARACTERS.find((c) => c.id === eq.base)
  if (!def || !def.file) return null
  const key = def.file.replace('.glb', '')
  const baseScene = getScene(def.file)
  if (!baseScene) return null

  const clone = SkeletonUtils.clone(baseScene)               
  clone.updateMatrixWorld(true)

  // 0) ÖLÇÜ/MERKEZ — canonicalBaseBounds: seçimden bağımsız, her zaman finite
  const baseBox = canonicalBaseBounds(clone, key)
  const baseSize = baseBox.getSize(new THREE.Vector3())
  const sc = 1.35 / Math.max(baseSize.y, 0.001)

  // 1) PRUNE — canonical keep-set (fallback body/head + kuşanılan parçalar)
  const keepOrds = pruneKeepOrds(key, eq)
  const byOrdPre = meshesByOrd(clone, key)
  const toRemove                   = []
  for (const [ord, meshes] of byOrdPre) {
    if (!keepOrds.has(ord)) toRemove.push(...meshes)
  }
  toRemove.forEach((c) => c.removeFromParent())

  clone.updateMatrixWorld(true)
  const master = masterBones(clone)

  // 2) DIŞ PARÇALAR — birleşik takıcı (başka dosya re-bind, goril özel,
  //    prosedürel sprout, mağaza aksesuarı) — önizlemeyle BİREBİR aynı yol
  for (const s of ['body', 'head', 'sprout', 'back', 'kicks', 'held']         ) {
    attachPartToSlot(clone, master, eq[s], key, getScene)
  }

  // 4) Ölçek + merkez (baz sınırdan — mevcut FriendsiePlayer hesabıyla aynı)
  clone.scale.setScalar(sc)
  clone.position.y = -baseBox.min.y * sc
  clone.position.x = (-(baseBox.min.x + baseBox.max.x) / 2) * sc
  clone.position.z = (-(baseBox.min.z + baseBox.max.z) / 2) * sc

  clone.traverse((c) => {
    if ((c              ).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

  return { model: clone, bones: collectBones(clone) }
}

