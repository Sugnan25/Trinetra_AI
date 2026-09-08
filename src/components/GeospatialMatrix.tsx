import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Layers,
  MapPin,
  Radio,
  Clock,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { TimelineEvent } from '../types';
import L from 'leaflet';

interface GeospatialMatrixProps {
  timeline: TimelineEvent[];
}

type TileProvider = 'CARTO_DARK' | 'OPEN_STREET_MAP' | 'ESRI_SATELLITE';

const TILE_CONFIGS: Record<TileProvider, { url: string; attribution: string; name: string }> = {
  CARTO_DARK: {
    name: 'CartoDB Dark Matter (Tactical)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  },
  OPEN_STREET_MAP: {
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  ESRI_SATELLITE: {
    name: 'ESRI World Imagery (Satellite)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & GIS Community',
  },
};

export const GeospatialMatrix: React.FC<GeospatialMatrixProps> = ({ timeline }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeTile, setActiveTile] = useState<TileProvider>('CARTO_DARK');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAzimuthWedges, setShowAzimuthWedges] = useState(true);
  const [showRadarPulses, setShowRadarPulses] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const initialLat = 22.3072;
    const initialLng = 73.1812;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 8,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileLayer = L.tileLayer(TILE_CONFIGS[activeTile].url, {
      attribution: TILE_CONFIGS[activeTile].attribution,
      maxZoom: 18,
    }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;
    layersGroupRef.current = layersGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Tile Provider change
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(TILE_CONFIGS[activeTile].url, {
      attribution: TILE_CONFIGS[activeTile].attribution,
      maxZoom: 18,
    }).addTo(mapRef.current);
    tileLayerRef.current = newLayer;
  }, [activeTile]);

  // Helper to generate 120-degree circular sector polygon coordinates (BTS azimuth)
  const computeAzimuthSectorPoints = (
    centerLat: number,
    centerLng: number,
    azimuthDeg: number,
    radiusMeters: number
  ): L.LatLngExpression[] => {
    const points: L.LatLngExpression[] = [[centerLat, centerLng]];
    const startAngle = (azimuthDeg - 60) * (Math.PI / 180);
    const endAngle = (azimuthDeg + 60) * (Math.PI / 180);
    const numPoints = 16;

    // Convert meters to approximate lat/lng degrees
    const latDelta = radiusMeters / 111320;
    const lngDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

    for (let i = 0; i <= numPoints; i++) {
      const angle = startAngle + (i / numPoints) * (endAngle - startAngle);
      const ptLat = centerLat + Math.cos(angle) * latDelta;
      const ptLng = centerLng + Math.sin(angle) * lngDelta;
      points.push([ptLat, ptLng]);
    }
    points.push([centerLat, centerLng]);
    return points;
  };

  // Re-render markers, azimuth sectors, radar pulses, and suspect path on step change
  useEffect(() => {
    if (!mapRef.current || !layersGroupRef.current) return;
    const group = layersGroupRef.current;
    group.clearLayers();

    const currentEvent = timeline[currentStepIndex];
    if (!currentEvent) return;

    // Smoothly pan to active event
    mapRef.current.panTo([currentEvent.lat, currentEvent.lng], {
      animate: true,
      duration: 1.0,
    });

    // 1. Draw Trajectory Line up to current step
    const trajectoryPoints: L.LatLngExpression[] = timeline
      .slice(0, currentStepIndex + 1)
      .map(e => [e.lat, e.lng]);

    if (trajectoryPoints.length > 1) {
      L.polyline(trajectoryPoints, {
        color: '#38bdf8',
        weight: 3,
        dashArray: '5, 8',
        opacity: 0.8,
      }).addTo(group);
    }

    // 2. Draw all historic points as smaller markers
    timeline.forEach((event, idx) => {
      const isPast = idx < currentStepIndex;
      const isCurrent = idx === currentStepIndex;

      // Current active location gets a large glowing marker
      if (isCurrent) {
        // Radar Pulse Geofence Alarm Circle
        if (showRadarPulses) {
          L.circle([event.lat, event.lng], {
            radius: event.radius || 2000,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.15,
            weight: 2,
          }).addTo(group);
        }

        // 120-degree BTS Azimuth Wedge if available
        if (showAzimuthWedges && event.azimuth !== undefined) {
          const sectorCoords = computeAzimuthSectorPoints(
            event.lat,
            event.lng,
            event.azimuth,
            event.radius || 1800
          );

          L.polygon(sectorCoords, {
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.25,
            weight: 2,
          }).addTo(group);
        }

        // Active Event Beacon
        const markerHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></span>
            <span class="relative w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white font-mono">
              ${idx + 1}
            </span>
          </div>
        `;
        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-beacon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const m = L.marker([event.lat, event.lng], { icon }).addTo(group);
        m.bindPopup(
          `<div style="font-family: monospace; font-size: 12px; color: #0f172a;">
            <b style="color: #b91c1c;">[STEP ${idx + 1}] ${event.timeLabel}</b><br/>
            <b>${event.title}</b><br/>
            <span style="font-size: 11px; color: #475569;">${event.location}</span><br/>
            <p style="margin-top: 4px; font-size: 11px;">${event.description}</p>
          </div>`
        ).openPopup();
      } else if (isPast) {
        // Past trail marker
        const pastHtml = `
          <div class="w-3.5 h-3.5 rounded-full bg-blue-500 border border-slate-900 shadow"></div>
        `;
        const pastIcon = L.divIcon({
          html: pastHtml,
          className: 'past-marker',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([event.lat, event.lng], { icon: pastIcon }).addTo(group);
      }
    });
  }, [currentStepIndex, timeline, showAzimuthWedges, showRadarPulses]);

  // Chronological Playback Scrubber: Paced at EXACTLY 4,000ms per step (as specified in PDF page 14 & 18)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= timeline.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000); // 4,000ms pace requirement

    return () => clearInterval(interval);
  }, [isPlaying, timeline.length]);

  const currentEvent = timeline[currentStepIndex];

  return (
    <div
      className={`relative w-full bg-slate-950 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-125px)]'
      }`}
    >
      {/* Top Map HUD Controls */}
      <div className="z-20 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">
              Geospatial Matrix (GIS)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Tile Layer Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 text-[10px]">Basemap:</span>
            <select
              value={activeTile}
              onChange={e => setActiveTile(e.target.value as TileProvider)}
              className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs"
            >
              <option value="CARTO_DARK">CartoDB Dark Matter (Tactical)</option>
              <option value="OPEN_STREET_MAP">OpenStreetMap (Street)</option>
              <option value="ESRI_SATELLITE">ESRI Satellite Imagery</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Azimuth & Geofence Toggles */}
          <button
            onClick={() => setShowAzimuthWedges(!showAzimuthWedges)}
            className={`px-2 py-1 rounded text-xs border transition-all ${
              showAzimuthWedges
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            120° Azimuth Wedges
          </button>
          <button
            onClick={() => setShowRadarPulses(!showRadarPulses)}
            className={`px-2 py-1 rounded text-xs border transition-all ${
              showRadarPulses
                ? 'bg-red-950 text-red-300 border-red-700'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            Radar Geofences
          </button>
        </div>

        {/* Fullscreen Expansion */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative flex-1">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Bottom Playback Scrubber Deck (Paced at 4,000ms) */}
        <div className="absolute bottom-5 left-4 right-4 z-20 max-w-4xl mx-auto bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3">
              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all"
                title={isPlaying ? 'Pause Auto-Stepper' : 'Start 4,000ms Playback'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentStepIndex(prev => Math.min(timeline.length - 1, prev + 1))}
                disabled={currentStepIndex === timeline.length - 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  AUTO-STEPPER PACE: <span className="text-emerald-400 font-bold">4,000ms / STEP</span>
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  Step {currentStepIndex + 1} of {timeline.length}: {currentEvent?.timeLabel}
                </span>
              </div>
            </div>

            {/* Current Event Headline in Scrubber */}
            <div className="text-right font-mono text-xs hidden md:block">
              <span className="text-amber-400 font-bold block">{currentEvent?.title}</span>
              <span className="text-[11px] text-slate-400">{currentEvent?.location}</span>
            </div>
          </div>

          {/* Timeline Range Bar */}
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={timeline.length - 1}
              value={currentStepIndex}
              onChange={e => setCurrentStepIndex(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>16-JUL 2008 (Mumbai Theft)</span>
              <span>23-JUL (Vadodara Toll)</span>
              <span>24-JUL (Bharuch Burner Swap)</span>
              <span>26-JUL (Ahmedabad Detonations)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
