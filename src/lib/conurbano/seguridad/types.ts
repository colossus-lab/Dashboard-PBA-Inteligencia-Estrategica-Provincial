export type Partido = { id: string; nombre: string };
export type Delito = { id: string; nombre: string };

export type Dataset = {
  meta: {
    generado: string;
    fuente: string;
    unidad_tasa: string;
    filas_totales: number;
    filas_usadas: number;
    nota_genero?: string;
  };
  partidos: Partido[];
  delitos: Delito[];
  anios: number[];
  hechos: number[][][];
  tasa: number[][][];
  victimas_masc: number[][][];
  victimas_fem: number[][][];
  victimas_sd: number[][][];
};

export type Metric = 'hechos' | 'tasa';
