# Audiolibros de Aurora

Aplicacion web sencilla para crear una biblioteca de cuentos con audio, sincronizar frases y ofrecer una experiencia de escucha y lectura para ninas y ninos.

Es 100% estatica: no hay servidor, base de datos ni cuentas. Cada cuento es un archivo `.cuento` autocontenido, y los cuentos publicados viven en el propio repo.

## Modos

### Modo Aurora (por defecto)

Pensado para una nena que todavia no lee:

- grilla de portadas grandes; tocar una abre el cuento
- solo aparecen los cuentos con todos los tiempos marcados
- el reproductor muestra una frase a la vez, grande, con una letra pensada para primeros lectores (Andika)
- boton grande de play/pausa, barra de progreso sin saltos accidentales, pantalla siempre encendida mientras suena
- los cuentos sin portada muestran una tapa de color con la primera letra del titulo

Para entrar al modo admin hay que mantener apretado el candado de arriba a la derecha unos 2 segundos.

### Modo admin

- lista de cuentos con su estado (listo para Aurora, frases sin marcar, publicado o solo en este dispositivo)
- crear cuentos con titulo, "leido por", audio, portada opcional y texto
- editor para marcar tiempos, editar frases, titulo, narrador y portada (todo se guarda solo)
- exportar e importar archivos `.cuento`

## Stack tecnico

- React + Vite
- Tailwind CSS
- React Router (con `HashRouter`, para funcionar en cualquier hosting estatico)
- Fuentes Nunito (interfaz) y Andika (texto de los cuentos), incluidas en el build
- fflate (zip) + IndexedDB

## El formato `.cuento`

Un `.cuento` es un zip con:

```text
manifest.json   version del formato, id, titulo, fechas y frases con sus tiempos
audio.<ext>     la pista de audio (mp3, m4a, ogg, ...)
cover.<ext>     portada opcional
```

Ejemplo de `manifest.json`:

```json
{
  "format": "cuento",
  "version": 1,
  "id": "3440e5c8-17ce-43b7-a8fd-ed60d8f73c90",
  "title": "El dragon dormilon",
  "narrator": "la abuela",
  "createdAt": "2026-10-31T12:00:00.000Z",
  "updatedAt": "2026-10-31T12:00:00.000Z",
  "audio": "audio.m4a",
  "cover": "cover.png",
  "segments": [
    { "text": "Habia una vez un dragon muy dormilon.", "start": 0, "end": 2.6 },
    { "text": "Y se durmio feliz.", "start": 2.6, "end": null }
  ]
}
```

El `id` identifica al cuento: si se abre o publica un archivo con el mismo `id`, reemplaza a la version anterior. La lectura y escritura del formato esta en `src/lib/cuentoFormat.js`.

## Donde viven los cuentos

- **Catalogo publicado:** todo `.cuento` dentro de `public/cuentos/` se publica con el sitio. Al arrancar `npm run dev` o `npm run build` se genera `public/cuentos/index.json` y se extraen las portadas (ambos ignorados por git), asi la biblioteca lista los cuentos sin descargarlos. En desarrollo, agregar o cambiar un archivo actualiza la biblioteca sola.
- **En el dispositivo:** los cuentos creados, editados o abiertos desde un archivo se guardan en IndexedDB del navegador. Los cuentos publicados que se escucharon tambien quedan guardados, y se vuelven a descargar solo si el archivo cambio.

Si un cuento publicado tiene cambios locales, en la biblioteca se ve la version local (con una etiqueta en modo admin). Desde el editor se pueden descartar esos cambios.

### Que tanto duran los datos en el navegador

La app pide almacenamiento persistente (`navigator.storage.persist()`). En iPhone/iPad, Safari borra los datos de sitios que no se usan en unos 7 dias, salvo que la app este agregada a la pantalla de inicio (Compartir > Agregar a inicio). Igual, el archivo `.cuento` siempre sirve de respaldo.

## Flujo para crear y publicar un cuento

