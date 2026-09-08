import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Eye,
  GitCommit,
  Layers,
  Search,
  Filter,
  Route,
  Info,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { GraphNode, GraphLink, NodeCommunity } from '../types';
import { findConstrainedPath } from '../utils/graphAlgorithms';

interface GraphWorkstationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelectNode?: (node: GraphNode) => void;
}

type SizingDimension = 'BETWEENNESS' | 'DEGREE' | 'PAGERANK' | 'UNIFORM';
type RenderEngine = 'SVG_TACTICAL' | 'CANVAS_60FPS';

const COMMUNITY_COLORS: Record<NodeCommunity, { stroke: string; fill: string; text: string; bg: string }> = {
  'Core Command & Masterminds': {
    stroke: '#ef4444',
    fill: '#991b1b',
    text: '#fca5a5',
    bg: 'bg-red-950/60 border-red-800 text-red-300',
  },
  'Hawala Layering Cell': {
    stroke: '#f59e0b',
    fill: '#b45309',
    text: '#fcd34d',
    bg: 'bg-amber-950/60 border-amber-800 text-amber-300',
  },
  'Logistics & Procurement': {
    stroke: '#06b6d4',
    fill: '#0e7490',
    text: '#67e8f9',
    bg: 'bg-cyan-950/60 border-cyan-800 text-cyan-300',
  },
  'Ground Enforcement & Field': {
    stroke: '#a855f7',
    fill: '#7e22ce',
    text: '#d8b4fe',
    bg: 'bg-purple-950/60 border-purple-800 text-purple-300',
  },
};

