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
  const [viewerReady, setViewerReady] = useState(false);
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
          // baseLayer:false prevents Ion-dependent default imagery
          baseLayer: false,
          requestRenderMode: false,
        });

        // Flat terrain - prevents Ion terrain requests that crash without a token
        viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();

        // Add OSM as base layer (UrlTemplateImageryProvider is more reliable than OpenStreetMapImageryProvider)
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19,
            credit: new Cesium.Credit('© OpenStreetMap contributors'),
          })
        );

        // Clean up default credits UI
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

        // Fly to India
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(82, 22, 4_500_000),
        });

        // Data source - clustering disabled so every point remains permanently visible at all zoom levels
        const ds = new Cesium.CustomDataSource('mplads-works');
        ds.clustering.enabled = false;
        await viewer.dataSources.add(ds);

        // Configure camera controller for smooth zooming and gestures
        const controller = viewer.scene.screenSpaceCameraController;
        controller.enableZoom = true;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableTilt = true;
        controller.enableLook = false;
        controller.zoomEventTypes = [
          Cesium.CameraEventType.RIGHT_DRAG,
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH,
        ];
        controller.minimumZoomDistance = 15_000;
        controller.maximumZoomDistance = 25_000_000;

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

        // Trackpad pinch-to-zoom (Chrome / Edge / Safari trackpads trigger wheel with ctrlKey=true)
        const container = containerRef.current;
        const handleWheel = (e: WheelEvent) => {
          if (e.ctrlKey) {
            e.preventDefault();
            if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
            const camera = viewerRef.current.camera;
            const height = camera.positionCartographic?.height || 4_000_000;
            // deltaY < 0 means pinch out (zoom in); deltaY > 0 means pinch in (zoom out)
            const factor = Math.min(Math.max(Math.abs(e.deltaY) * 0.005, 0.02), 0.35);
            if (e.deltaY < 0 && height > 20_000) {
              camera.zoomIn(height * factor);
            } else if (e.deltaY > 0 && height < 25_000_000) {
              camera.zoomOut(height * factor);
            }
          }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });

        (container as any)._cleanupPinch = () => {
          container.removeEventListener('wheel', handleWheel);
        };

        viewerRef.current = viewer;
        dsRef.current = ds;
        handlerRef.current = handler;
        setViewerReady(true);
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
      setViewerReady(false);
      if (containerRef.current && (containerRef.current as any)._cleanupPinch) {
        (containerRef.current as any)._cleanupPinch();
      }
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
    if (!viewerReady) return;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    const layers = viewer.imageryLayers;
    // Remove existing base layer
    while (layers.length > 0) layers.remove(layers.get(0));

    if (mapMode === 'satellite') {
      // Esri World Imagery - free for development, no token needed
      // Must use async fromUrl factory (constructor deprecated in CesiumJS 1.104+)
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
      ).then((provider: any) => {
        if (!viewer.isDestroyed()) {
          layers.addImageryProvider(provider, 0);
          viewer.scene.requestRender();
        }
      }).catch(() => {
        // Fallback to OSM if Esri fails
        if (!viewer.isDestroyed()) {
          layers.addImageryProvider(osmProvider(Cesium), 0);
          viewer.scene.requestRender();
        }
      });
    } else {
      layers.addImageryProvider(osmProvider(Cesium), 0);
    }
    viewer.scene.requestRender();
  }, [mapMode, viewerReady]);

  /* ── 3. Update markers when works / mapMode / viewerReady changes ── */
  useEffect(() => {
    if (!viewerReady) return;
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
      const isCoarse = repr.geoPrecision === 'state';
      let color = cesiumColor(Cesium, status, isSat);
      if (isCoarse) {
        // Visually distinguish coarse fallback (state centroid) with lower opacity
        color = color.withAlpha(isSat ? 0.6 : 0.45);
      }
      const size = Math.min(24, Math.max(10, 8 + Math.log2(group.length + 1) * 2.5));

      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(repr.resolvedLng, repr.resolvedLat),
        point: {
          pixelSize: size,
          color,
          outlineColor: isCoarse
            ? Cesium.Color.fromCssColorString('rgba(203, 213, 225, 0.6)')
            : (isSat ? Cesium.Color.WHITE.withAlpha(0.95) : Cesium.Color.WHITE.withAlpha(0.85)),
          outlineWidth: isCoarse ? 1.5 : (isSat ? 2.5 : 2),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(2e5, 1.2, 2.5e7, 0.75),
        },
        label: group.length > 1
          ? {
              text: String(group.length),
              font: 'bold 11px Inter, system-ui, sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -size - 6),
              scaleByDistance: new Cesium.NearFarScalar(2e5, 1.0, 2e7, 0.5),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              showBackground: true,
              backgroundColor: new Cesium.Color(0, 0, 0, 0.6),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            }
          : undefined,
      });

      // Attach work data and base styling for click handling & highlighting
      (entity as any)._baseSize = size;
      (entity as any)._baseOutlineColor = entity.point?.outlineColor;
      (entity as any)._baseOutlineWidth = isCoarse ? 1 : (isSat ? 2.5 : 1.5);
      if (group.length === 1) {
        (entity as any)._singleWork = group[0];
      } else {
        (entity as any)._groupWorks = group;
      }
    }

    const viewer = viewerRef.current;
    if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
  }, [works, mapMode, viewerReady]);

  /* ── 4. FlyTo and Highlight on selection ── */
  useEffect(() => {
    if (!viewerReady) return;
    const viewer = viewerRef.current;
    const ds = dsRef.current;
    const centroids = centroidsRef.current;
    if (!viewer || viewer.isDestroyed() || !ds || !centroids) return;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Reset previous highlight
    for (const entity of ds.entities.values) {
      if ((entity as any)._isHighlighted && entity.point) {
        (entity as any)._isHighlighted = false;
        entity.point.pixelSize = (entity as any)._baseSize || 12;
        entity.point.outlineColor = (entity as any)._baseOutlineColor;
        entity.point.outlineWidth = (entity as any)._baseOutlineWidth || 1.5;
      }
    }

    if (!selectedId) {
      viewer.scene.requestRender();
      return;
    }

    const w = works.find(w => w.id === selectedId);
    if (!w) return;

    const { resolved } = resolveAll([w], centroids);
    if (!resolved.length) return;
    const r = resolved[0];

    // Highlight matching entity
    for (const entity of ds.entities.values) {
      const match = entity._singleWork?.id === selectedId ||
        entity._groupWorks?.some((gw: Work) => gw.id === selectedId);
      if (match && entity.point) {
        (entity as any)._isHighlighted = true;
        entity.point.pixelSize = Math.max(((entity as any)._baseSize || 12) * 1.5, 18);
        entity.point.outlineColor = Cesium.Color.fromCssColorString('#f97316'); // Bright saffron highlight
        entity.point.outlineWidth = 4;
        break;
      }
    }

    // Smooth flyTo without jarring jump if camera is already close
    const carto = viewer.camera.positionCartographic;
    const curLat = Cesium.Math.toDegrees(carto.latitude);
    const curLng = Cesium.Math.toDegrees(carto.longitude);
    const dLat = Math.abs(curLat - r.resolvedLat);
    const dLng = Math.abs(curLng - r.resolvedLng);
    const isNearby = dLat < 2 && dLng < 2 && carto.height < 600_000;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(r.resolvedLng, r.resolvedLat, isNearby ? carto.height : 250_000),
      duration: isNearby ? 0.8 : 1.5,
    });
  }, [selectedId, works, viewerReady]);

  /* ── Cluster popup selection ── */
  const handleClusterSelect = useCallback((w: Work) => {
    setClusterWorks(null);
    onSelect(w);
  }, [onSelect]);

  /* ── Zoom In / Zoom Out actions ── */
  const handleZoomIn = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const camera = viewer.camera;
    const height = camera.positionCartographic?.height || 4_000_000;
    if (height > 20_000) {
      camera.zoomIn(height * 0.35);
      viewer.scene.requestRender();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const camera = viewer.camera;
    const height = camera.positionCartographic?.height || 4_000_000;
    if (height < 25_000_000) {
      camera.zoomOut(height * 0.35);
      viewer.scene.requestRender();
    }
  }, []);

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
          <div className="cesium-zoom-controls" aria-label="Zoom controls">
            <button
              type="button"
              className="cesium-zoom-btn"
              onClick={handleZoomIn}
              title="Zoom in (Pinch out)"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="cesium-zoom-btn"
              onClick={handleZoomOut}
              title="Zoom out (Pinch in)"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
          <GeoLegend satellite={mapMode === 'satellite'} />
          <div className="cesium-count" aria-live="polite">
            {works.length.toLocaleString('en-IN')} works mapped
          </div>
        </>
      )}

      {/* Cluster popup - shown when multi-work marker is clicked */}
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

/** Reliable OSM tile provider - uses UrlTemplateImageryProvider instead of the
 *  deprecated OpenStreetMapImageryProvider constructor. */
function osmProvider(Cesium: any) {
  return new Cesium.UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maximumLevel: 19,
    credit: new Cesium.Credit('© OpenStreetMap contributors'),
  });
}
