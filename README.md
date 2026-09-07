# X Quick Block

Extensión de Chrome que añade un botón de bloqueo en la barra de acciones de cada tweet de X. Un clic lo arma (se pone rojo), el segundo bloquea. Sin pasar por el menú `...` ni por el diálogo de confirmación.

## Instalación

1. Descarga y descomprime el zip de la [última release](https://github.com/luisep92/x_quick_block/releases/latest). Deja la carpeta donde vaya a quedarse: Chrome la carga desde ahí en cada arranque.
2. Abre `chrome://extensions` y activa el **modo de desarrollador**.
3. **Cargar descomprimida** → selecciona la carpeta que contiene `manifest.json`.
4. Recarga las pestañas de x.com abiertas.

Para actualizar, descomprime encima y pulsa ↻ en la tarjeta de la extensión.

## Notas

- Bloquea vía `POST /i/api/1.1/blocks/create.json` con la cookie de sesión. Si falla, cae a un fallback que abre el menú `...` y pulsa *Bloquear* por ti.
- No pide permisos ni envía nada a terceros. Todo está en [content.js](content.js); `ARM_MS` es la ventana para el segundo clic y `BEARER` el token público del cliente web, que rara vez cambia.
- Depende de los `data-testid` del DOM de X, así que puede romperse cuando X toque su frontend. Los errores se loguean en consola con el prefijo `[X Quick Block]`.
- No hay deshacer: para desbloquear, desde el perfil o los ajustes de X.

MIT.
