# Catálogo de tipos de máquina (recibido del cliente)

Fuente: `data/Listado_de_Tipos_de_maquina.xlsx` (original) y
`data/catalogo_tipos_maquina.csv` (versión normalizada). Recibido el 2026-07-07.
Cierra el punto pendiente de la decisión D9.

## Estructura de cada tipo

| Campo | Descripción |
|---|---|
| Código | Identificador (prefijo por clase: C=calientes, F=frías/snack, M=mixtas, O=OCS, FA=fuente de agua, MC=máquina de cambio, CO=compactadora, G=genérica, Z=zumos) |
| Clase | Familia de máquina (ver abajo) |
| Marca-Modelo | Fabricante y modelo |
| Formato | Código de formato |
| Canales | Nº total de selecciones/canales |
| Filas / Columnas | Rejilla de la máquina (base del editor de planogramas: filas = bandejas, columnas = espirales por bandeja en snack/frías) |
| Extra | Canales extra |
| Contenedores | Nº de contenedores (máquinas de café) |
| Máquinas / PDVs | Parque actual del operador piloto (informativo) |

## Resumen: 202 tipos, 10 clases, 20 marcas

**Clases**: Bebidas Calientes/Preparadas (73), Bebidas Frías/Envasadas (59),
Snack/Multiproducto (57), OCS/Café Cápsula-Grano (5), Fuente de Agua (2),
Genérica/Otros (2), Compactadoras (1), Combi-Mixtas Caliente-Frío (1),
Máquinas de cambio (1), Zumos (1).

**Marcas principales**: NECTA (55), SANDENVENDO (34), BIANCHI (24),
AZKOYEN (20), FAS (19), WURLITZER (6), DIXIE NARCO (5), JOFEMAR (4),
RHEA (3), NESPRESSO (3), VENDO (3), y otras (IARP, MANEA, DUCALE,
GREENSYSTEM, FRIGOGLASS, ROYAL VENDORS, CANALETAS, PICKIO); 16 tipos sin
marca informada.

## Implicaciones para el diseño

1. El **catálogo inicial** del tenant piloto se migra desde este Excel
   (mismo mecanismo de import que la migración de clientes/máquinas, D24).
2. La rejilla del **editor de planogramas** se construye con Filas × Columnas;
   las máquinas de café usan Canales + Contenedores en lugar de espirales.
3. La clase **"Fuente de Agua"** y similares confirman que el catálogo debe
   admitir **equipamiento no vending** (ver D26: muebles, panelados,
   microondas, fuentes), aunque no lleven planograma.
4. Hay tipos "comodín" (Genérica/FICTICIO) que el modelo de datos debe
   permitir.