export const GraphWorkstation: React.FC<GraphWorkstationProps> = ({ nodes: initialNodes, links: initialLinks, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Layout & Simulation State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [engine, setEngine] = useState<RenderEngine>('SVG_TACTICAL');
  const [sizingDimension, setSizingDimension] = useState<SizingDimension>('BETWEENNESS');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('NODE-SUSPECT-SAJID');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterCommunity, setFilterCommunity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Pathfinding State
  const [showPathfinding, setShowPathfinding] = useState(false);
  const [pathSource, setPathSource] = useState('NODE-SUSPECT-RIYAZ');
  const [pathTarget, setPathTarget] = useState('NODE-SUSPECT-ZAHID');
  const [pathMode, setPathMode] = useState<'UNCONSTRAINED' | 'HAWALA_FINANCIAL' | 'TELECOM_CDR'>('TELECOM_CDR');
  const [activePath, setActivePath] = useState<{ path: string[]; edges: GraphLink[]; totalCost: number } | null>(null);

  // Initialize nodes with organic force layout coordinates
  useEffect(() => {
    const width = 900;
    const height = 650;
    const centerX = width / 2;
    const centerY = height / 2;

    const positioned = initialNodes.map((n, i) => {
      // Group by community clusters
      let angleOffset = 0;
      if (n.community === 'Core Command & Masterminds') angleOffset = 0;
      else if (n.community === 'Logistics & Procurement') angleOffset = Math.PI / 2;
      else if (n.community === 'Hawala Layering Cell') angleOffset = Math.PI;
      else angleOffset = (3 * Math.PI) / 2;

      const angle = angleOffset + (i % 4) * 0.4 - 0.4;
      const radius = 140 + (i % 3) * 60;

      return {
        ...n,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    // Run simple force relaxation step
    for (let iter = 0; iter < 40; iter++) {
      // Repulsion between all node pairs
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const dx = positioned[j].x! - positioned[i].x!;
          const dy = positioned[j].y! - positioned[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.15;
            positioned[i].x! -= dx * force;
            positioned[i].y! -= dy * force;
            positioned[j].x! += dx * force;
            positioned[j].y! += dy * force;
          }
        }
      }

      // Spring attraction for links
      initialLinks.forEach(l => {
        const s = positioned.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as any).id));
        const t = positioned.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as any).id));
        if (s && t) {
          const dx = t.x! - s.x!;
          const dy = t.y! - s.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const springForce = (dist - 120) * 0.03;
          s.x! += (dx / dist) * springForce;
          s.y! += (dy / dist) * springForce;
          t.x! -= (dx / dist) * springForce;
          t.y! -= (dy / dist) * springForce;
        }
      });
    }

    setNodes(positioned);
    setLinks(initialLinks);
  }, [initialNodes, initialLinks]);

  // Compute node radius based on active sizing dimension
  const getNodeRadius = (node: GraphNode): number => {
    switch (sizingDimension) {
      case 'BETWEENNESS':
        // Brandes Betweenness: 0 to 1 -> radius 14 to 42
        return 14 + (node.betweenness || 0) * 38;
      case 'DEGREE':
        // Direct call volume
        return 14 + Math.min(node.degree * 4, 34);
      case 'PAGERANK':
        return 14 + (node.pageRank || 0) * 30;
      case 'UNIFORM':
      default:
        return 20;
    }
  };

  // Find 1-hop neighbors for neighborhood focus
  const activeFocusId = hoveredNodeId || selectedNodeId;
  const neighborSet = useMemo(() => {
    if (!activeFocusId) return null;
    const set = new Set<string>([activeFocusId]);
    links.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      if (s === activeFocusId) set.add(t);
      if (t === activeFocusId) set.add(s);
    });
    return set;
  }, [activeFocusId, links]);

  // Run Pathfinding when parameters change
  const handleCalculatePath = () => {
    if (!pathSource || !pathTarget) return;
    const result = findConstrainedPath(pathSource, pathTarget, nodes, links, pathMode);
    setActivePath(result);
  };

  // Drag & Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(0.4, prev * zoomFactor), 3.0));
  };

  // Draw on HTML5 Canvas when Canvas engine is selected
  useEffect(() => {
    if (engine !== 'CANVAS_60FPS' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw tactical grid
    ctx.strokeStyle = '#1e293b22';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = -500; x < canvas.width + 500; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -500);
      ctx.lineTo(x, canvas.height + 500);
      ctx.stroke();
    }
    for (let y = -500; y < canvas.height + 500; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-500, y);
      ctx.lineTo(canvas.width + 500, y);
      ctx.stroke();
    }

    // Draw Links
    links.forEach(l => {
      const s = nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as any).id));
      const t = nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as any).id));
      if (!s || !t) return;

      const isPathEdge = activePath?.edges.some(e => e.id === l.id);
      const isDimmed = neighborSet && (!neighborSet.has(s.id) || !neighborSet.has(t.id));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.lineWidth = isPathEdge ? 4 : 1.5;
      ctx.strokeStyle = isPathEdge ? '#38bdf8' : isDimmed ? '#33415518' : '#47556988';
      if (l.type === 'SHARED_IMEI') ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Nodes
    nodes.forEach(n => {
      const r = getNodeRadius(n);
      const isDimmed = neighborSet && !neighborSet.has(n.id);
      const isSelected = selectedNodeId === n.id;
      const palette = COMMUNITY_COLORS[n.community];

      ctx.save();
      ctx.globalAlpha = isDimmed ? 0.08 : 1.0;

      // Halo for Cut-Vertex / Kingpin
      if (n.isCutVertex || isSelected) {
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = n.isCutVertex ? '#ef4444aa' : '#38bdf8aa';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Main Circle
      ctx.beginPath();
      ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.label.slice(0, 20), n.x!, n.y! + r + 14);

      ctx.restore();
    });

    ctx.restore();
  }, [engine, nodes, links, pan, zoom, sizingDimension, neighborSet, selectedNodeId, activePath]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Filtered nodes
  const filteredNodes = nodes.filter(n => {
    if (filterCommunity !== 'ALL' && n.community !== filterCommunity) return false;
    if (searchTerm && !n.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-slate-950 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-125px)]'
      }`}
    >
      {/* Top Controls Bar */}
      <div className="z-20 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Engine & Centrality Dimension Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Engine Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setEngine('SVG_TACTICAL')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                engine === 'SVG_TACTICAL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vector sharp D3 SVG tactical engine with interactive hover halos"
            >
              HD SVG Engine
            </button>
            <button
              onClick={() => setEngine('CANVAS_60FPS')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                engine === 'CANVAS_60FPS'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="60 FPS HTML5 Canvas engine with LOD grid rendering"
            >
              60 FPS Canvas
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Sizing Dimension */}
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="text-slate-400 flex items-center space-x-1">
              <Sliders className="w-3 h-3 text-blue-400" />
              <span>Sizing Metric:</span>
            </span>
            <select
              value={sizingDimension}
              onChange={e => setSizingDimension(e.target.value as SizingDimension)}
              className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="BETWEENNESS">Brandes' Betweenness (Kingpins Enlarge)</option>
              <option value="DEGREE">Degree Centrality (High Call Volume)</option>
              <option value="PAGERANK">PageRank (Authority Score)</option>
              <option value="UNIFORM">Uniform Normal Sizing</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Constrained Pathfinding Toggle */}
          <button
            onClick={() => setShowPathfinding(!showPathfinding)}
            className={`px-2.5 py-1 rounded font-mono text-xs flex items-center space-x-1.5 border transition-all ${
              showPathfinding
                ? 'bg-blue-950 text-blue-300 border-blue-600'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-blue-400" />
            <span>Constrained Pathfinding</span>
          </button>
        </div>

        {/* Right: Search, Filter & Viewport Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search suspect, IMEI, plate..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <button
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.4))}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="Toggle Command Wall Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Canvas or SVG viewport */}
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {engine === 'CANVAS_60FPS' ? (
            <canvas
              ref={canvasRef}
              width={1400}
              height={900}
              className="w-full h-full block"
            />
          ) : (
            <svg className="w-full h-full overflow-hidden">
              <defs>
                {/* Background Grid */}
                <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b20" strokeWidth="1" />
                </pattern>
                {/* Arrow markers */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-path"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Grid Canvas */}
              <rect width="100%" height="100%" fill="url(#tactical-grid)" />

              {/* Pan & Zoom Group */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Links */}
                {links.map(l => {
                  const s = nodes.find(n => n.id === (typeof l.source === 'string' ? l.source : (l.source as any).id));
                  const t = nodes.find(n => n.id === (typeof l.target === 'string' ? l.target : (l.target as any).id));
                  if (!s || !t) return null;

                  const isPathEdge = activePath?.edges.some(e => e.id === l.id);
                  const isDimmed = neighborSet && (!neighborSet.has(s.id) || !neighborSet.has(t.id));

                  return (
                    <g key={l.id} opacity={isDimmed ? 0.08 : 1.0} className="transition-opacity duration-200">
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={isPathEdge ? '#38bdf8' : '#475569'}
                        strokeWidth={isPathEdge ? 4 : 1.5}
                        strokeDasharray={l.type === 'SHARED_IMEI' ? '4 4' : undefined}
                        markerEnd={isPathEdge ? 'url(#arrow-path)' : 'url(#arrow)'}
                      />
                      {/* Edge weight / detail label */}
                      <text
                        x={(s.x! + t.x!) / 2}
                        y={(s.y! + t.y!) / 2 - 4}
                        fill={isPathEdge ? '#7dd3fc' : '#94a3b8'}
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {l.amount ? `₹${l.amount.toLocaleString('en-IN')}` : l.type}
                      </text>
                    </g>
                  );
                })}

                {/* Nodes */}
                {nodes.map(n => {
                  const r = getNodeRadius(n);
                  const palette = COMMUNITY_COLORS[n.community];
                  const isDimmed = neighborSet && !neighborSet.has(n.id);
                  const isSelected = selectedNodeId === n.id;
                  const isCutVertex = n.isCutVertex;
                  const isKingpin = n.isKingpin;

                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      opacity={isDimmed ? 0.08 : 1.0}
                      className="cursor-pointer transition-opacity duration-200"
                      onClick={() => {
                        setSelectedNodeId(n.id);
                        if (onSelectNode) onSelectNode(n);
                      }}
                      onMouseEnter={() => setHoveredNodeId(n.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Cut-Vertex / Articulation Point Red Halo */}
                      {isCutVertex && (
                        <circle
                          r={r + 9}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                          className="animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                      )}

                      {/* Selection Ring */}
                      {isSelected && (
                        <circle
                          r={r + 6}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r={r}
                        fill={palette.fill}
                        stroke={palette.stroke}
                        strokeWidth={isKingpin ? 3 : 2}
                        className="transition-all"
                      />

                      {/* Type Icon / Monogram */}
                      <text
                        y="4"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {n.type === 'SUSPECT'
                          ? 'SUS'
                          : n.type === 'IMEI'
                          ? 'IMEI'
                          : n.type === 'PHONE'
                          ? 'SIM'
                          : n.type === 'VEHICLE'
                          ? 'VEH'
                          : n.type === 'FINANCIAL'
                          ? 'UPI'
                          : 'OBJ'}
                      </text>

                      {/* Node Label Below */}
                      <text
                        y={r + 14}
                        fill={isSelected ? '#38bdf8' : '#f8fafc'}
                        fontSize="10"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {n.label.length > 22 ? n.label.slice(0, 20) + '...' : n.label}
                      </text>

                      {/* Metric Tag badge */}
                      {sizingDimension === 'BETWEENNESS' && n.betweenness > 0.1 && (
                        <text
                          y={-r - 5}
                          fill="#f87171"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                        >
                          CB: {n.betweenness.toFixed(3)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[11px] font-mono space-y-2 max-w-xs pointer-events-auto">
          <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>Operational Factions (Louvain)</span>
            <span className="text-slate-500">4 CELLS</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(COMMUNITY_COLORS).map(([name, col]) => (
              <div key={name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.stroke }} />
                <span className="text-[10px] text-slate-300 truncate">{name}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full border border-red-500" />
              <span>Red Dashed: Cut-Vertex</span>
            </span>
            <span>Hover: 1-Hop Focus (8% Dim)</span>
          </div>
        </div>

        {/* Constrained Pathfinding Floating Card */}
        {showPathfinding && (
          <div className="absolute top-4 left-4 z-20 w-80 p-4 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-3 pointer-events-auto text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Route className="w-4 h-4 text-blue-400" />
                <span>Dijkstra Evidentiary Path</span>
              </span>
              <button
                onClick={() => setShowPathfinding(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase mb-1">Source Node</label>
              <select
                value={pathSource}
                onChange={e => setPathSource(e.target.value)}
                className="w-full p-1.5 bg-slate-950 border border-slate-700 text-white rounded text-xs"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase mb-1">Target Node</label>
              <select
                value={pathTarget}
                onChange={e => setPathTarget(e.target.value)}
                className="w-full p-1.5 bg-slate-950 border border-slate-700 text-white rounded text-xs"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] uppercase mb-1">Constraint Mode</label>
              <select
                value={pathMode}
                onChange={e => setPathMode(e.target.value as any)}
                className="w-full p-1.5 bg-slate-950 border border-slate-700 text-white rounded text-xs"
              >
                <option value="TELECOM_CDR">Telecom / CDR Bridge (Calls & Towers)</option>
                <option value="HAWALA_FINANCIAL">Hawala / Financial Trail (Mule VPAs)</option>
                <option value="UNCONSTRAINED">Unconstrained Shortest Path</option>
              </select>
            </div>

            <button
              onClick={handleCalculatePath}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
            >
              Compute Evidentiary Chain
            </button>

            {activePath && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Hops: {activePath.path.length - 1}</span>
                  <span className="text-blue-400">Total Weight: {activePath.totalCost.toFixed(1)}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 max-h-28 overflow-y-auto space-y-1">
                  {activePath.path.map((nodeId, idx) => {
                    const node = nodes.find(n => n.id === nodeId);
                    return (
                      <div key={nodeId} className="flex items-center space-x-1.5 text-[10px]">
                        <span className="text-slate-500 font-bold">{idx + 1}.</span>
                        <span className="text-white font-bold truncate">{node?.label || nodeId}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Inspector Drawer (Node Details) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 p-5 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4 pointer-events-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span
                  className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: `${COMMUNITY_COLORS[selectedNode.community].fill}50`,
                    color: COMMUNITY_COLORS[selectedNode.community].text,
                  }}
                >
                  {selectedNode.community}
                </span>
                <h3 className="font-bold text-white text-sm mt-1.5 tracking-tight">{selectedNode.label}</h3>
                <span className="text-[10px] font-mono text-slate-400">{selectedNode.id}</span>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Centrality Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                <span className="text-slate-500 text-[9px] block">BETWEENNESS</span>
                <span className="font-bold text-red-400 text-sm">{selectedNode.betweenness.toFixed(3)}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                <span className="text-slate-500 text-[9px] block">DEGREE</span>
                <span className="font-bold text-blue-400 text-sm">{selectedNode.degree}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                <span className="text-slate-500 text-[9px] block">PAGERANK</span>
                <span className="font-bold text-amber-400 text-sm">{selectedNode.pageRank.toFixed(3)}</span>
              </div>
            </div>

            {/* Special Flags */}
            <div className="space-y-1.5 font-mono text-[11px]">
              {selectedNode.isCutVertex && (
                <div className="p-2 rounded bg-red-950/60 border border-red-800 text-red-300 flex items-start space-x-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <b>Tarjan Cut-Vertex Identified:</b> Neutralizing this node fragments the criminal network into non-operational components.
                  </div>
                </div>
              )}

              {selectedNode.isKingpin && (
                <div className="p-2 rounded bg-amber-950/60 border border-amber-800 text-amber-300 flex items-start space-x-1.5">
                  <Flame className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <b>Kingpin Shielding Profile:</b> High betweenness with low direct call count. Communicates solely via isolated proxy lieutenants.
                  </div>
                </div>
              )}
            </div>

            {/* Metadata & Evidence Provenance */}
            <div className="space-y-1.5 text-[11px]">
              <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Metadata & Provenance</div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 font-mono text-slate-300">
                {selectedNode.metadata.roleDesc && (
                  <div><b>Role:</b> {selectedNode.metadata.roleDesc}</div>
                )}
                {selectedNode.metadata.locationName && (
                  <div><b>Location:</b> {selectedNode.metadata.locationName}</div>
                )}
                {selectedNode.metadata.imei && (
                  <div><b>IMEI:</b> <span className="text-amber-400">{selectedNode.metadata.imei}</span></div>
                )}
                {selectedNode.metadata.msisdn && (
                  <div><b>MSISDN:</b> <span className="text-blue-400">{selectedNode.metadata.msisdn}</span></div>
                )}
                {selectedNode.metadata.plateNo && (
                  <div><b>Plates:</b> <span className="text-emerald-400">{selectedNode.metadata.plateNo}</span></div>
                )}
                {selectedNode.metadata.vpa && (
                  <div><b>VPA:</b> <span className="text-amber-300">{selectedNode.metadata.vpa}</span></div>
                )}
                {selectedNode.metadata.exhibitRef && (
                  <div className="pt-1 border-t border-slate-800 text-slate-400 text-[10px]">
                    <b>Evidentiary Exhibit:</b> {selectedNode.metadata.exhibitRef} (Line {selectedNode.metadata.lineRef || 1})
                  </div>
                )}
              </div>
            </div>

            {selectedNode.metadata.notes && (
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                "{selectedNode.metadata.notes}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
