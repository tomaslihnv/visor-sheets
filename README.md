# VISOR INSITU

Visor de gestión de activos inmobiliarios para INSITU Irarrázaval e INSITU Echaurren. Aplicación web estática sin backend, desplegada en GitHub Pages.

**URL:** [tomaslihnv.github.io/visor-sheets](https://tomaslihnv.github.io/visor-sheets/)

---

## Fuentes de datos

Los datos se leen en tiempo real desde **Google Sheets publicadas como CSV**. No hay archivos locales ni base de datos.

Cada edificio tiene 6 hojas:

| # | Hoja | Panel |
|---|------|-------|
| 1 | Estatus Actual | Stacking Plan + tabla Estatus Actual |
| 2 | Evolución de Arriendos | Gráficos de evolución |
| 3 | Estacionamientos | Tabla + subterráneo del stacking |
| 4 | Bodegas | Tabla + subterráneo del stacking |
| 5 | Vencimientos | Tabla + gráficos de vencimientos |
| 6 | Salidas | Tabla + gráficos de salidas |

Para actualizar datos basta con editar las hojas de Google correspondientes. Los cambios se reflejan en el visor al recargar la página.

La UF de referencia se consulta en tiempo real desde [mindicador.cl](https://mindicador.cl).

---

## Estructura del proyecto

```
visor-sheets/
├── index.html              ← Estructura HTML + imports
├── styles/
│   └── main.css            ← Todos los estilos
└── src/
    ├── config.js           ← URLs de Google Sheets, layouts de pisos, colores por categoría
    ├── state.js            ← Estado global: edificio activo (AB), datos (BD), instancias Chart.js
    ├── utils.js            ← Helpers: parseCLP, parseDate, nfdKey, fetchUF, formatEvolLabel…
    ├── columns.js          ← Resolución dinámica de columnas CSV (col, pcol, bcol, EVOL_COL)
    ├── categories.js       ← Categorías de unidades, colores, línea de promedio
    ├── data.js             ← calcIPC (ajuste UF), precompute (métricas por fila)
    ├── tooltip.js          ← Tooltips hover para deptos, estacionamientos y bodegas
    ├── filters.js          ← Filtros del stacking (tipo de bien, unidades, tipología, UF/m², vencimiento)
    ├── main.js             ← Bootstrap, switchBuilding, showTab, exportStackingPDF
    └── render/
        ├── stacking.js     ← Grid visual de pisos y subterráneo
        ├── metrics.js      ← Métricas de ocupación en la leyenda
        ├── headers.js      ← Encabezados de columnas (Col / Tip / Sub-Tip / %)
        ├── tables.js       ← Tablas estatus actual y raw CSV
        └── charts/
            ├── evolucion.js   ← Gráficos: Ocupación y Nuevos Arriendos Netos
            ├── vencimiento.js ← Gráfico: Vencimientos Mensuales
            ├── renewal.js     ← Gráfico: Renewal Rate (%)
            └── salidas.js     ← Gráficos: Análisis de Salidas y Motivo de Salida (%)
```

---

## Arquitectura

- **Sin backend ni build step.** Deploy directo desde el repositorio a GitHub Pages.
- **ES Modules nativos** (`type="module"`). Los browsers modernos los soportan sin bundler.
- **Dependencias via CDN** (cargadas como scripts regulares antes del módulo):
  - [PapaParse 5.4.1](https://www.papaparse.com/) — parsing de CSV
  - [Chart.js 4.4.1](https://www.chartjs.org/) — gráficos
  - [chartjs-plugin-datalabels 2.2.0](https://chartjs-plugin-datalabels.netlify.app/) — labels sobre barras
  - [html2canvas 1.4.1](https://html2canvas.hertzen.com/) — captura DOM para PDF
  - [jsPDF 2.5.1](https://artskydj.github.io/jsPDF/) — generación de PDF

### Carga de datos en dos fases

Para que el stacking se coloree lo más rápido posible:

1. **Fase 1** — Se hace fetch solo a la hoja *Estatus Actual* de cada edificio. Con eso ya se puede pintar el stacking con colores correctos.
2. **Fase 2** — En paralelo se cargan las 5 hojas restantes (evolución, estacionamientos, bodegas, vencimientos, salidas). Al resolverse se actualizan las tablas, métricas y gráficos.

Ambas fases corren en paralelo para IRR y ECH.

---

## Funcionalidades

### Stacking Plan
- Grid visual por piso con colores según estado: **contratos** (verde), **renta corta** (violeta), **vacantes** (rojo), **pilotos** (naranja).
- Encabezados de columna con tipología, sub-tipología y % de ocupación.
- Subterráneo con estacionamientos y bodegas.
- Panel de filtros: tipo de bien, estado de unidad, tipología, orientación, vencimiento (slider), canon UF/m² (rango doble).
- Tooltip hover con datos del contrato.
- **Exportar PDF** en formato A3 landscape.

### Panel Evolución
Seis gráficos con filtros de fecha y tipología:
- Ocupación de Departamentos (barras + línea %)
- Nuevos Arriendos Netos
- Vencimientos Mensuales
- Renewal Rate (%)
- Análisis de Salidas
- Motivo de Salida (%)

### Otras pestañas
- **Estatus Actual** — tabla con cálculos de IPC, Canon CLP/UF/UF·m², días remanentes.
- **Evolución de Arriendos**, **Estacionamientos**, **Bodegas**, **Vencimientos**, **Salidas** — tablas raw del CSV.

---

## Desarrollo local

> Los módulos ES requieren un servidor HTTP. No funcionan con `file://`.

Cualquier servidor estático sirve. Con Python:

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

---

## Deploy

Push a `main` → GitHub Pages publica automáticamente. No hay build ni paso extra.

Para agregar un nuevo edificio:
1. Agregar sus URLs en `src/config.js` (objeto `URLS`).
2. Definir su layout de pisos en `src/config.js` (arreglo `LAYOUT_XXX`).
3. Agregar el tab en `index.html` y registrar el edificio en `src/state.js` (objeto `BD`).
