import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, RoundedBox, ContactShadows } from '@react-three/drei'

const PALETTES = {
  light: { floor: '#E2E6EE', desk: '#FFFFFF', leg: '#98A0B0', chair: '#1E2A44', screenOff: '#111A2E', wall: '#D2D8E4', glass: '#BCD0FF', board: '#FFFFFF', track: '#E2E7F0', bg: '#ECEFF4', plant: '#2F8F5B', plantDark: '#1A6B44', pot: '#C9B9A3' },
  dark:  { floor: '#1E2638', desk: '#344058', leg: '#66718A', chair: '#0E1424', screenOff: '#070B16', wall: '#2A3448', glass: '#3B5FB8', board: '#2A3448', track: '#3E4A63', bg: '#0A0E17', plant: '#3FA36F', plantDark: '#2F8F5B', pot: '#7A6A58' },
}

// Les étiquettes HTML restent sous les dialogues de l'app (palette ⌘K, modales).
const LABEL_Z = [20, 0]

function Label({ position, title, subtitle, accent, strong }) {
  return (
    <Html position={position} center distanceFactor={16} zIndexRange={LABEL_Z} style={{ pointerEvents: 'none' }}>
      <div
        className="whitespace-nowrap rounded-full border px-2.5 py-1 text-center shadow-sm"
        style={{ background: 'var(--bg-surface)', borderColor: accent || 'var(--border-soft)', color: 'var(--text-primary)' }}
      >
        <div className={strong ? 'text-[13px] font-semibold' : 'text-[11px] font-medium'}>{title}</div>
        {subtitle && <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</div>}
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

function SelectionRing({ color, radius = 1.35 }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
      <ringGeometry args={[radius, radius + 0.12, 48]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function Chair({ palette, z = 0.75 }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position-y={0.45} castShadow><boxGeometry args={[0.55, 0.08, 0.55]} /><meshStandardMaterial color={palette.chair} /></mesh>
      <mesh position={[0, 0.78, 0.25]} castShadow><boxGeometry args={[0.55, 0.6, 0.07]} /><meshStandardMaterial color={palette.chair} /></mesh>
      <mesh position-y={0.22}><cylinderGeometry args={[0.04, 0.04, 0.44]} /><meshStandardMaterial color={palette.leg} /></mesh>
    </group>
  )
}

function Desk({ desk, palette, selected, hovered, onSelect, setHovered }) {
  const lift = hovered ? 0.06 : 0
  const screen = desk.busy ? desk.color : palette.screenOff
  return (
    <group position={desk.position} onClick={e => { e.stopPropagation(); onSelect(desk.id) }} {...hoverHandlers(desk.id, setHovered)}>
      <group position-y={lift}>
        <RoundedBox args={[1.9, 0.08, 1.0]} radius={0.03} position-y={0.76} castShadow receiveShadow>
          <meshStandardMaterial color={palette.desk} />
        </RoundedBox>
        {[[-0.85, -0.42], [0.85, -0.42], [-0.85, 0.42], [0.85, 0.42]].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.37, z]} castShadow><boxGeometry args={[0.05, 0.74, 0.05]} /><meshStandardMaterial color={palette.leg} /></mesh>
        ))}
        {/* Écran : allumé à la couleur du poste quand il y a du travail en cours */}
        <mesh position={[0, 1.17, -0.3]} castShadow><boxGeometry args={[0.95, 0.58, 0.05]} /><meshStandardMaterial color={palette.screenOff} /></mesh>
        <mesh position={[0, 1.17, -0.27]}>
          <planeGeometry args={[0.86, 0.5]} />
          <meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={desk.busy ? 0.6 : 0.05} />
        </mesh>
        <mesh position={[0, 0.85, -0.3]}><boxGeometry args={[0.06, 0.12, 0.06]} /><meshStandardMaterial color={palette.leg} /></mesh>
        {/* Pastille de couleur du poste */}
        <mesh position={[0.72, 0.82, 0.3]}><cylinderGeometry args={[0.1, 0.1, 0.04, 24]} /><meshStandardMaterial color={desk.color} /></mesh>
      </group>
      <Chair palette={palette} />
      {desk.overdue && (
        <mesh position={[0.55, 1.62 + lift, -0.3]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial color="#E5484D" emissive="#E5484D" emissiveIntensity={0.8} />
        </mesh>
      )}
      {(selected || hovered) && <SelectionRing color={desk.color} />}
      <Label position={[0, 1.95, -0.3]} title={desk.label} subtitle={desk.sublabel} accent={selected ? desk.color : undefined} />
    </group>
  )
}