1. Activa el modo admin (mantener apretado el candado) y toca `Nuevo`
2. Carga titulo, "leido por", audio, portada opcional y texto
3. En el editor, dale play y toca `Siguiente frase` justo cuando empieza cada una (en la compu: espacio = play/pausa, flecha derecha o Enter = siguiente frase, flecha izquierda = volver 3 s)
4. Si una frase quedo mal marcada, volve unos segundos y tocala de nuevo, o editala con el lapiz
5. Toca `Compartir .cuento`: en el celular abre el menu para compartir (WhatsApp, mail...); donde no se puede, se descarga el archivo
6. Quien publica (con acceso al repo) sube el archivo a `public/cuentos`: desde la app (`¿Publicas vos? Subilo a GitHub`), arrastrandolo en la pagina de la carpeta en GitHub y tocando `Commit changes`, o con un commit normal. En uno o dos minutos el sitio se vuelve a publicar con el cuento

Si el audio estaba mal, en el editor se cambia con `Cambiar audio`. Los tiempos se mantienen; si es otra grabacion, conviene `Borrar todos los tiempos` y marcarlos de nuevo.

Para corregir un cuento publicado: editalo y volve a compartir el `.cuento`. El archivo sale con el mismo nombre que el publicado, asi que al subirlo lo reemplaza. Cuando el sitio ya tiene esa version, la app lo muestra como `Publicado` otra vez.

Si en `public/cuentos` quedan dos archivos con el mismo cuento (mismo `id`), se publica el mas nuevo y el build avisa cual sobra.

## Publicacion en GitHub Pages

El workflow `.github/workflows/deploy.yml` publica el sitio en cada push a `main`. Solo hay que activarlo una vez: en GitHub, `Settings > Pages > Source: GitHub Actions`. El sitio queda en `https://<usuario>.github.io/<repo>/`.

El repo es publico, asi que los cuentos publicados tambien lo son. Como el sitio es estatico, tambien funciona en Cloudflare Pages, Netlify o cualquier hosting: alcanza con subir `dist/`.

Tamanos: GitHub no acepta archivos de mas de 100 MB y conviene que el repo no pase de 1 GB. Un cuento de pocos minutos en mp3/m4a pesa unos pocos MB.

## Configuracion local

```bash
npm install
npm run dev
```

Luego abre [`http://localhost:5173`](http://localhost:5173).

## Scripts disponibles

- `npm run dev`: servidor de desarrollo
- `npm run build`: build de produccion en `dist/`
- `npm run preview`: sirve la build localmente
- `npm run lint`: ESLint

## Estructura del proyecto

```text
public/
  cuentos/              cuentos publicados (*.cuento)
  manifest.webmanifest  datos para instalar la app
scripts/
  cuentosCatalog.js     genera public/cuentos/index.json
src/
  components/
  contexts/             modo admin
  lib/
    cuentoFormat.js     leer y escribir .cuento
    storyApi.js         API que usan las paginas (catalogo + dispositivo)
    storyStorage.js     IndexedDB
  pages/
    HomePage.jsx        biblioteca
    UploadPage.jsx      crear cuento
    EditorPage.jsx      sincronizacion y edicion
    PlayerPage.jsx      reproductor
  utils/
```

## Notas de implementacion

### Separacion en frases

La app usa una separacion basica por `.`, `!` y `?`.

### Logica de sincronizacion

Se asume flujo secuencial:

- hacer clic en la frase `N` define su inicio
- la frase `N - 1` recibe el mismo tiempo como fin
- una frase activa cumple `inicio <= tiempoActual < fin` (si `fin` es `null`, se trata como infinito)

### Modo admin

Es solo un interruptor guardado en `localStorage`, escondido detras de una pulsacion larga para que una nena no lo active sin querer. No protege nada, porque no hay nada en un servidor: lo publicado solo cambia con un push al repo.

## Pendiente

- funcionamiento sin conexion de la app en si (service worker); hoy los cuentos ya escuchados quedan guardados, pero la pagina necesita conexion para abrir
- recorte o edicion avanzada de imagenes
