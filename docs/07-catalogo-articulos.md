# Catálogo de artículos para planogramas (recibido del cliente)

Fuente: `data/Listado_de_Articulos.xlsx` (original) y
`data/catalogo_articulos.csv` (versión normalizada, con la categoría separada
de la subcategoría). Recibido el 2026-07-08.

## Estructura de cada artículo

| Campo | Descripción |
|---|---|
| Código | Identificador numérico (2 excepciones alfanuméricas) — coincide con el código de artículo de VendCloud |
| Nombre | Descripción comercial (incluye gramaje/formato) |
| Obsoleto | Booleano (los 858 recibidos están vigentes) |
| Fabricante | Proveedor del artículo (90 distintos) |
| Categoría » Subcategoría | Jerarquía de dos niveles, separador « » » (7 categorías, 56 subcategorías) |
| Categoría de precios | Casi siempre vacía; solo 2 artículos "Café normal" |

## Resumen: 858 artículos

**Categorías**: SNACK (269), PRODUCTO FRESCO (217), BEBIDA FRIA (173),
BEBIDA CALIENTE (129), SNACK SALUDABLE (64), BEBIDA SALUDABLE (3),
VINIERON SIN CLASIFICAR (3).

**Fabricantes principales**: Nutriger Solutions (127), DAAG-Food Solutions /
Vending Go (89), Ñaming (51), Sandwich LM (44), Kaiku (38), Coca-Cola (38)…

## Implicaciones para el diseño

1. Los artículos se cargan en `/tenants/{tenantId}/productos` con el **código
   como ID de documento** (igual que los modelos de máquina) — script
   `app/scripts/seed-articulos.mjs`.
2. La **categoría/subcategoría** servirá para filtrar en el editor de
   planogramas (p. ej. solo BEBIDA FRIA en máquinas de frías) y para las
   hojas de taller.
3. La columna **"Categoría de precios"** casi vacía sugiere que la tarifa no
   viene en este listado: se gestionará en el módulo de tarifas (D8/D20),
   donde cada tarifa de cliente asigna precio a estos códigos.
4. **Campo `obsoleto`** ya contemplado: los artículos no se borran, se marcan
   (mismo patrón que la colección `operaciones` de Visitas Comerciales).

## Imágenes de producto

Las imágenes están en una carpeta local del cliente
(`OneDrive – Elior Group … \Vencloud\Imagenes\Productos`) a la que no hay
acceso desde el entorno de desarrollo. Plan:

1. Convención en Firebase Storage:
   `tenants/{tenantId}/productos/{codigo}.{png|jpg}` — el editor de
   planogramas resuelve la imagen por código y muestra un genérico si falta.
2. El campo `imagenPath` del producto se rellena al subir la imagen.
3. El ZIP resultó demasiado grande para entregarlo, así que la carga se hace
   **directamente desde el PC del cliente** con
   `app/scripts/subir-imagenes.mjs`: recorre la carpeta local, sube cada
   imagen a Storage, enlaza `imagenPath` en el producto por código de
   artículo y genera un informe (subidas / ficheros sin producto / productos
   sin imagen). Requiere una clave de cuenta de servicio del proyecto y
   `npm install` en `app/`. Uso:

   ```bash
   node scripts/subir-imagenes.mjs --tenant=piloto --project=digivend-dev \
     --dir="C:\...\Vencloud\Imagenes\Productos" --sa=serviceAccount.json
   ```