function NorthStarBoard({ zone, palette }) {
  const progress = Math.max(0, Math.min(100, zone.pole.northStarProgress || 0)) / 100
  const width = 3.2
  return (
    <group position={zone.boardPosition}>
      <RoundedBox args={[3.8, 1.5, 0.12]} radius={0.05} position-y={1.25} castShadow>
        <meshStandardMaterial color={palette.board} />
      </RoundedBox>
      <mesh position={[0, 0.95, 0.07]}><boxGeometry args={[width, 0.16, 0.02]} /><meshStandardMaterial color={palette.track} /></mesh>
      {progress > 0 && (
        <mesh position={[-width / 2 + (width * progress) / 2, 0.95, 0.085]}>
          <boxGeometry args={[width * progress, 0.16, 0.02]} />
          <meshStandardMaterial color={zone.pole.color} emissive={zone.pole.color} emissiveIntensity={0.25} />
        </mesh>
      )}
      {[-1.6, 1.6].map(x => (
        <mesh key={x} position={[x, 0.25, 0]}><boxGeometry args={[0.06, 0.5, 0.06]} /><meshStandardMaterial color={palette.leg} /></mesh>
      ))}
    </group>
  )
}

function Plant({ palette, position, small }) {
  const s = small ? 0.75 : 1
  return (
    <group position={position} scale={s}>
      <mesh position-y={0.22} castShadow><cylinderGeometry args={[0.2, 0.15, 0.44, 16]} /><meshStandardMaterial color={palette.pot} /></mesh>
      <mesh position-y={0.72} castShadow><sphereGeometry args={[0.34, 16, 16]} /><meshStandardMaterial color={palette.plant} /></mesh>
      <mesh position={[0.14, 0.98, 0.05]} castShadow><sphereGeometry args={[0.22, 16, 16]} /><meshStandardMaterial color={palette.plantDark} /></mesh>
    </group>
  )
}

// Boîte aux lettres du bureau : le drapeau se lève quand des mails importants attendent.
function Mailbox({ count, position }) {
  return (
    <group position={position}>
      <mesh position-y={0.45}><cylinderGeometry args={[0.04, 0.04, 0.9, 8]} /><meshStandardMaterial color="#6B6B75" /></mesh>
      <RoundedBox args={[0.5, 0.36, 0.7]} radius={0.12} position-y={1.0} castShadow><meshStandardMaterial color="#1F4FD1" /></RoundedBox>
      <mesh position={[0.27, count ? 1.25 : 1.05, -0.1]} rotation-z={count ? 0 : -Math.PI / 2}>
        <boxGeometry args={[0.04, 0.3, 0.14]} /><meshStandardMaterial color={count ? '#E5484D' : '#9AA39C'} />
      </mesh>
      {count > 0 && <Label position={[0, 1.65, 0]} title={`📬 ${count} mail${count > 1 ? 's' : ''}`} accent="#E5484D" />}
    </group>
  )
}

function PoleZone({ zone, poleLevel, palette, selectedId, hoveredId, onSelect, setHovered }) {
  const [cx, cz] = zone.center
  const [w, d] = zone.size
  const active = selectedId === zone.id || hoveredId === zone.id
  return (
    <group>
      <RoundedBox
        args={[w, 0.06, d]} radius={0.03} position={[cx, 0.03, cz]} receiveShadow
        onClick={e => { e.stopPropagation(); onSelect(zone.id) }} {...hoverHandlers(zone.id, setHovered)}
      >
        <meshStandardMaterial color={zone.pole.color} transparent opacity={active ? 0.6 : 0.34} />
      </RoundedBox>
      <Plant palette={palette} position={[cx - w / 2 + 0.5, 0, cz - d / 2 + 0.5]} />
      <Plant palette={palette} position={[cx + w / 2 - 0.5, 0, cz - d / 2 + 0.5]} small />
      <NorthStarBoard zone={zone} palette={palette} />
      <Label
        position={[cx, 2.5, zone.boardPosition[2]]}
        title={`${zone.pole.emoji || ''} ${zone.pole.name} · Niv. ${poleLevel}`.trim()}
        subtitle={zone.pole.northStar ? `${zone.pole.northStar} · ${zone.pole.northStarProgress || 0}%` : undefined}
        accent={zone.pole.color} strong
      />
      {zone.desks.map(desk => (
        <Desk
          key={desk.id} desk={desk} palette={palette}
          selected={selectedId === desk.id} hovered={hoveredId === desk.id}
          onSelect={onSelect} setHovered={setHovered}
        />
      ))}
      {zone.desks.length === 0 && (
        <Label position={[cx, 0.6, cz + 0.6]} title={zone.isClientsPole ? 'Aucun client actif' : 'Aucune tâche ouverte'} />
      )}
    </group>
  )
}

