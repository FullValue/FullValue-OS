import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Stars, Float } from '@react-three/drei'
import { ARC_SUMMIT_M } from '@/lib/winterArc'

// Montagne d'ascension du Winter Arc : un sentier en spirale du camp de base au sommet,
// une étape par jour de l'Arc. Chaque jour validé plante un drapeau et fait monter l'avatar.
const R = 15
const H = 12
const TURNS = 2.6
const START_ANGLE = Math.PI / 2 // camp de base face à la caméra

const LABEL_Z = [20, 0]

// Relief déterministe, périodique en angle (pas de couture) et nul au sommet et au pied.
function rough(th, r) {
  return (Math.sin(3 * th + r * 0.7) * 0.5 + Math.sin(7 * th - r * 1.3) * 0.3 + Math.sin(13 * th + r * 2.1) * 0.2)
    * 0.9 * Math.sin(Math.PI * Math.min(1, r / R))
}
function heightAt(th, r) {
  const k = Math.max(0, 1 - r / R)
  return H * Math.pow(k, 1.25) + rough(th, r)
}

// Point du sentier pour t ∈ [0, 1] (0 = camp de base, 1 = sommet).
function pathPoint(t) {
  const r = R * 0.9 * (1 - t)
  const th = START_ANGLE + t * TURNS * Math.PI * 2
  return new THREE.Vector3(r * Math.cos(th), heightAt(th, r) + 0.16, r * Math.sin(th))
}

function mixColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)))
}

function useMountainGeometry() {
  return useMemo(() => {
    const NR = 70
    const NS = 160
    const pos = []
    const col = []
    const idx = []
    for (let i = 0; i <= NR; i++) {
      const r = (R * i) / NR
      for (let j = 0; j < NS; j++) {
        const th = (j / NS) * Math.PI * 2
        const y = heightAt(th, r)
        pos.push(r * Math.cos(th), y, r * Math.sin(th))
        const t = y / H
        const n = Math.sin(5 * th + r) * 0.06 + Math.sin(17 * th - 2 * r) * 0.04
        // Neige au-dessus d'une ligne irrégulière, roche bleutée en dessous, pied enneigé.
        const snow = t > 0.5 + n ? 1 : t < 0.08 + n ? 0.85 : 0
        const rock = mixColor('#2b3656', '#4a5a80', 0.5 + n * 6)
        const c = snow ? mixColor('#cbd8f2', '#f4f8ff', t + n * 2) : rock
        col.push(c.r, c.g, c.b)
      }
    }
    for (let i = 0; i < NR; i++) {
      for (let j = 0; j < NS; j++) {
        const a = i * NS + j
        const b = i * NS + ((j + 1) % NS)
        const c = (i + 1) * NS + j
        const d = (i + 1) * NS + ((j + 1) % NS)
        idx.push(a, b, c, b, d, c)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])
}

function Label({ position, title, subtitle, accent, strong }) {
  return (
    <Html position={position} center distanceFactor={22} zIndexRange={LABEL_Z} style={{ pointerEvents: 'none' }}>
      <div
        className={`flex items-center gap-2 whitespace-nowrap rounded-full ${strong ? 'px-3.5 py-2' : 'px-2.5 py-1'}`}
        style={{ background: 'rgba(14,20,38,0.78)', color: '#eef3ff', backdropFilter: 'blur(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.12)' }}
      >
        {accent && <span className="shrink-0 rounded-full" style={{ background: accent, width: 8, height: 8, boxShadow: `0 0 0 3px ${accent}44` }} />}
        <span className="text-left">
          <span className={`block ${strong ? 'text-[13px] font-semibold tracking-tight' : 'text-[11px] font-medium'}`}>{title}</span>
          {subtitle && <span className="block text-[10px] text-white/60">{subtitle}</span>}
        </span>
      </div>
    </Html>
  )
}

function Mountain() {
  const geometry = useMountainGeometry()
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.85} />
    </mesh>
  )
}

