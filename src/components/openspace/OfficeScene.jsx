import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, RoundedBox, ContactShadows, Environment, Lightformer, Float, Sparkles } from '@react-three/drei'

// Diorama « maquette d'architecte » : plateau épais, murs en coupe, matériaux doux,
// éclairage d'environnement procédural (aucun fichier HDR à télécharger) et un peu de vie
// (avatars qui respirent, anneaux d'objectif qui tournent, poussière dans la lumière).
const PALETTES = {
  light: {
    bg: 'radial-gradient(120% 90% at 50% 0%, #f7f9ff 0%, #e4ebfa 55%, #d3ddf2 100%)',
    floor: '#F3F1EC', grout: '#E3DFD6', slab: '#C9D2E3', slabSide: '#AEB9CF', wall: '#FBFAF7', wallTrim: '#DCE2EE',
    sky: '#BFD6FF', skyNight: '#1B2A55', lamp: '#FFD9A0', desk: '#FFFFFF', wood: '#D9B98C', leg: '#8F98AA', chair: '#22304D',
    screenOff: '#0F1626', bezel: '#1A2133', glass: '#CFE0FF', board: '#121a2c', track: '#2a3550', plant: '#3E9B66', plantDark: '#23764A', pot: '#E8DCCB',
    rugMix: 0.64, labelBg: 'rgba(255,255,255,0.86)', dust: '#ffffff',
  },
  dark: {
    bg: 'radial-gradient(120% 90% at 50% 0%, #1b2440 0%, #0d1324 55%, #070a14 100%)',
    floor: '#1E2638', grout: '#252F45', slab: '#141B2C', slabSide: '#0C1220', wall: '#273149', wallTrim: '#1A2236',
    sky: '#2A3F78', skyNight: '#0E1838', lamp: '#FFC27A', desk: '#3A465F', wood: '#6E5A45', leg: '#6B7690', chair: '#0E1424',
    screenOff: '#070B16', bezel: '#0B101C', glass: '#5B7FD8', board: '#0B111E', track: '#1F2A44', plant: '#3FA36F', plantDark: '#2B7F55', pot: '#5E5245',
    rugMix: 0.55, labelBg: 'rgba(22,28,44,0.82)', dust: '#9fc0ff',
  },
}

// Mélange une couleur vers une autre (rugs pastel à partir de la couleur du pôle).
function mix(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
}

// Les étiquettes HTML restent sous les dialogues de l'app (palette ⌘K, modales).
const LABEL_Z = [20, 0]

function Label({ position, title, subtitle, accent, strong, palette, muted }) {
  return (
    <Html position={position} center distanceFactor={16} zIndexRange={LABEL_Z} style={{ pointerEvents: 'none' }}>
      <div
        className={`flex items-center gap-2 whitespace-nowrap rounded-full ${strong ? 'px-3.5 py-2' : 'px-2.5 py-1'}`}
        style={{
          background: palette.labelBg, color: 'var(--text-primary)', backdropFilter: 'blur(8px)',
          boxShadow: strong ? '0 8px 24px rgba(15,25,50,0.18), inset 0 0 0 1px rgba(255,255,255,0.18)' : '0 3px 10px rgba(15,25,50,0.12)',
          opacity: muted ? 0.82 : 1,
        }}
      >
        {accent && <span className="shrink-0 rounded-full" style={{ background: accent, width: strong ? 10 : 7, height: strong ? 10 : 7, boxShadow: `0 0 0 3px ${accent}33` }} />}
        <span className="text-left">
          <span className={`block ${strong ? 'text-[13px] font-semibold tracking-tight' : 'text-[11px] font-medium'}`}>{title}</span>
          {subtitle && <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</span>}
        </span>
      </div>
    </Html>
  )
}

function hoverHandlers(id, setHovered) {
  return {
    onPointerOver: e => { e.stopPropagation(); setHovered(id); document.body.style.cursor = 'pointer' },
    onPointerOut: () => { setHovered(h => (h === id ? null : h)); document.body.style.cursor = '' },
  }
}