function Avatar({ color, position, robot }) {
  return (
    <group position={position}>
      {robot ? (
        <>
          <RoundedBox args={[0.5, 0.6, 0.35]} radius={0.08} position-y={0.75} castShadow><meshStandardMaterial color={color} /></RoundedBox>
          <RoundedBox args={[0.42, 0.34, 0.34]} radius={0.08} position-y={1.28} castShadow><meshStandardMaterial color="#DADAE0" /></RoundedBox>
          {[-0.09, 0.09].map(x => (
            <mesh key={x} position={[x, 1.3, 0.175]}><sphereGeometry args={[0.04, 12, 12]} /><meshStandardMaterial color="#9A9AA5" /></mesh>
          ))}
        </>
      ) : (
        <>
          <mesh position-y={0.7} castShadow><capsuleGeometry args={[0.24, 0.6, 8, 16]} /><meshStandardMaterial color={color} /></mesh>
          <mesh position-y={1.38} castShadow><sphereGeometry args={[0.2, 24, 24]} /><meshStandardMaterial color="#E8C4A0" /></mesh>
        </>
      )}
    </group>
  )
}

// Flamme de la série de jours : plus la série est longue, plus elle est haute.
function StreakFlame({ streak, position }) {
  if (!streak) return null
  const scale = 0.6 + Math.min(streak, 14) * 0.06
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.12}><cylinderGeometry args={[0.22, 0.28, 0.24, 16]} /><meshStandardMaterial color="#6B6B75" /></mesh>
      <mesh position-y={0.55}><coneGeometry args={[0.2, 0.6, 16]} /><meshStandardMaterial color="#FF7A45" emissive="#FF7A45" emissiveIntensity={0.9} /></mesh>
      <mesh position-y={0.45}><coneGeometry args={[0.11, 0.36, 16]} /><meshStandardMaterial color="#FFD66B" emissive="#FFD66B" emissiveIntensity={1} /></mesh>
      <pointLight position-y={0.6} color="#FF9A5C" intensity={1.5} distance={3} />
    </group>
  )
}

function Hub({ palette, inboxCount, mailCount, game, selected, hovered, onSelect, setHovered }) {
  const crates = Math.min(inboxCount, 8)
  return (
    <group position={[0, 0, 3.5]} onClick={e => { e.stopPropagation(); onSelect('hub') }} {...hoverHandlers('hub', setHovered)}>
      <RoundedBox args={[3, 0.1, 1.3]} radius={0.04} position-y={0.76} castShadow receiveShadow><meshStandardMaterial color={palette.desk} /></RoundedBox>
      <mesh position-y={0.37}><boxGeometry args={[2.6, 0.74, 0.9]} /><meshStandardMaterial color={palette.wall} /></mesh>
      {[-0.65, 0.65].map(x => (
        <group key={x}>
          <mesh position={[x, 1.2, -0.4]} castShadow><boxGeometry args={[1.1, 0.62, 0.05]} /><meshStandardMaterial color={palette.screenOff} /></mesh>
          <mesh position={[x, 1.2, -0.37]}><planeGeometry args={[1.0, 0.54]} /><meshStandardMaterial color="#3B6FF0" emissive="#3B6FF0" emissiveIntensity={0.5} /></mesh>
        </group>
      ))}
      <Avatar color="#3B6FF0" position={[0, 0, 1.1]} />
      {/* Caisses = éléments de l'Inbox à trier */}
      {Array.from({ length: crates }, (_, k) => (
        <mesh key={k} position={[2.2 + (k % 2) * 0.5, 0.2 + Math.floor(k / 2) * 0.4, 0.2]} castShadow>
          <boxGeometry args={[0.42, 0.38, 0.42]} /><meshStandardMaterial color="#D9A86C" />
        </mesh>
      ))}
      {(selected || hovered) && <SelectionRing color="#3B6FF0" radius={2} />}
      <StreakFlame streak={game.streak.current} position={[-2, 0, 0.3]} />
      <Mailbox count={mailCount} position={[2.3, 0, -0.9]} />
      <Plant palette={palette} position={[-2.2, 0, -0.9]} />
      <Label
        position={[0, 2.2, 0]}
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
      <mesh rotation-x={-Math.PI / 2} position={[-9, 0.004, 4]} receiveShadow>
        <planeGeometry args={[6.5, 4]} />
        <meshStandardMaterial color="#BCD0FF" transparent opacity={0.45} />
      </mesh>
      {agents.desks.map(agent => {
        const id = `agent:${agent.id}`
        const desk = { id, position: agent.position, color: agent.color, busy: false, label: agent.name, sublabel: 'Hors ligne' }
        return (
          <group key={id}>
            <Desk desk={desk} palette={palette} selected={selectedId === id} hovered={hoveredId === id} onSelect={onSelect} setHovered={setHovered} />
            <Avatar robot color={agent.color} position={[agent.position[0], 0, agent.position[2] + 0.75]} />
          </group>
        )
      })}
      <Label position={[-9, 0.4, 5.8]} title="Agents IA" subtitle="Claude & Codex via MCP" />
    </group>
  )
}

