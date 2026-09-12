'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { Work } from '@/lib/mplads';
import { loadCentroids, resolveAll, dominantStatus, type CentroidLookup, type ResolvedWork } from '@/lib/geo-resolve';
import MapStyleToggle from './MapStyleToggle';
import GeoLegend from './GeoLegend';

/* ── Cesium CDN loader (avoids all Vite bundling complexity) ── */

const CESIUM_VER = '1.122';
const CESIUM_CDN = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VER}/Build/Cesium`;

let _cesiumP: Promise<any> | null = null;

function loadCesium(): Promise<any> {
  if (_cesiumP) return _cesiumP;
  _cesiumP = new Promise((resolve, reject) => {
    if ((window as any).Cesium) { resolve((window as any).Cesium); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CESIUM_CDN}/Widgets/widgets.css`;
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = `${CESIUM_CDN}/Cesium.js`;
    script.onload = () => resolve((window as any).Cesium);
    script.onerror = () => reject(new Error('Failed to load CesiumJS from CDN'));
    document.head.appendChild(script);
  });
  return _cesiumP;
}

/* ── Status → color tokens ── */

const STATUS_COLORS: Record<string, [number, number, number, number]> = {
  Completed:     [34,  197, 94,  220],
  Ongoing:       [59,  130, 246, 220],
  Sanctioned:    [245, 158, 11,  220],
  Unsanctioned:  [239, 68,  68,  220],
  'Not reported':[156, 163, 175, 200],
};

function cesiumColor(Cesium: any, status: string, satellite = false) {
  const [r, g, b, a] = STATUS_COLORS[status] || STATUS_COLORS['Not reported'];
  const alpha = satellite ? Math.min(255, a + 30) / 255 : a / 255;
  return new Cesium.Color(r / 255, g / 255, b / 255, alpha);
}

/* ── Component ── */

interface Props {
  works: Work[];
  onSelect: (work: Work) => void;
  selectedId?: string;
}

