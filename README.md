# X Quick Block

Extensión de Chrome que añade un botón de **bloqueo directo** en la barra de acciones de cada tweet de X (Twitter). Un clic arma el botón, el segundo confirma: se bloquea al autor sin abrir el menú `...` ni el diálogo nativo de confirmación.

## Cómo funciona

- Recorre el timeline con un `MutationObserver` (X es una SPA) e inyecta un botón en cada `article[data-testid="tweet"]`, justo antes del icono de guardar.
- Primer clic → el botón se pone rojo y pulsa durante 3 segundos (estado *armado*).
- Segundo clic dentro de esa ventana → bloquea. Si no llega, el botón se desarma solo.
- Bloqueo vía `POST /i/api/1.1/blocks/create.json` usando la cookie de sesión y el token `ct0` como CSRF.
- Si esa llamada falla (cambio de API, rate limit…), cae automáticamente a un **fallback DOM**: abre el menú `...`, pulsa *Bloquear* y confirma el diálogo.
- Al terminar, el tweet se atenúa (opacidad 0.4) y el botón queda gris.

Por eso el content script se declara con `"world": "MAIN"`: necesita ejecutarse en el contexto de la página para reutilizar la sesión del cliente web.

## Instalación

1. Descarga o clona el repo:
   ```bash
   git clone git@github.com:luisep92/x_quick_block.git
   ```
2. Abre `chrome://extensions` en Chrome (o Edge/Brave con su URL equivalente).
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del repo.
5. Recarga cualquier pestaña de `x.com` que tuvieras abierta.

No hay que compilar nada: son dos ficheros planos.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| [manifest.json](manifest.json) | Manifest V3. Registra el content script en `x.com` y `twitter.com`. |
| [content.js](content.js) | Todo: estilos, icono SVG, detección del handle, lógica de bloqueo y fallback. |

## Configuración

No hay opciones de UI. Para ajustar el comportamiento se editan las constantes al principio de [content.js](content.js#L4-L8):

- `ARM_MS` — milisegundos que el botón queda armado esperando el segundo clic (por defecto `3000`).
- `BEARER` — bearer público del cliente web de X. Cambia muy de vez en cuando; si un día la API devuelve 401/403, hay que actualizarlo (se ve en cualquier petición a `/i/api/` en las DevTools). Aun sin actualizarlo la extensión sigue funcionando por el fallback DOM.

## Permisos

El manifest **no pide ningún permiso**. El script sólo corre en `x.com` y `twitter.com` y usa la sesión que ya tienes en el navegador. No envía nada a terceros ni almacena datos.

## Limitaciones

- Depende de los `data-testid` del DOM de X (`tweet`, `User-Name`, `caret`, `block`, `bookmark`). Si X los renombra, el botón puede dejar de aparecer o el fallback dejar de funcionar.
- No hay deshacer: el bloqueo es inmediato tras el segundo clic. Para desbloquear, hazlo desde el perfil o desde los ajustes de X.
- Sólo probado en Chromium (Chrome/Edge/Brave). En Firefox el `"world": "MAIN"` de MV3 se comporta distinto.

## Depuración

Los mensajes se imprimen en la consola de la pestaña con el prefijo `[X Quick Block]`. Si un bloqueo falla, el botón se pone amarillo y el error queda logueado.

## Licencia

MIT.