// Sapins enneigés autour du pied de la montagne (placement pseudo-aléatoire stable).
function Forest() {
  const trees = useMemo(() => {
    let seed = 7
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const out = []
    for (let k = 0; k < 90; k++) {
      const th = rand() * Math.PI * 2
      const r = R * (0.92 + rand() * 0.75)
      // On dégage l'arrivée du sentier devant la caméra.
      if (Math.abs(((th - START_ANGLE + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35 && r < R * 1.3) continue
      out.push({ x: r * Math.cos(th), z: r * Math.sin(th), s: 0.6 + rand() * 0.7, y: Math.max(0, heightAt(th, Math.min(r, R))) })
    }
    return out
  }, [])
  return (
    <group>
      {trees.map((t, k) => (
        <group key={k} position={[t.x, t.y, t.z]} scale={t.s}>
          <mesh position-y={0.25}><cylinderGeometry args={[0.08, 0.1, 0.5, 6]} /><meshStandardMaterial color="#3b2a20" /></mesh>
          <mesh position-y={0.95} castShadow><coneGeometry args={[0.55, 1.1, 7]} /><meshStandardMaterial color="#1f4a3c" flatShading /></mesh>
          <mesh position-y={1.55} castShadow><coneGeometry args={[0.4, 0.85, 7]} /><meshStandardMaterial color="#25594a" flatShading /></mesh>
          <mesh position-y={1.95}><coneGeometry args={[0.2, 0.35, 7]} /><meshStandardMaterial color="#f1f6ff" flatShading /></mesh>
        </group>
      ))}
    </group>
  )
}

function Trail({ progress }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 320 }, (_, i) => pathPoint(i / 319))), [])
  const done = useMemo(() => {
    if (progress <= 0.002) return null
    const n = Math.max(2, Math.round(320 * progress))
    return new THREE.CatmullRomCurve3(Array.from({ length: n }, (_, i) => pathPoint((i / (n - 1)) * progress)))
  }, [progress])
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 640, 0.05, 6, false]} />
        <meshStandardMaterial color="#c9d6f5" transparent opacity={0.45} roughness={0.9} />
      </mesh>
      {done && (
        <mesh>
          <tubeGeometry args={[done, Math.max(8, Math.round(640 * progress)), 0.09, 8, false]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

function Flag({ position, color = '#7dd3fc', size = 1 }) {
  return (
    <group position={position} scale={size}>
      <mesh position-y={0.32}><cylinderGeometry args={[0.018, 0.018, 0.64, 6]} /><meshStandardMaterial color="#d9e2f5" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0.14, 0.54, 0]}>
        <boxGeometry args={[0.26, 0.16, 0.015]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
    </group>
  )
}

function TodayBeacon({ position, validated }) {
  const ring = useRef()
  useFrame(({ clock }) => {
    if (!ring.current) return
    const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 1.4
    ring.current.scale.set(s, s, 1)
    ring.current.material.opacity = 0.9 * (1 - ((clock.elapsedTime * 0.8) % 1))
  })
  const color = validated ? '#7dd3fc' : '#fbbf24'
  return (
    <group position={position}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.28, 0.36, 40]} />
        <meshBasicMaterial color={color} transparent toneMapped={false} />
      </mesh>
      <mesh position-y={1.6}>
        <cylinderGeometry args={[0.05, 0.12, 3.2, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight position-y={0.6} color={color} intensity={2.5} distance={3.5} />
    </group>
  )
}

// Une étape par jour : drapeau si validé, pierre grise si manqué, balise pour aujourd'hui.
function DayMarkers({ days }) {
  const n = days.length
  return (
    <group>
      {days.map((d, k) => {
        const p = pathPoint((k + 1) / n)
        if (d.validated) return <Flag key={d.date} position={p} size={d.today ? 1.3 : 1} />
        if (d.past) return (
          <mesh key={d.date} position={[p.x, p.y + 0.06, p.z]} rotation={[k, k * 2, 0]}>
            <dodecahedronGeometry args={[0.1]} /><meshStandardMaterial color="#5b6684" flatShading />
          </mesh>
        )
        if (d.today) return null
        return (
          <mesh key={d.date} position={p}>
            <sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
          </mesh>
        )
      })}
    </group>
  )
}

function Tent({ position, color = '#f97316', rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position-y={0.32} castShadow><coneGeometry args={[0.45, 0.65, 4]} /><meshStandardMaterial color={color} flatShading roughness={0.7} /></mesh>
      <mesh position={[0, 0.2, 0.27]} rotation-y={Math.PI / 4}><planeGeometry args={[0.18, 0.3]} /><meshBasicMaterial color="#1b1208" /></mesh>
    </group>
  )
}

function Campfire({ position }) {
  const flame = useRef()
  useFrame(({ clock }) => {
    if (!flame.current) return
    const t = clock.elapsedTime
    flame.current.scale.set(1 + Math.sin(t * 11) * 0.12, 1 + Math.sin(t * 8.3) * 0.2, 1 + Math.cos(t * 9) * 0.12)
  })
  return (
    <group position={position}>
      {[0, 1, 2].map(k => (
        <mesh key={k} position-y={0.05} rotation={[Math.PI / 2, 0, (k / 3) * Math.PI]}><cylinderGeometry args={[0.03, 0.03, 0.42, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
      ))}
      <group ref={flame} position-y={0.08}>
        <mesh position-y={0.16}><coneGeometry args={[0.12, 0.34, 10]} /><meshStandardMaterial color="#ff7a45" emissive="#ff6a2b" emissiveIntensity={2.5} toneMapped={false} /></mesh>
        <mesh position-y={0.12}><coneGeometry args={[0.06, 0.2, 10]} /><meshStandardMaterial color="#ffd66b" emissive="#ffd66b" emissiveIntensity={2.5} toneMapped={false} /></mesh>
      </group>
      <pointLight position-y={0.5} color="#ff9a5c" intensity={4} distance={5} />
    </group>
  )
}

// Grimpeur : bonnet, sac à dos, petite respiration.
function Climber({ position, color, heading }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2.2)) * 0.05
  })
  return (
    <group position={position} rotation-y={heading}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}><circleGeometry args={[0.22, 20]} /><meshBasicMaterial color="#000" transparent opacity={0.25} /></mesh>
      <group ref={ref} scale={0.75}>
        <mesh position-y={0.55} castShadow><capsuleGeometry args={[0.2, 0.45, 8, 16]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
        <mesh position-y={1.08} castShadow><sphereGeometry args={[0.17, 24, 24]} /><meshStandardMaterial color="#E8C4A0" roughness={0.6} /></mesh>
        <mesh position-y={1.16}><sphereGeometry args={[0.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1f4fd1" /></mesh>
        <mesh position-y={1.38}><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <mesh position={[0, 0.65, -0.22]} castShadow><boxGeometry args={[0.3, 0.38, 0.16]} /><meshStandardMaterial color="#f97316" roughness={0.7} /></mesh>
        {/* Bâton de marche */}
        <mesh position={[0.28, 0.5, 0.05]} rotation-z={-0.15}><cylinderGeometry args={[0.015, 0.015, 1, 6]} /><meshStandardMaterial color="#c0c8d8" metalness={0.5} /></mesh>
      </group>
    </group>
  )
}

function Summit({ reached }) {
  const top = pathPoint(1)
  return (
    <group position={top}>
      <Flag position={[0, 0, 0]} color={reached ? '#fbbf24' : '#e2e8f0'} size={2.2} />
      <Float speed={2} floatIntensity={0.6} rotationIntensity={1.2}>
        <mesh position-y={2.2}>
          <octahedronGeometry args={[0.32]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={reached ? 3 : 0.8} toneMapped={false} />
        </mesh>
      </Float>
      <pointLight position-y={2.2} color="#fbbf24" intensity={reached ? 6 : 1.5} distance={7} />
    </group>
  )
}

function Snowfall() {
  const ref = useRef()
  const positions = useMemo(() => {
    let seed = 99
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const arr = new Float32Array(1600 * 3)
    for (let i = 0; i < 1600; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * 30
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = rand() * 22
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    return arr
  }, [])
  useFrame(({ clock }, delta) => {
    const geo = ref.current?.geometry
    if (!geo) return
    const a = geo.attributes.position.array
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= delta * 0.9
      a[i] += Math.sin(clock.elapsedTime + i) * delta * 0.15
      if (a[i + 1] < 0) a[i + 1] = 22
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.12} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

// Nuages bas qui tournent lentement autour de la montagne.
function Clouds() {
  const ref = useRef()
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.02 })
  const clouds = [[0, 6.5, 13], [2.2, 8, 10], [4.1, 5.5, 14], [5.3, 9, 8]]
  return (
    <group ref={ref}>
      {clouds.map(([a, y, r], k) => (
        <group key={k} position={[Math.cos(a) * r, y, Math.sin(a) * r]}>
          {[[0, 0, 0, 1.1], [0.9, -0.15, 0.2, 0.8], [-0.9, -0.2, -0.1, 0.75], [0.3, 0.35, -0.2, 0.7]].map(([x, yy, z, s], i) => (
            <mesh key={i} position={[x, yy, z]} scale={s}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#e8eefc" transparent opacity={0.55} flatShading roughness={1} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export default function MountainScene({ days, avatarColor = '#3B6FF0', focusAvatar = 0 }) {
  const [ready, setReady] = useState(false)
  const n = days.length
  const validated = days.filter(d => d.validated).length
  const progress = n ? validated / n : 0
  const climberPos = pathPoint(progress)
  const ahead = pathPoint(Math.min(1, progress + 0.01))
  const heading = Math.atan2(ahead.x - climberPos.x, ahead.z - climberPos.z)
  const todayIdx = days.findIndex(d => d.today)
  const camps = [0.25, 0.5, 0.75]
  // Recentrer la caméra : sur le grimpeur quand on demande « Me retrouver ».
  const target = focusAvatar ? [climberPos.x * 0.6, climberPos.y, climberPos.z * 0.6] : [0, 4.5, 0]

  return (
    <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #2a3d72 0%, #101a38 50%, #060a18 100%)' }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 13, 34], fov: 38 }}
        onCreated={() => setReady(true)}
      >
        <fog attach="fog" args={['#0e1730', 38, 90]} />
        <hemisphereLight args={['#bcd0ff', '#1a2240', 0.7]} />
        <directionalLight
          position={[-16, 26, 14]} intensity={2} color="#e3ecff" castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.03}
          shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22}
        />
        <directionalLight position={[18, 8, -10]} intensity={0.6} color="#8fb4ff" />
        <Stars radius={90} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />

        <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
          <circleGeometry args={[80, 64]} /><meshStandardMaterial color="#d7e2f7" roughness={1} />
        </mesh>
        <Mountain />
        <Forest />
        <Trail progress={progress} />
        <Clouds />
        <Snowfall />

        {/* Camp de base */}
        <group position={pathPoint(0)}>
          <Tent position={[-0.9, -0.1, 0.6]} rotation={0.4} />
          <Tent position={[0.9, -0.1, 0.7]} color="#3b82f6" rotation={-0.3} />
          <Campfire position={[0, -0.1, 1.1]} />
        </group>
        {camps.map((t, k) => {
          const p = pathPoint(t)
          return <Tent key={t} position={[p.x * 1.04, p.y - 0.12, p.z * 1.04]} color={progress >= t ? '#f97316' : '#64748b'} rotation={k} />
        })}
        <Summit reached={n > 0 && validated >= n} />

        {ready && (
          <>
            <DayMarkers days={days} />
            {todayIdx >= 0 && <TodayBeacon position={pathPoint((todayIdx + 1) / n)} validated={days[todayIdx].validated} />}
            <Climber position={climberPos} color={avatarColor} heading={heading} />
            <Label position={[climberPos.x, climberPos.y + 1.5, climberPos.z]} title={`Toi · ${Math.round(progress * ARC_SUMMIT_M).toLocaleString('fr-FR')} m`} accent="#7dd3fc" strong />
            <Label position={[pathPoint(0).x, pathPoint(0).y + 1.6, pathPoint(0).z + 0.6]} title="Camp de base" subtitle={n ? `${n} étapes jusqu'au sommet` : 'Lance un Winter Arc pour partir'} />
            {camps.map((t, k) => {
              const p = pathPoint(t)
              return <Label key={t} position={[p.x * 1.04, p.y + 1.1, p.z * 1.04]} title={`Camp ${k + 1}`} subtitle={`${Math.round(t * ARC_SUMMIT_M).toLocaleString('fr-FR')} m`} accent={progress >= t ? '#f97316' : undefined} />
            })}
            <Label position={[0, pathPoint(1).y + 3.4, 0]} title={`Sommet · ${ARC_SUMMIT_M.toLocaleString('fr-FR')} m`} subtitle={n ? `${validated} / ${n} jours validés` : undefined} accent="#fbbf24" strong />
          </>
        )}

        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          minDistance={10}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.08}
          autoRotate={!focusAvatar}
          autoRotateSpeed={0.35}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  )
}