export default function CesiumGlobe({ works, onSelect, selectedId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const dsRef = useRef<any>(null);                  // CustomDataSource
  const handlerRef = useRef<any>(null);              // ScreenSpaceEventHandler
  const centroidsRef = useRef<CentroidLookup | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapMode, setMapMode] = useState<'standard' | 'satellite'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('geo-map-mode') as 'standard' | 'satellite') || 'standard';
    }
    return 'standard';
  });
  const [clusterWorks, setClusterWorks] = useState<ResolvedWork[] | null>(null);

  // Persist mode
  useEffect(() => { localStorage.setItem('geo-map-mode', mapMode); }, [mapMode]);

  /* ── 1. Initialize viewer (mount-only) ── */
  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const [Cesium, centroids] = await Promise.all([loadCesium(), loadCentroids()]);
        if (dead || !containerRef.current) return;
        centroidsRef.current = centroids;

        const ionToken = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN;
        if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false, baseLayerPicker: false, fullscreenButton: false,
          geocoder: false, homeButton: false, infoBox: false,
          sceneModePicker: false, selectionIndicator: false, timeline: false,
          navigationHelpButton: false,
          baseLayer: new Cesium.ImageryLayer(
            new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
          ),
          terrain: undefined,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });

        // Clean up default credits UI
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

        // Fly to India
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(82, 22, 4_500_000),
        });

        // Data source with clustering
        const ds = new Cesium.CustomDataSource('mplads-works');
        ds.clustering.enabled = true;
        ds.clustering.pixelRange = 50;
        ds.clustering.minimumClusterSize = 3;

        ds.clustering.clusterEvent.addEventListener(
          (clusteredEntities: any[], cluster: any) => {
            cluster.label.show = true;
            cluster.label.text = String(clusteredEntities.length);
            cluster.label.font = '12px Inter, system-ui, sans-serif';
            cluster.label.fillColor = Cesium.Color.WHITE;
            cluster.label.outlineColor = Cesium.Color.BLACK;
            cluster.label.outlineWidth = 2;
            cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
            cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
            cluster.billboard.show = true;
            cluster.billboard.color = new Cesium.Color(0.23, 0.51, 0.96, 0.88);
            cluster.billboard.width = 38;
            cluster.billboard.height = 38;
          }
        );

        await viewer.dataSources.add(ds);

        // Click handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: any) => {
          const picked = viewer.scene.pick(click.position);
          if (!Cesium.defined(picked) || !picked.id) return;
          const entity = picked.id;
          if (entity._singleWork) {
            onSelect(entity._singleWork);
          } else if (entity._groupWorks) {
            setClusterWorks(entity._groupWorks);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        viewerRef.current = viewer;
        dsRef.current = ds;
        handlerRef.current = handler;
        setLoading(false);
      } catch (e) {
        if (!dead) {
          setError(e instanceof Error ? e.message : 'Globe initialization failed');
          setLoading(false);
        }
      }
    })();

    return () => {
      dead = true;
      handlerRef.current?.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      dsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 2. Swap imagery when mapMode changes ── */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    const layers = viewer.imageryLayers;
    // Remove existing base layer
    while (layers.length > 0) layers.remove(layers.get(0));

    if (mapMode === 'satellite') {
      try {
        // Try Cesium Ion (requires token) → fallback to Esri World Imagery (free for dev)
        const ionToken = Cesium.Ion.defaultAccessToken;
        if (ionToken) {
          Cesium.IonImageryProvider.fromAssetId(2).then((provider: any) => {
            if (!viewer.isDestroyed()) layers.addImageryProvider(provider, 0);
          }).catch(() => {
            if (!viewer.isDestroyed()) addEsriSatellite(Cesium, layers);
          });
        } else {
          addEsriSatellite(Cesium, layers);
        }
      } catch {
        addEsriSatellite(Cesium, layers);
      }
    } else {
      layers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
        0
      );
    }
    viewer.scene.requestRender();
  }, [mapMode]);

  /* ── 3. Update markers when works / mapMode changes ── */
  useEffect(() => {
    const ds = dsRef.current;
    const centroids = centroidsRef.current;
    if (!ds || !centroids) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    ds.entities.removeAll();
    const { groups } = resolveAll(works, centroids);
    const isSat = mapMode === 'satellite';

    for (const [, group] of groups) {
      const repr = group[0];
      const status = dominantStatus(group);
      const color = cesiumColor(Cesium, status, isSat);
      const size = Math.min(22, 7 + Math.log2(group.length + 1) * 3);

      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(repr.resolvedLng, repr.resolvedLat),
        point: {
          pixelSize: size,
          color,
          outlineColor: isSat ? Cesium.Color.WHITE.withAlpha(0.9) : Cesium.Color.WHITE.withAlpha(0.7),
          outlineWidth: isSat ? 2.5 : 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(5e5, 1.2, 8e6, 0.6),
        },
        label: group.length > 1
          ? {
              text: String(group.length),
              font: '11px Inter, system-ui, sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -size - 6),
              scaleByDistance: new Cesium.NearFarScalar(5e5, 1.0, 8e6, 0.4),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              showBackground: true,
              backgroundColor: new Cesium.Color(0, 0, 0, 0.55),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            }
          : undefined,
      });

      // Attach work data for click handling
      if (group.length === 1) {
        (entity as any)._singleWork = group[0];
      } else {
        (entity as any)._groupWorks = group;
      }
    }

    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
  }, [works, mapMode]);

  /* ── 4. FlyTo on external selection ── */
  useEffect(() => {
    if (!selectedId) return;
    const viewer = viewerRef.current;
    const centroids = centroidsRef.current;
    if (!viewer || viewer.isDestroyed() || !centroids) return;
    const Cesium = (window as any).Cesium;

    const w = works.find(w => w.id === selectedId);
    if (!w) return;

    const { resolved } = resolveAll([w], centroids);
    if (!resolved.length) return;
    const r = resolved[0];

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(r.resolvedLng, r.resolvedLat, 200_000),
      duration: 1.5,
    });
  }, [selectedId, works]);

  /* ── Cluster popup selection ── */
  const handleClusterSelect = useCallback((w: Work) => {
    setClusterWorks(null);
    onSelect(w);
  }, [onSelect]);

  /* ── Render ── */
  return (
    <div className="cesium-globe-wrapper">
      <div ref={containerRef} className="cesium-globe-container" />

      {/* Loading overlay */}
      {loading && (
        <div className="cesium-loading">
          <div className="cesium-spinner" />
          <span>Loading interactive globe…</span>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="cesium-error">
          <strong>Globe unavailable</strong>
          <p>{error}</p>
          <p className="secondary">Project data remains available in the list below.</p>
        </div>
      )}

      {/* Controls */}
      {!loading && !error && (
        <>
          <MapStyleToggle mode={mapMode} onChange={setMapMode} />
          <GeoLegend satellite={mapMode === 'satellite'} />
          <div className="cesium-count" aria-live="polite">
            {works.length.toLocaleString('en-IN')} works mapped
          </div>
        </>
      )}

      {/* Cluster popup — shown when multi-work marker is clicked */}
      {clusterWorks && (
        <div className="cesium-cluster-popup">
          <div className="cesium-cluster-header">
            <strong>{clusterWorks.length} works at this location</strong>
            <button onClick={() => setClusterWorks(null)} aria-label="Close">✕</button>
          </div>
          <div className="cesium-cluster-list">
            {clusterWorks.slice(0, 20).map(w => (
              <button key={w.id} className="cesium-cluster-item" onClick={() => handleClusterSelect(w)}>
                <span className={`cluster-dot status-${w.status.toLowerCase().replace(/\s/g, '-')}`} />
                <div>
                  <span className="cluster-title">{w.title || 'Description not reported'}</span>
                  <span className="cluster-meta">{w.id} · {w.status} · ₹{(w.allocation / 100000).toFixed(1)}L</span>
                </div>
              </button>
            ))}
            {clusterWorks.length > 20 && (
              <p className="secondary" style={{ padding: '8px 12px', margin: 0, fontSize: 12 }}>
                +{clusterWorks.length - 20} more works. Use filters to narrow.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function addEsriSatellite(Cesium: any, layers: any) {
  layers.addImageryProvider(
    new Cesium.ArcGisMapServerImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    }),
    0
  );
}
