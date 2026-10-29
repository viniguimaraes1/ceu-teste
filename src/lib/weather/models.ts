/**
 * Registry of the numerical weather prediction models CÉU compares.
 * `metaDataset` is the Open-Meteo dataset path used for run metadata
 * (`/data/{dataset}/static/meta.json`); if that lookup fails the UI simply
 * reports the run time as unavailable.
 */

export interface ModelInfo {
  id: string;
  name: string;
  /** Compact label for dense tables. */
  shortName: string;
  organization: string;
  /** Approximate grid spacing over São Paulo. */
  resolution: string;
  metaDataset: string;
  /** CSS custom property for the model's categorical color. */
  colorVar: string;
}

export const COMPARISON_MODELS: readonly ModelInfo[] = [
  {
    id: "ecmwf_ifs025",
    name: "ECMWF IFS",
    shortName: "ECMWF",
    organization: "Centro Europeu de Previsões (ECMWF)",
    resolution: "~25 km",
    metaDataset: "ecmwf_ifs025",
    colorVar: "--color-model-1",
  },
  {
    id: "gfs_seamless",
    name: "GFS",
    shortName: "GFS",
    organization: "NOAA / NCEP (EUA)",
    resolution: "~25 km",
    metaDataset: "ncep_gfs025",
    colorVar: "--color-model-2",
  },
  {
    id: "icon_seamless",
    name: "ICON",
    shortName: "ICON",
    organization: "Serviço Meteorológico Alemão (DWD)",
    resolution: "~13 km",
    metaDataset: "dwd_icon",
    colorVar: "--color-model-3",
  },
  {
    id: "gem_seamless",
    name: "GEM",
    shortName: "GEM",
    organization: "Serviço Meteorológico do Canadá (CMC)",
    resolution: "~15 km",
    metaDataset: "cmc_gem_gdps",
    colorVar: "--color-model-4",
  },
] as const;

export function modelInfo(id: string): ModelInfo | undefined {
  return COMPARISON_MODELS.find((m) => m.id === id);
}
