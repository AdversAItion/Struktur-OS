import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group, Points } from 'three'

/**
 * 3D-Showpiece: ein gold-schwarzes, langsam rotierendes Netzwerk (Icosaeder) —
 * Metapher für die wachsende Vertriebs-Struktur. Bewusst unlit
 * (`meshBasicMaterial`, keine Lichter) für Robustheit und Mobile-Performance.
 *
 * `bewegung` schaltet die Rotation ab (prefers-reduced-motion, vom Aufrufer).
 */

// Die 12 Ecken eines Icosaeders (goldener Schnitt), normiert auf Radius R.
function knotenPositionen(R: number): [number, number, number][] {
  const t = (1 + Math.sqrt(5)) / 2
  const roh: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ]
  return roh.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z)
    return [(x / l) * R, (y / l) * R, (z / l) * R]
  })
}

function Struktur({ bewegung }: { bewegung: boolean }) {
  const gruppe = useRef<Group>(null)
  const knoten = useMemo(() => knotenPositionen(1.6), [])

  useFrame((_, delta) => {
    if (!bewegung || !gruppe.current) return
    gruppe.current.rotation.y += delta * 0.18
    gruppe.current.rotation.x += delta * 0.05
  })

  return (
    <group ref={gruppe}>
      {/* Kanten = Verbindungen */}
      <mesh>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color="#D4AF37" wireframe />
      </mesh>
      {/* Knoten = Menschen in der Struktur */}
      {knoten.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshBasicMaterial color="#D4AF37" />
        </mesh>
      ))}
    </group>
  )
}

function Staub() {
  const punkte = useRef<Points>(null)
  const positionen = useMemo(() => {
    const n = 260
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // Punkte in einer Kugelschale für dezente Tiefe.
      const r = 3 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (punkte.current) punkte.current.rotation.y -= delta * 0.02
  })

  return (
    <points ref={punkte}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positionen, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#D4AF37" transparent opacity={0.45} sizeAttenuation />
    </points>
  )
}

export function Szene({ bewegung }: { bewegung: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.5]} // auf Mobile nicht die volle Retina-Auflösung — Performance
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <Staub />
      <Struktur bewegung={bewegung} />
    </Canvas>
  )
}