// Anneau de sélection qui pulse doucement.
function SelectionRing({ color, radius = 1.35 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.04
    ref.current.scale.set(s, s, 1)
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position-y={0.03}>
      <ringGeometry args={[radius, radius + 0.1, 64]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
    </mesh>
  )
}

function Chair({ palette, z = 0.75 }) {
  return (
    <group position={[0, 0, z]}>
      <RoundedBox args={[0.56, 0.1, 0.54]} radius={0.04} position-y={0.47} castShadow><meshStandardMaterial color={palette.chair} roughness={0.7} /></RoundedBox>
      <RoundedBox args={[0.54, 0.58, 0.08]} radius={0.04} position={[0, 0.8, 0.25]} rotation-x={-0.08} castShadow><meshStandardMaterial color={palette.chair} roughness={0.7} /></RoundedBox>
      <mesh position-y={0.26}><cylinderGeometry args={[0.035, 0.035, 0.42, 10]} /><meshStandardMaterial color={palette.leg} metalness={0.6} roughness={0.3} /></mesh>
      {/* Piètement 5 branches */}
      {[0, 1, 2, 3, 4].map(k => (
        <mesh key={k} position={[Math.cos((k / 5) * Math.PI * 2) * 0.16, 0.05, Math.sin((k / 5) * Math.PI * 2) * 0.16]} rotation-y={-(k / 5) * Math.PI * 2}>
          <boxGeometry args={[0.32, 0.03, 0.04]} /><meshStandardMaterial color={palette.leg} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Monitor({ palette, color, on, position, width = 0.95 }) {
  return (
    <group position={position}>
      <RoundedBox args={[width, width * 0.6, 0.045]} radius={0.02} castShadow><meshStandardMaterial color={palette.bezel} roughness={0.4} metalness={0.3} /></RoundedBox>
      <mesh position-z={0.024}>
        <planeGeometry args={[width - 0.07, width * 0.6 - 0.07]} />
        <meshStandardMaterial color={on ? color : palette.screenOff} emissive={on ? color : '#000'} emissiveIntensity={on ? 1.4 : 0} toneMapped={!on} roughness={0.2} />
      </mesh>
      {/* Lignes de « code » sur l'écran allumé */}
      {on && [0.12, 0.04, -0.04, -0.12].map((y, i) => (
        <mesh key={y} position={[-width * 0.12 + (i % 2) * 0.06, y * width, 0.026]}>
          <planeGeometry args={[width * (0.55 - i * 0.07), 0.025]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, -width * 0.38, -0.03]}><boxGeometry args={[0.05, 0.16, 0.05]} /><meshStandardMaterial color={palette.leg} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, -width * 0.46, -0.03]}><boxGeometry args={[0.28, 0.02, 0.18]} /><meshStandardMaterial color={palette.leg} metalness={0.6} roughness={0.3} /></mesh>
    </group>
  )
}

function Desk({ desk, palette, selected, hovered, onSelect, setHovered }) {
  const lift = hovered ? 0.06 : 0
  const active = selected || hovered
  return (
    <group position={desk.position} onClick={e => { e.stopPropagation(); onSelect(desk.id) }} {...hoverHandlers(desk.id, setHovered)}>
      <group position-y={lift}>
        <RoundedBox args={[1.9, 0.07, 1.0]} radius={0.03} position-y={0.76} castShadow receiveShadow>
          <meshStandardMaterial color={palette.desk} roughness={0.35} />
        </RoundedBox>
        {/* Piètement en arceau */}
        {[-0.82, 0.82].map(x => (
          <group key={x} position-x={x}>
            <mesh position={[0, 0.37, 0]} castShadow><boxGeometry args={[0.05, 0.74, 0.86]} /><meshStandardMaterial color={palette.leg} metalness={0.5} roughness={0.35} /></mesh>
          </group>
        ))}
        <Monitor palette={palette} color={desk.color} on={desk.busy} position={[0, 1.19, -0.28]} />
        {/* Clavier, souris, tasse */}
        <RoundedBox args={[0.62, 0.025, 0.2]} radius={0.01} position={[0, 0.805, 0.05]}><meshStandardMaterial color={palette.bezel} roughness={0.6} /></RoundedBox>
        <mesh position={[0.48, 0.81, 0.06]}><sphereGeometry args={[0.045, 12, 8]} /><meshStandardMaterial color={palette.bezel} /></mesh>
        <mesh position={[-0.7, 0.85, 0.15]}><cylinderGeometry args={[0.055, 0.045, 0.12, 14]} /><meshStandardMaterial color={desk.color} roughness={0.4} /></mesh>
      </group>
      <Chair palette={palette} />
      {desk.overdue && (
        <Float speed={3} floatIntensity={0.6} rotationIntensity={0}>
          <mesh position={[0.6, 1.75 + lift, -0.28]}>
            <octahedronGeometry args={[0.12]} />
            <meshStandardMaterial color="#FF4D57" emissive="#FF4D57" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </Float>
      )}
      {active && <SelectionRing color={desk.color} />}
      <Label
        position={[0, 1.95, -0.3]} palette={palette}
        title={desk.label} subtitle={active ? desk.sublabel : undefined}
        accent={desk.busy || active ? desk.color : undefined} muted={!active && !desk.busy}
      />
    </group>
  )
}

// Jauge North Star : anneau holographique qui flotte au fond de la zone.
function NorthStarRing({ zone, palette }) {
  const progress = Math.max(0, Math.min(100, zone.pole.northStarProgress || 0)) / 100
  const ref = useRef()
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.05 })
  const color = zone.pole.color
  return (
    <group position={zone.boardPosition}>
      {/* Socle */}
      <RoundedBox args={[1.1, 0.16, 0.5]} radius={0.06} position-y={0.08} castShadow><meshStandardMaterial color={palette.board} roughness={0.4} /></RoundedBox>
      <mesh position-y={0.17}><boxGeometry args={[0.9, 0.012, 0.3]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <Float speed={1.4} floatIntensity={0.35} rotationIntensity={0}>
        <group ref={ref} position-y={1.4}>
          <mesh><torusGeometry args={[0.9, 0.06, 12, 72]} /><meshStandardMaterial color={palette.track} transparent opacity={0.7} roughness={0.3} /></mesh>
          {progress > 0 && (
            <mesh rotation-z={Math.PI / 2}>
              <torusGeometry args={[0.9, 0.09, 12, 72, Math.PI * 2 * progress]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          )}
          <mesh><circleGeometry args={[0.78, 48]} /><meshBasicMaterial color={color} transparent opacity={0.1} toneMapped={false} side={THREE.DoubleSide} /></mesh>
        </group>
      </Float>
    </group>
  )
}

function Plant({ palette, position, small, variant = 0 }) {
  const s = small ? 0.75 : 1
  return (
    <group position={position} scale={s}>
      <mesh position-y={0.24} castShadow><cylinderGeometry args={[0.22, 0.16, 0.48, 20]} /><meshStandardMaterial color={palette.pot} roughness={0.8} /></mesh>
      {variant % 2 === 0 ? (
        <>
          <mesh position-y={0.78} castShadow><icosahedronGeometry args={[0.36, 1]} /><meshStandardMaterial color={palette.plant} flatShading roughness={0.8} /></mesh>
          <mesh position={[0.15, 1.05, 0.06]} castShadow><icosahedronGeometry args={[0.24, 1]} /><meshStandardMaterial color={palette.plantDark} flatShading roughness={0.8} /></mesh>
        </>
      ) : (
        // Plante haute type sansevieria
        [0, 1, 2, 3, 4].map(k => (
          <mesh key={k} position={[Math.cos(k * 1.3) * 0.08, 0.85, Math.sin(k * 1.3) * 0.08]} rotation={[Math.cos(k * 1.3) * 0.25, 0, Math.sin(k * 1.3) * 0.25]} castShadow>
            <coneGeometry args={[0.07, 0.95, 4]} /><meshStandardMaterial color={k % 2 ? palette.plant : palette.plantDark} flatShading roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  )
}

// Boîte aux lettres du bureau : le drapeau se lève quand des mails importants attendent.
function Mailbox({ count, position, palette }) {
  return (
    <group position={position}>
      <mesh position-y={0.45}><cylinderGeometry args={[0.04, 0.04, 0.9, 8]} /><meshStandardMaterial color="#6B6B75" metalness={0.5} roughness={0.4} /></mesh>
      <RoundedBox args={[0.5, 0.36, 0.7]} radius={0.12} position-y={1.0} castShadow><meshStandardMaterial color="#1F4FD1" roughness={0.35} /></RoundedBox>
      <mesh position={[0.27, count ? 1.25 : 1.05, -0.1]} rotation-z={count ? 0 : -Math.PI / 2}>
        <boxGeometry args={[0.04, 0.3, 0.14]} /><meshStandardMaterial color={count ? '#E5484D' : '#9AA39C'} />
      </mesh>
      {count > 0 && <Label position={[0, 1.65, 0]} palette={palette} title={`📬 ${count} mail${count > 1 ? 's' : ''}`} accent="#E5484D" />}
    </group>
  )
}

// Cloisons vitrées basses sur trois côtés d'une zone, montants à la couleur du pôle.
function GlassPartitions({ w, d, color, palette, height = 1.05 }) {
  const sides = [
    [0, -d / 2, w, 0],
    [-w / 2, 0, d, Math.PI / 2],
    [w / 2, 0, d, Math.PI / 2],
  ]
  return (
    <group>
      {sides.map(([x, z, len, rot]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} rotation-y={rot}>
          <mesh position-y={height / 2 + 0.02}>
            <boxGeometry args={[len, height, 0.03]} />
            <meshPhysicalMaterial color={palette.glass} transparent opacity={0.22} roughness={0.05} metalness={0} />
          </mesh>
          <mesh position-y={height + 0.03}><boxGeometry args={[len, 0.04, 0.06]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  )
}

function PoleZone({ zone, poleLevel, palette, selectedId, hoveredId, onSelect, setHovered }) {
  const [cx, cz] = zone.center
  const [w, d] = zone.size
  const active = selectedId === zone.id || hoveredId === zone.id
  const color = zone.pole.color
  const rug = mix(color, palette.floor, palette.rugMix)
  return (
    <group>
      {/* Liseré + estrade */}
      <RoundedBox args={[w + 0.2, 0.08, d + 0.2]} radius={0.04} position={[cx, 0.04, cz]} receiveShadow>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.5 : 0.1} roughness={0.5} />
      </RoundedBox>
      <RoundedBox
        args={[w, 0.14, d]} radius={0.05} position={[cx, 0.07, cz]} receiveShadow
        onClick={e => { e.stopPropagation(); onSelect(zone.id) }} {...hoverHandlers(zone.id, setHovered)}
      >
        <meshStandardMaterial color={rug} roughness={0.9} />
      </RoundedBox>
      {/* Tapis central plus clair */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.142, cz + 0.4]} receiveShadow>
        <planeGeometry args={[w - 1.2, d - 2.4]} />
        <meshStandardMaterial color={mix(rug, '#ffffff', 0.25)} roughness={1} transparent opacity={active ? 0.9 : 0.6} />
      </mesh>
      <group position={[cx, 0.14, cz]}>
        <GlassPartitions w={w} d={d} color={color} palette={palette} />
      </group>
      <Plant palette={palette} position={[cx - w / 2 + 0.5, 0.14, cz - d / 2 + 0.5]} variant={1} />
      <Plant palette={palette} position={[cx + w / 2 - 0.5, 0.14, cz - d / 2 + 0.5]} small />
      <NorthStarRing zone={zone} palette={palette} />
      <Label
        position={[cx, 3.0, zone.boardPosition[2]]} palette={palette}
        title={`${zone.pole.emoji || ''} ${zone.pole.name} · Niv. ${poleLevel}`.trim()}
        subtitle={zone.pole.northStar ? `${zone.pole.northStar} · ${zone.pole.northStarProgress || 0}%` : undefined}
        accent={color} strong
      />
      {zone.desks.map(desk => (
        <Desk
          key={desk.id} desk={desk} palette={palette}
          selected={selectedId === desk.id} hovered={hoveredId === desk.id}
          onSelect={onSelect} setHovered={setHovered}
        />
      ))}
      {zone.desks.length === 0 && (
        <Label position={[cx, 0.6, cz + 0.6]} palette={palette} title={zone.isClientsPole ? 'Aucun client actif' : 'Aucune tâche ouverte'} muted />
      )}
    </group>
  )
}

// Accessoires d'avatar (débloqués par niveau, voir AVATAR_ACCESSORIES).
function Accessory({ kind }) {
  if (kind === 'cap') return (
    <group position-y={1.5}>
      <mesh><sphereGeometry args={[0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1f4fd1" /></mesh>
      <mesh position={[0, 0.01, 0.2]} rotation-x={-0.1}><boxGeometry args={[0.3, 0.02, 0.18]} /><meshStandardMaterial color="#1f4fd1" /></mesh>
    </group>
  )
  if (kind === 'headphones') return (
    <group position-y={1.4}>
      <mesh rotation-z={Math.PI / 2} position-y={0.08}><torusGeometry args={[0.22, 0.025, 8, 24, Math.PI]} /><meshStandardMaterial color="#111827" /></mesh>
      {[-0.22, 0.22].map(x => <mesh key={x} position-x={x}><cylinderGeometry args={[0.07, 0.07, 0.06, 16]} /><meshStandardMaterial color="#111827" /></mesh>)}
    </group>
  )
  if (kind === 'glasses') return (
    <group position={[0, 1.4, 0.19]}>
      {[-0.08, 0.08].map(x => <mesh key={x} position-x={x}><torusGeometry args={[0.05, 0.012, 8, 20]} /><meshStandardMaterial color="#111827" /></mesh>)}
    </group>
  )
  if (kind === 'crown') return (
    <group position-y={1.6}>
      <mesh><cylinderGeometry args={[0.16, 0.18, 0.12, 6, 1, true]} /><meshStandardMaterial color="#FFC83D" metalness={0.8} roughness={0.25} emissive="#FFB000" emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
    </group>
  )
  if (kind === 'beanie') return (
    <group position-y={1.48}>
      <mesh><sphereGeometry args={[0.215, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1f4fd1" /></mesh>
      <mesh position-y={0.01} rotation-x={Math.PI / 2}><torusGeometry args={[0.205, 0.04, 8, 24]} /><meshStandardMaterial color="#e6eeff" /></mesh>
      <mesh position-y={0.24}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
  )
  if (kind === 'halo') return (
    <mesh position-y={1.72} rotation-x={Math.PI / 2}><torusGeometry args={[0.16, 0.025, 8, 32]} /><meshStandardMaterial color="#FFF2B0" emissive="#FFE680" emissiveIntensity={2} toneMapped={false} /></mesh>
  )
  return null
}

// Avatar qui « respire » (léger mouvement vertical, décalé par phase).
function Avatar({ color, position, robot, accessory, phase = 0 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime + phase
    ref.current.position.y = Math.sin(t * 2) * 0.03
    ref.current.rotation.y = Math.sin(t * 0.7) * 0.15
  })
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}><circleGeometry args={[0.32, 24]} /><meshBasicMaterial color="#000" transparent opacity={0.12} /></mesh>
      <group ref={ref}>
        {robot ? (
          <>
            <RoundedBox args={[0.5, 0.6, 0.35]} radius={0.1} position-y={0.75} castShadow><meshStandardMaterial color={color} roughness={0.35} metalness={0.2} /></RoundedBox>
            <RoundedBox args={[0.44, 0.36, 0.36]} radius={0.1} position-y={1.28} castShadow><meshStandardMaterial color="#E6E8EE" roughness={0.3} metalness={0.2} /></RoundedBox>
            <mesh position={[0, 1.29, 0.181]}><planeGeometry args={[0.32, 0.16]} /><meshStandardMaterial color="#0b1020" roughness={0.2} /></mesh>
            {[-0.07, 0.07].map(x => (
              <mesh key={x} position={[x, 1.3, 0.185]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
            ))}
            <mesh position-y={1.53}><cylinderGeometry args={[0.012, 0.012, 0.14, 6]} /><meshStandardMaterial color="#9aa0ad" /></mesh>
            <mesh position-y={1.62}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} /></mesh>
          </>
        ) : (
          <>
            <mesh position-y={0.7} castShadow><capsuleGeometry args={[0.24, 0.6, 8, 16]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
            <mesh position-y={1.38} castShadow><sphereGeometry args={[0.2, 32, 32]} /><meshStandardMaterial color="#E8C4A0" roughness={0.6} /></mesh>
            <Accessory kind={accessory} />
          </>
        )}
      </group>
    </group>
  )
}

// Flamme de la série de jours : plus la série est longue, plus elle est haute ; elle vacille.
function StreakFlame({ streak, position }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.scale.set(1 + Math.sin(t * 9) * 0.05, 1 + Math.sin(t * 7.3) * 0.1, 1 + Math.cos(t * 8) * 0.05)
  })
  if (!streak) return null
  const scale = 0.6 + Math.min(streak, 14) * 0.06
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.12}><cylinderGeometry args={[0.22, 0.28, 0.24, 16]} /><meshStandardMaterial color="#3a3f4b" metalness={0.5} roughness={0.4} /></mesh>
      <group ref={ref} position-y={0.24}>
        <mesh position-y={0.31}><coneGeometry args={[0.2, 0.6, 16]} /><meshStandardMaterial color="#FF7A45" emissive="#FF6A2B" emissiveIntensity={2.2} toneMapped={false} /></mesh>
        <mesh position-y={0.21}><coneGeometry args={[0.11, 0.36, 16]} /><meshStandardMaterial color="#FFD66B" emissive="#FFD66B" emissiveIntensity={2.5} toneMapped={false} /></mesh>
      </group>
      <pointLight position-y={0.6} color="#FF9A5C" intensity={2} distance={3.5} />
    </group>
  )
}

function Hub({ palette, inboxCount, mailCount, game, avatar, selected, hovered, onSelect, setHovered }) {
  const crates = Math.min(inboxCount, 8)
  return (
    <group position={[0, 0, 3.5]} onClick={e => { e.stopPropagation(); onSelect('hub') }} {...hoverHandlers('hub', setHovered)}>
      {/* Tapis rond sous le bureau principal */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0.4]} receiveShadow>
        <circleGeometry args={[2.4, 64]} /><meshStandardMaterial color={mix('#3B6FF0', palette.floor, palette.rugMix)} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0.4]}>
        <ringGeometry args={[2.25, 2.32, 64]} /><meshBasicMaterial color="#3B6FF0" toneMapped={false} transparent opacity={0.6} />
      </mesh>
      <RoundedBox args={[3, 0.09, 1.3]} radius={0.04} position-y={0.76} castShadow receiveShadow><meshStandardMaterial color={palette.wood} roughness={0.55} /></RoundedBox>
      <RoundedBox args={[2.7, 0.7, 0.9]} radius={0.05} position-y={0.37} castShadow><meshStandardMaterial color={palette.desk} roughness={0.4} /></RoundedBox>
      <Monitor palette={palette} color="#3B6FF0" on position={[-0.62, 1.22, -0.38]} width={1.08} />
      <Monitor palette={palette} color="#6C8BFF" on position={[0.62, 1.22, -0.38]} width={1.08} />
      <pointLight position={[0, 1.3, 0.2]} color="#6C8BFF" intensity={1.2} distance={3} />
      <Avatar color={avatar?.color || '#3B6FF0'} accessory={avatar?.accessory} position={[0, 0, 1.1]} />
      {/* Caisses = éléments de l'Inbox à trier */}
      {Array.from({ length: crates }, (_, k) => (
        <RoundedBox key={k} args={[0.42, 0.38, 0.42]} radius={0.03} position={[2.2 + (k % 2) * 0.5, 0.2 + Math.floor(k / 2) * 0.4, 0.2]} rotation-y={(k % 3) * 0.12} castShadow>
          <meshStandardMaterial color="#D9A86C" roughness={0.85} />
        </RoundedBox>
      ))}
      {(selected || hovered) && <SelectionRing color="#3B6FF0" radius={2.45} />}
      <StreakFlame streak={game.streak.current} position={[-2, 0, 0.3]} />
      <Mailbox count={mailCount} position={[2.3, 0, -0.9]} palette={palette} />
      <Plant palette={palette} position={[-2.2, 0, -0.9]} variant={1} />
      <Label
        position={[0, 2.3, 0]} palette={palette}
        title={`Ton bureau · Niv. ${game.level}`}
        subtitle={[game.streak.current ? `🔥 ${game.streak.current} j` : null, inboxCount ? `${inboxCount} dans l'Inbox` : 'Inbox vide'].filter(Boolean).join(' · ')}
        accent="#3B6FF0" strong
      />
    </group>
  )
}

function AgentsCorner({ agents, palette, selectedId, hoveredId, onSelect, setHovered }) {
  return (
    <group>
      <RoundedBox args={[6.6, 0.04, 4]} radius={0.02} position={[-9, 0.02, 4.2]} receiveShadow>
        <meshStandardMaterial color={mix('#8B7CF6', palette.floor, palette.rugMix)} roughness={1} />
      </RoundedBox>
      {agents.desks.map((agent, k) => {
        const id = `agent:${agent.id}`
        const desk = { id, position: agent.position, color: agent.color, busy: true, label: agent.name, sublabel: 'Via MCP' }
        return (
          <group key={id}>
            <Desk desk={desk} palette={palette} selected={selectedId === id} hovered={hoveredId === id} onSelect={onSelect} setHovered={setHovered} />
            <Avatar robot color={agent.color} position={[agent.position[0], 0, agent.position[2] + 0.75]} phase={k * 1.7} />
          </group>
        )
      })}
      <Label position={[-9, 0.4, 5.9]} palette={palette} title="Agents IA" subtitle="Claude & Codex via MCP" muted />
    </group>
  )
}

function MeetingRoom({ meeting, palette, selected, hovered, onSelect, setHovered }) {
  const [w, d] = meeting.size
  const [x, , z] = meeting.position
  const chairs = [-1.6, -0.55, 0.55, 1.6]
  return (
    <group position={[x, 0, z]} onClick={e => { e.stopPropagation(); onSelect('meeting') }} {...hoverHandlers('meeting', setHovered)}>
      <RoundedBox args={[w, 0.05, d]} radius={0.02} position-y={0.025} receiveShadow>
        <meshStandardMaterial color={mix('#5BA8E0', palette.floor, palette.rugMix)} roughness={1} />
      </RoundedBox>
      {/* Parois vitrées sur trois côtés, entrée côté caméra */}
      {[[0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].map(([px, pz, len, rot]) => (
        <group key={`${px}${pz}`} position={[px, 0, pz]} rotation-y={rot}>
          <mesh position-y={1.1}>
            <boxGeometry args={[len, 2.2, 0.04]} />
            <meshPhysicalMaterial color={palette.glass} transparent opacity={0.2} roughness={0.05} />
          </mesh>
          <mesh position-y={2.22}><boxGeometry args={[len, 0.05, 0.08]} /><meshStandardMaterial color="#5BA8E0" roughness={0.4} /></mesh>
        </group>
      ))}
      {/* Écran de visio au fond */}
      <group position={[0, 1.45, -d / 2 + 0.08]}>
        <RoundedBox args={[2.2, 1.2, 0.06]} radius={0.03}><meshStandardMaterial color={palette.bezel} /></RoundedBox>
        <mesh position-z={0.035}><planeGeometry args={[2.06, 1.06]} /><meshStandardMaterial color="#5BA8E0" emissive="#3d8fd0" emissiveIntensity={0.9} toneMapped={false} /></mesh>
      </group>
      <RoundedBox args={[4.2, 0.09, 1.6]} radius={0.06} position-y={0.76} castShadow receiveShadow><meshStandardMaterial color={palette.wood} roughness={0.5} /></RoundedBox>
      <mesh position-y={0.37}><cylinderGeometry args={[0.12, 0.25, 0.74, 20]} /><meshStandardMaterial color={palette.leg} metalness={0.5} roughness={0.35} /></mesh>
      {chairs.map(cx => (
        <group key={cx}>
          <group position={[cx, 0, 0.35]}><Chair palette={palette} /></group>
          <group position={[cx, 0, -0.35]} rotation-y={Math.PI}><Chair palette={palette} /></group>
        </group>
      ))}
      {(selected || hovered) && <SelectionRing color="#5BA8E0" radius={2.7} />}
      <Label position={[0, 2.75, -d / 2]} palette={palette} title="Salle prestataires" subtitle="Demandes & réunions" accent="#5BA8E0" strong />
    </group>
  )
}

// Murs en coupe (fond + gauche) avec grandes baies : ciel de jour ou de nuit selon l'heure.
function Walls({ palette, width, minZ, maxZ, night, winter }) {
  const H = 3.4
  const depth = maxZ - minZ
  const sky = winter ? (night ? '#24365f' : '#dfe9ff') : night ? palette.skyNight : palette.sky
  const panes = Math.max(4, Math.round(width / 3.4))
  const paneW = width / panes
  const sidePanes = Math.max(3, Math.round(depth / 3.4))
  const sidePaneW = depth / sidePanes
  const pane = (key, pos, rotY, w) => (
    <group key={key} position={pos} rotation-y={rotY}>
      <mesh><planeGeometry args={[w - 0.3, 2.3]} /><meshStandardMaterial color={sky} emissive={sky} emissiveIntensity={night ? 0.5 : 0.7} toneMapped={false} /></mesh>
      <mesh position-z={0.01}><planeGeometry args={[0.05, 2.3]} /><meshStandardMaterial color={palette.wallTrim} /></mesh>
    </group>
  )
  return (
    <group>
      {/* Fond */}
      <mesh position={[0, H / 2, minZ - 0.1]} castShadow receiveShadow><boxGeometry args={[width + 0.2, H, 0.2]} /><meshStandardMaterial color={palette.wall} roughness={0.9} /></mesh>
      {Array.from({ length: panes }, (_, i) => pane(`b${i}`, [-width / 2 + paneW * (i + 0.5), 1.85, minZ + 0.01], 0, paneW))}
      {/* Gauche */}
      <mesh position={[-width / 2 - 0.1, H / 2, minZ + depth / 2]} castShadow receiveShadow><boxGeometry args={[0.2, H, depth + 0.4]} /><meshStandardMaterial color={palette.wall} roughness={0.9} /></mesh>
      {Array.from({ length: sidePanes }, (_, i) => pane(`l${i}`, [-width / 2 + 0.01, 1.85, minZ + sidePaneW * (i + 0.5)], Math.PI / 2, sidePaneW))}
      {/* Chapeau de mur (épaisseur de coupe) */}
      <mesh position={[0, H + 0.03, minZ - 0.1]}><boxGeometry args={[width + 0.4, 0.06, 0.24]} /><meshStandardMaterial color={palette.wallTrim} /></mesh>
      <mesh position={[-width / 2 - 0.1, H + 0.03, minZ + depth / 2]}><boxGeometry args={[0.24, 0.06, depth + 0.6]} /><meshStandardMaterial color={palette.wallTrim} /></mesh>
      {/* Plinthes */}
      <mesh position={[0, 0.06, minZ + 0.02]}><boxGeometry args={[width, 0.12, 0.04]} /><meshStandardMaterial color={palette.wallTrim} /></mesh>
    </group>
  )
}

// Sol carrelé généré à la volée (texture canvas), pour remplacer la grille de debug.
function useFloorTexture(palette, w, d) {
  return useMemo(() => {
    const size = 256
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = palette.floor
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = palette.grout
    ctx.lineWidth = 3
    ctx.strokeRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(w / 2, d / 2)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [palette.floor, palette.grout, w, d])
}

function FloorLamp({ palette, position, on }) {
  return (
    <group position={position}>
      <mesh position-y={0.8}><cylinderGeometry args={[0.03, 0.03, 1.6, 8]} /><meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position-y={0.02}><cylinderGeometry args={[0.18, 0.2, 0.04, 16]} /><meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position-y={1.65}><coneGeometry args={[0.24, 0.3, 20, 1, true]} /><meshStandardMaterial color={palette.lamp} emissive={palette.lamp} emissiveIntensity={on ? 2 : 0.1} toneMapped={!on} side={THREE.DoubleSide} /></mesh>
      {on && <pointLight position-y={1.5} color={palette.lamp} intensity={3} distance={6} />}
    </group>
  )
}

function Lounge({ palette, position }) {
  return (
    <group position={position}>
      <RoundedBox args={[3.4, 0.04, 2.2]} radius={0.02} position-y={0.02} receiveShadow><meshStandardMaterial color={mix('#3B6FF0', palette.floor, 0.7)} roughness={1} /></RoundedBox>
      <RoundedBox args={[2.4, 0.4, 0.8]} radius={0.15} position={[0, 0.3, -0.6]} castShadow><meshStandardMaterial color="#1f4fd1" roughness={0.8} /></RoundedBox>
      <RoundedBox args={[2.4, 0.6, 0.25]} radius={0.12} position={[0, 0.6, -0.95]} castShadow><meshStandardMaterial color="#1a43b3" roughness={0.8} /></RoundedBox>
      {[-0.7, 0.7].map(x => <RoundedBox key={x} args={[0.5, 0.18, 0.12]} radius={0.06} position={[x, 0.62, -0.75]} rotation-x={-0.3}><meshStandardMaterial color="#FFD66B" roughness={0.9} /></RoundedBox>)}
      <mesh position={[0, 0.25, 0.35]}><cylinderGeometry args={[0.45, 0.45, 0.06, 32]} /><meshStandardMaterial color={palette.wood} roughness={0.5} /></mesh>
      <mesh position={[0, 0.12, 0.35]}><cylinderGeometry args={[0.05, 0.05, 0.24, 8]} /><meshStandardMaterial color={palette.leg} /></mesh>
    </group>
  )
}

function CoffeeCorner({ palette, position }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.6, 0.9, 0.6]} radius={0.05} position-y={0.45} castShadow><meshStandardMaterial color={palette.desk} roughness={0.4} /></RoundedBox>
      <RoundedBox args={[0.45, 0.55, 0.4]} radius={0.06} position={[-0.35, 1.18, 0]} castShadow><meshStandardMaterial color="#111827" metalness={0.4} roughness={0.3} /></RoundedBox>
      <mesh position={[-0.35, 1.25, 0.21]}><planeGeometry args={[0.2, 0.12]} /><meshStandardMaterial color="#3b6ff0" emissive="#3b6ff0" emissiveIntensity={1.5} toneMapped={false} /></mesh>
      {[0.25, 0.5].map(x => <mesh key={x} position={[x, 0.98, 0]}><cylinderGeometry args={[0.06, 0.05, 0.14, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      <RoundedBox args={[1.6, 2, 0.4]} radius={0.04} position={[0, 1, -0.6]} castShadow><meshStandardMaterial color={palette.wallTrim} /></RoundedBox>
      {[0.6, 1.2, 1.75].map((y, i) => [-0.45, 0, 0.45].map((x, j) => (
        <RoundedBox key={`${i}${j}`} args={[0.32, 0.36, 0.06]} radius={0.02} position={[x, y, -0.38]}><meshStandardMaterial color={['#3b6ff0', '#FFD66B', '#FF8FA3', '#22a06b', '#93b4ff'][(i * 3 + j) % 5]} /></RoundedBox>
      )))}
    </group>
  )
}

function Aquarium({ position }) {
  const fish = useRef([])
  useFrame(({ clock }) => {
    fish.current.forEach((m, k) => {
      if (!m) return
      const t = clock.elapsedTime * (0.5 + k * 0.15) + k * 2
      m.position.x = Math.sin(t) * 0.8
      m.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI
    })
  })
  return (
    <group position={position}>
      <RoundedBox args={[2.2, 0.7, 0.8]} radius={0.04} position-y={0.35} castShadow><meshStandardMaterial color="#111827" roughness={0.4} /></RoundedBox>
      <mesh position-y={1.2}><boxGeometry args={[2.1, 1, 0.7]} /><meshPhysicalMaterial color="#5BC0EB" transparent opacity={0.4} emissive="#2a8fd6" emissiveIntensity={0.5} roughness={0.05} /></mesh>
      {[[1.1, '#FF8C42'], [1.35, '#FFD166'], [1.0, '#EF476F']].map(([y, c], k) => (
        <mesh key={c} ref={el => { fish.current[k] = el }} position={[0, y, (k - 1) * 0.15]} scale={[1.6, 0.8, 0.6]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color={c} /></mesh>
      ))}
    </group>
  )
}

function Trophy({ position }) {
  return (
    <group position={position}>
      <mesh position-y={0.3}><cylinderGeometry args={[0.45, 0.55, 0.6, 24]} /><meshStandardMaterial color="#111827" roughness={0.4} /></mesh>
      <Float speed={2} floatIntensity={0.4} rotationIntensity={0.4}>
        <mesh position-y={1.0}><cylinderGeometry args={[0.38, 0.12, 0.7, 24]} /><meshStandardMaterial color="#FFC83D" metalness={0.9} roughness={0.2} emissive="#FFB000" emissiveIntensity={0.3} /></mesh>
      </Float>
      <pointLight position-y={1.6} color="#FFD66B" intensity={2} distance={4} />
    </group>
  )
}

function Neon({ position, text = 'COCKPIT' }) {
  return (
    <Html position={position} center transform distanceFactor={9} zIndexRange={LABEL_Z} style={{ pointerEvents: 'none' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, letterSpacing: '0.2em', color: '#e6f0ff', textShadow: '0 0 8px #3b6ff0, 0 0 22px #3b6ff0, 0 0 42px #5b87ff', fontSize: 64 }}>{text}</div>
    </Html>
  )
}

// Winter Arc : neige qui tombe derrière les baies et congères sur les rebords.
function WinterOutside({ width, minZ }) {
  const ref = useRef()
  const positions = useMemo(() => {
    // Pseudo-aléatoire déterministe : la neige garde la même répartition à chaque rendu.
    let seed = 42
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const arr = new Float32Array(1200 * 3)
    for (let i = 0; i < 1200; i++) {
      arr[i * 3] = (rand() - 0.5) * (width + 10)
      arr[i * 3 + 1] = rand() * 7
      arr[i * 3 + 2] = minZ - 0.6 - rand() * 7
    }
    return arr
  }, [width, minZ])
  useFrame((_, delta) => {
    const geo = ref.current?.geometry
    if (!geo) return
    const a = geo.attributes.position.array
    for (let i = 1; i < a.length; i += 3) {
      a[i] -= delta * 0.6
      if (a[i] < 0) a[i] = 7
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <group>
      <points ref={ref}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.09} sizeAttenuation transparent opacity={0.9} />
      </points>
      <RoundedBox args={[width, 0.14, 0.35]} radius={0.06} position={[0, 0.72, minZ + 0.18]}><meshStandardMaterial color="#ffffff" roughness={0.9} /></RoundedBox>
    </group>
  )
}

// Le décor se débloque avec le niveau global (voir DECOR_UNLOCKS dans lib/openspace.js).
function LivingDecor({ palette, bounds, level, night }) {
  const left = -bounds.w / 2 + 2
  const right = bounds.w / 2 - 2
  const front = bounds.maxZ - 1.2
  const back = bounds.minZ + 1.5
  return (
    <group>
      {level >= 2 && [[left, front], [right, front], [left, back], [right, back]].map(([x, z], k) => <Plant key={`${x}${z}`} palette={palette} position={[x, 0, z]} variant={k} />)}
      {level >= 3 && [[left + 1.6, front], [right - 1.6, front]].map(([x, z]) => <FloorLamp key={x} palette={palette} position={[x, 0, z]} on={night} />)}
      {level >= 4 && <Lounge palette={palette} position={[-4.2, 0, front - 0.4]} />}
      {level >= 6 && <CoffeeCorner palette={palette} position={[4.4, 0, front - 0.2]} />}
      {level >= 8 && <Aquarium position={[left + 0.4, 0, (bounds.minZ + bounds.maxZ) / 2]} />}
      {level >= 10 && <>
        <Trophy position={[0, 0, front + 0.2]} />
        <Neon position={[0, 3.9, bounds.minZ - 0.35]} />
      </>}
    </group>
  )
}

export default function OfficeScene({ layout, theme, inboxCount, mailCount = 0, game, avatar, selectedId, onSelect, panelOpen = false, winter = false }) {
  const [hoveredId, setHovered] = useState(null)
  // Les <Html> de drei montés avant la création du canvas n'ont pas de conteneur et disparaissent :
  // on attend onCreated pour monter les postes et leurs étiquettes.
  const [ready, setReady] = useState(false)
  const palette = PALETTES[theme] || PALETTES.light
  const { bounds } = layout
  const depth = bounds.maxZ - bounds.minZ
  const centerZ = (bounds.maxZ + bounds.minZ) / 2
  const reach = Math.max(bounds.w, depth)
  const common = { palette, onSelect, setHovered }
  // Panneau latéral ouvert : on vise un peu à droite pour que l'étage reste dans la partie visible.
  const shiftX = panelOpen ? reach * 0.18 : 0
  // Éclairage qui suit l'heure : le soir, lumière tamisée et lampes allumées.
  const [hour] = useState(() => new Date().getHours())
  const night = theme === 'dark' || hour >= 19 || hour < 7
  const floorW = bounds.w + 5.6
  const floorD = depth + 4.6
  const wallMinZ = bounds.minZ - 2.3
  const floorTex = useFloorTexture(palette, floorW, floorD)
  const background = winter
    ? 'radial-gradient(120% 90% at 50% 0%, #22335e 0%, #0d1530 55%, #050812 100%)'
    : palette.bg

  return (
    <div className="absolute inset-0" style={{ background }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [shiftX, reach * 0.78, centerZ + reach * 0.86], fov: 34 }}
        onPointerMissed={() => onSelect(null)}
        onCreated={() => setReady(true)}
      >
        {/* Éclairage d'environnement procédural : reflets doux sur les matériaux */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={night ? 0.8 : 2} position={[0, 6, -6]} scale={[20, 4, 1]} color={night ? '#9fb6ff' : '#ffffff'} />
          <Lightformer intensity={night ? 0.5 : 1.2} position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} color={night ? '#6d84d8' : '#dfe8ff'} />
          <Lightformer intensity={night ? 0.4 : 1} position={[8, 3, 4]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} color={night ? '#ffb27a' : '#fff1de'} />
        </Environment>
        <hemisphereLight args={[night ? '#b9c8ff' : '#ffffff', night ? '#1a2234' : '#e9e3d8', night ? 0.45 : 0.7]} />
        <directionalLight
          position={[-10, 20, 12]} intensity={night ? 0.9 : 2.2} color={night ? '#c8d6ff' : '#fff6ea'} castShadow
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
          shadow-camera-left={-reach} shadow-camera-right={reach}
          shadow-camera-top={reach} shadow-camera-bottom={-reach} shadow-camera-far={80}
        />
        {/* Lumière froide qui entre par les baies */}
        <directionalLight position={[0, 6, wallMinZ - 6]} intensity={night ? 0.25 : 0.6} color={winter ? '#dfe9ff' : '#cfe0ff'} />

        {/* Plateau de la maquette : dalle épaisse + tranche plus sombre */}
        <RoundedBox args={[floorW + 0.6, 0.9, floorD + 0.6]} radius={0.25} position={[0, -0.45, centerZ]} receiveShadow>
          <meshStandardMaterial color={palette.slabSide} roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[floorW + 0.4, 0.2, floorD + 0.4]} radius={0.12} position={[0, -0.08, centerZ]} receiveShadow>
          <meshStandardMaterial color={palette.slab} roughness={0.7} />
        </RoundedBox>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.021, centerZ]} receiveShadow>
          <planeGeometry args={[floorW, floorD]} />
          <meshStandardMaterial map={floorTex} roughness={0.55} metalness={0.02} envMapIntensity={0.6} />
        </mesh>
        <Walls palette={palette} width={floorW} minZ={wallMinZ} maxZ={bounds.maxZ + 2.3} night={night} winter={winter} />
        {winter && <WinterOutside width={floorW} minZ={wallMinZ} />}
        <ContactShadows position={[0, 0.03, centerZ]} scale={reach * 1.6} opacity={night ? 0.5 : 0.32} blur={2.2} far={3} frames={1} resolution={1024} />
        <Sparkles count={70} scale={[floorW * 0.9, 3.5, floorD * 0.9]} position={[0, 1.8, centerZ]} size={2.2} speed={0.25} opacity={night ? 0.55 : 0.35} color={winter ? '#ffffff' : palette.dust} />

        {ready && (
          <>
            {layout.zones.map(zone => (
              <PoleZone key={zone.id} zone={zone} poleLevel={game.poles[zone.pole.id]?.level || 1} selectedId={selectedId} hoveredId={hoveredId} {...common} />
            ))}
            <LivingDecor palette={palette} bounds={bounds} level={game.level} night={night} />
            <Hub inboxCount={inboxCount} mailCount={mailCount} game={game} avatar={avatar} selected={selectedId === 'hub'} hovered={hoveredId === 'hub'} {...common} />
            <AgentsCorner agents={layout.commons.agents} selectedId={selectedId} hoveredId={hoveredId} {...common} />
            <MeetingRoom meeting={layout.commons.meeting} selected={selectedId === 'meeting'} hovered={hoveredId === 'meeting'} {...common} />
          </>
        )}

        <OrbitControls
          makeDefault
          target={[shiftX, 0, centerZ]}
          minDistance={8}
          maxDistance={reach * 2.6}
          maxPolarAngle={Math.PI / 2.3}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  )
}
