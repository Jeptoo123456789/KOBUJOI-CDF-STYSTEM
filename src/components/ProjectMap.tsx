import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ProjectRecord } from '../types/cdf.ts';
import { MapPin, ExternalLink, Layers, Compass } from 'lucide-react';

interface ProjectMapProps {
  projects: ProjectRecord[];
  onSelectProjectDetail?: (project: ProjectRecord) => void;
}

export const ProjectMap: React.FC<ProjectMapProps> = ({
  projects,
  onSelectProjectDetail,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(
    projects[0] || null
  );
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  const filteredProjects = projects.filter((p) => {
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchCat && matchStatus;
  });

  useEffect(() => {
    if (!selectedProject && filteredProjects.length > 0) {
      setSelectedProject(filteredProjects[0]);
    } else if (
      selectedProject &&
      !filteredProjects.some((p) => p.projectId === selectedProject.projectId)
    ) {
      setSelectedProject(filteredProjects[0] || null);
    }
  }, [filteredProjects, selectedProject]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const tileUrl =
        import.meta.env.VITE_MAP_TILE_URL ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const map = L.map(mapContainerRef.current, {
        center: [0.0962, 34.9725], // Kobujoi Ward, Aldai Constituency, Nandi County
        zoom: 13,
        scrollWheelZoom: false,
      });

      L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors · Kobujoi Ward GIS',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    filteredProjects.forEach((project) => {
      const isSelected = selectedProject?.projectId === project.projectId;
      const statusColor =
        project.status === 'Completed'
          ? '#16A34A'
          : project.status === 'Ongoing'
          ? '#0B4F32'
          : '#D97706';

      const customIcon = L.divIcon({
        className: 'custom-cdf-marker',
        html: `<div style="
          width: ${isSelected ? '34px' : '26px'};
          height: ${isSelected ? '34px' : '26px'};
          background: ${statusColor};
          border: 3px solid #FFFFFF;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          transition: transform 150ms ease;
        ">${project.percentageCompleted}%</div>`,
        iconSize: [isSelected ? 34 : 26, isSelected ? 34 : 26],
        iconAnchor: [isSelected ? 17 : 13, isSelected ? 17 : 13],
      });

      const marker = L.marker([project.latitude, project.longitude], {
        icon: customIcon,
      });

      marker.on('click', () => {
        setSelectedProject(project);
        map.panTo([project.latitude, project.longitude], { animate: true });
      });

      marker.bindTooltip(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600;">
          ${project.projectName}<br/>
          <span style="font-weight: 400; color: #475569;">${project.subLocation} · ${project.status} (${project.percentageCompleted}%)</span>
        </div>`,
        { direction: 'top', offset: [0, -12] }
      );

      marker.addTo(layerGroup);
    });
  }, [filteredProjects, selectedProject]);

  const categories = Array.from(new Set(projects.map((p) => p.category)));
  const statuses = Array.from(new Set(projects.map((p) => p.status)));

  const focusProject = (proj: ProjectRecord) => {
    setSelectedProject(proj);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([proj.latitude, proj.longitude], 14, {
        animate: true,
      });
    }
  };

  return (
    <div className="border border-neutral-200 bg-white rounded-xl p-5 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-neutral-200">
        <div>
          <p className="text-xs text-neutral-500">
            Geospatial Accountability · Kobujoi Ward · Aldai Constituency (0.096° N, 34.975° E)
          </p>
          <h3 className="text-xl font-display font-semibold text-neutral-900 mt-1">
            Constituency Development Project Map
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neutral-500" />
            <select
              aria-label="Filter map by project category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0B4F32]"
            >
              <option value="ALL">All Categories ({projects.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="Filter map by project status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0B4F32]"
          >
            <option value="ALL">All Statuses</option>
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Map Canvas */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative w-full h-[380px] md:h-[440px] rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Quick Sub-Location Marker Selector Bar */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            {filteredProjects.map((proj) => {
              const active = selectedProject?.projectId === proj.projectId;
              return (
                <button
                  key={proj.projectId}
                  type="button"
                  onClick={() => focusProject(proj)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#0B4F32] text-white border-[#0B4F32]'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{proj.subLocation}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{proj.percentageCompleted}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Marker Inspector Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between border border-neutral-200 rounded-lg p-4 md:p-5 bg-[#F8FAF9]">
          {selectedProject ? (
            <div>
              <div className="relative h-44 w-full rounded-lg overflow-hidden bg-neutral-200 mb-4 border border-neutral-200">
                {!imgErrorMap[selectedProject.projectId] && selectedProject.primaryPhotoUrl ? (
                  <img
                    src={selectedProject.primaryPhotoUrl}
                    alt={selectedProject.projectName}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgErrorMap((prev) => ({
                        ...prev,
                        [selectedProject.projectId]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0B4F32] to-[#133829] text-white p-4 text-center">
                    <MapPin className="w-6 h-6 mb-1 opacity-80" />
                    <span className="text-xs font-medium">{selectedProject.projectName}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                  <p className="text-xs font-mono tabular-nums">
                    {selectedProject.projectId} · {selectedProject.ward} Ward · {selectedProject.subLocation}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-600 mb-1.5">
                <span className="font-semibold text-[#0B4F32]">{selectedProject.status}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedProject.category}</span>
                <span aria-hidden="true">·</span>
                <span>FY {selectedProject.financialYear}</span>
              </div>

              <h4 className="text-base font-semibold text-neutral-900 leading-snug">
                {selectedProject.projectName}
              </h4>

              <p className="text-xs text-neutral-600 mt-2 leading-relaxed line-clamp-3">
                {selectedProject.description}
              </p>

              <div className="mt-4 pt-3 border-t border-neutral-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-neutral-500 block">Approved Budget</span>
                  <span className="text-sm font-mono font-semibold text-neutral-900 tabular-nums">
                    KSh {selectedProject.approvedBudgetKsh.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 block">Verified Expenditure</span>
                  <span className="text-sm font-mono font-semibold text-[#0B4F32] tabular-nums">
                    KSh {selectedProject.amountSpentKsh.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-600">Implementation Progress</span>
                  <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                    {selectedProject.percentageCompleted}%
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B4F32] transition-all duration-200"
                    style={{ width: `${selectedProject.percentageCompleted}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">
                  Stage: {selectedProject.currentStage}
                </p>
              </div>

              {onSelectProjectDetail && (
                <button
                  type="button"
                  onClick={() => onSelectProjectDetail(selectedProject)}
                  className="mt-4 w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Inspect Project Ledger & Photos</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-neutral-500">
              No projects match the selected map filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