function MeetingRoom({ meeting, palette, selected, hovered, onSelect, setHovered }) {
  const [w, d] = meeting.size
  const [x, , z] = meeting.position
  const chairs = [-1.6, -0.55, 0.55, 1.6]
  return (
    <group position={[x, 0, z]} onClick={e => { e.stopPropagation(); onSelect('meeting') }} {...hoverHandlers('meeting', setHovered)}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.004} receiveShadow>
        <planeGeometry args={[w, d]} /><meshStandardMaterial color={palette.wall} />
      </mesh>
      {/* Parois vitrées sur trois côtés, entrée côté caméra */}
      {[[0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].map(([px, pz, len, rot]) => (
        <mesh key={`${px}${pz}`} position={[px, 1.1, pz]} rotation-y={rot}>
          <boxGeometry args={[len, 2.2, 0.05]} />
          <meshStandardMaterial color={palette.glass} transparent opacity={0.28} />
        </mesh>
      ))}
      <RoundedBox args={[4.2, 0.1, 1.6]} radius={0.05} position-y={0.76} castShadow receiveShadow><meshStandardMaterial color={palette.desk} /></RoundedBox>
      <mesh position-y={0.37}><cylinderGeometry args={[0.12, 0.2, 0.74, 16]} /><meshStandardMaterial color={palette.leg} /></mesh>
      {chairs.map(cx => (
        <group key={cx}>
          <group position={[cx, 0, 0.35]}><Chair palette={palette} /></group>
          <group position={[cx, 0, -0.35]} rotation-y={Math.PI}><Chair palette={palette} /></group>
        </group>
      ))}
      {(selected || hovered) && <SelectionRing color="#5BA8E0" radius={2.6} />}
      <Label position={[0, 2.6, -d / 2]} title="Salle prestataires" subtitle="Demandes & réunions" accent="#5BA8E0" strong />
    </group>
  )
}

export default function OfficeScene({ layout, theme, inboxCount, mailCount = 0, game, selectedId, onSelect }) {
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

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, reach * 0.68, centerZ + reach * 0.78], fov: 38 }}
      onPointerMissed={() => onSelect(null)}
      onCreated={() => setReady(true)}
    >
      <color attach="background" args={[palette.bg]} />
      <hemisphereLight args={['#ffffff', palette.floor, theme === 'dark' ? 1.1 : 0.9]} />
      <directionalLight
        position={[12, 22, 10]} intensity={theme === 'dark' ? 1.9 : 1.6} castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-reach} shadow-camera-right={reach}
        shadow-camera-top={reach} shadow-camera-bottom={-reach}
      />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[bounds.w + 8, depth + 8]} />
        <meshStandardMaterial color={palette.floor} />
      </mesh>
      <ContactShadows position={[0, 0.01, centerZ]} scale={reach * 1.6} opacity={0.25} blur={2.5} far={4} frames={1} />

      {ready && (
        <>
          {layout.zones.map(zone => (
            <PoleZone key={zone.id} zone={zone} poleLevel={game.poles[zone.pole.id]?.level || 1} selectedId={selectedId} hoveredId={hoveredId} {...common} />
          ))}
          <Hub inboxCount={inboxCount} mailCount={mailCount} game={game} selected={selectedId === 'hub'} hovered={hoveredId === 'hub'} {...common} />
          <AgentsCorner agents={layout.commons.agents} selectedId={selectedId} hoveredId={hoveredId} {...common} />
          <MeetingRoom meeting={layout.commons.meeting} selected={selectedId === 'meeting'} hovered={hoveredId === 'meeting'} {...common} />
        </>
      )}

      <OrbitControls
        makeDefault
        target={[0, 0, centerZ]}
        minDistance={8}
        maxDistance={reach * 2.6}
        maxPolarAngle={Math.PI / 2.3}
        enableDamping={false}
      />
    </Canvas>
  )
}
