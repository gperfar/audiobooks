# Audiolibros de Aurora

Aplicacion web sencilla para crear una biblioteca de cuentos con audio, sincronizar frases y ofrecer una experiencia de escucha y lectura para ninas y ninos.

## Que hace hoy la app

- muestra una biblioteca de cuentos cargados
- permite alternar entre `modo lectura` y `modo admin`
- deja subir cuentos con audio, texto y portada opcional
- separa el cuento en frases automaticamente
- permite sincronizar cada frase con el audio
- permite editar titulo, portada y texto de segmentos
- permite borrar cuentos
- reproduce el cuento con texto destacado y desplazamiento automatico
- guarda cuantas veces se escucho cada cuento

## Stack tecnico

- React + Vite
- Tailwind CSS
- React Router
- Howler.js
- Supabase Database + Storage

## Modos de uso

### Modo lectura

Pensado para la experiencia del nino o la nina que escucha el cuento.

- muestra la biblioteca
- permite entrar al reproductor
- oculta opciones de administracion
- en el reproductor no muestra el acceso a editar

### Modo admin

Pensado para gestionar el contenido.

- muestra el acceso a subir cuentos
- habilita el editor
- permite cambiar titulo y portada
- permite editar el texto de las frases
- permite borrar cuentos

El estado del modo se guarda en `localStorage`.

## Rutas principales

- `/`: biblioteca
- `/upload`: carga de cuentos, solo visible en modo admin
- `/editor/:storyId`: editor de sincronizacion, solo util en modo admin
- `/player/:storyId`: reproductor de lectura y audio

## Flujo actual

### 1. Biblioteca: `/`

La pagina principal muestra las tarjetas de cuentos.

Cada tarjeta puede incluir:

- portada
- titulo
- fecha
- indicador de sincronizacion con punto verde o gris
- contador de escuchas
- boton `Escuchar`
- boton `Editar` solo en modo admin

### 2. Carga: `/upload`

Desde modo admin puedes:

- escribir el titulo
- subir el audio
- subir una portada opcional
- pegar el texto completo del cuento

Al enviar el formulario, la app:

1. sube el audio a Supabase Storage
2. sube la portada si existe
3. crea la fila en `stories`
4. separa el texto en frases
5. crea los registros en `segments`
6. redirige al editor

### 3. Editor: `/editor/:storyId`

El editor permite:

- reproducir o pausar el audio
- ver el tiempo actual
- hacer clic en una frase para marcar su `start_time`
- cerrar automaticamente la frase anterior con `end_time`
- editar manualmente el `start_time`
- editar el texto de cada segmento
- cambiar el titulo
- cambiar la portada
- borrar el cuento
- guardar los tiempos

### 4. Reproductor: `/player/:storyId`

El reproductor ofrece una experiencia tipo cuento:

- portada del cuento
- texto grande y centrado
- frase activa destacada
- desplazamiento automatico
- boton grande fijo para reproducir o pausar
- enlace de vuelta a la biblioteca
- acceso a `Editar` solo en modo admin
- contador de escuchas
- reanudacion basica de posicion con `localStorage`

## Requisitos

Antes de ejecutar el proyecto necesitas:

- Node.js 20+ recomendado
- npm
- un proyecto de Supabase

## Configuracion local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear `.env`

```bash
cp .env.example .env
```

Contenido esperado:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_AUDIO_BUCKET=story-audio
VITE_SUPABASE_COVER_BUCKET=story-covers
```

Notas:

- `VITE_SUPABASE_AUDIO_BUCKET` usa `story-audio` por defecto
- `VITE_SUPABASE_COVER_BUCKET` usa `story-covers` por defecto
- ambos buckets deben ser publicos para que el navegador pueda cargar audio e imagenes por URL

## Configuracion de Supabase

Necesitas:

- bucket de audio
- bucket de portadas
- tabla `stories`
- tabla `segments`

### Buckets de Storage

Crea estos buckets o usa los nombres configurados en `.env`:

- `story-audio`
- `story-covers`

Para este MVP, ambos deben ser publicos.

## SQL completo recomendado

Ejecuta este bloque en el SQL Editor de Supabase para dejar la base y las policies listas para el estado actual de la app:

```sql
create extension if not exists "pgcrypto";

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_url text not null,
  cover_image_url text,
  listen_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists segments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  text text not null,
  start_time double precision,
  end_time double precision,
  "order" integer not null
);

alter table stories add column if not exists cover_image_url text;
alter table stories add column if not exists listen_count integer not null default 0;

create index if not exists segments_story_id_order_idx
  on segments (story_id, "order");

alter table stories enable row level security;
alter table segments enable row level security;

drop policy if exists "anon can read stories" on stories;
create policy "anon can read stories"
on stories
for select
to anon
using (true);

drop policy if exists "anon can insert stories" on stories;
create policy "anon can insert stories"
on stories
for insert
to anon
with check (true);

drop policy if exists "anon can update stories" on stories;
create policy "anon can update stories"
on stories
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can delete stories" on stories;
create policy "anon can delete stories"
on stories
for delete
to anon
using (true);

drop policy if exists "anon can read segments" on segments;
create policy "anon can read segments"
on segments
for select
to anon
using (true);

drop policy if exists "anon can insert segments" on segments;
create policy "anon can insert segments"
on segments
for insert
to anon
with check (true);

drop policy if exists "anon can update segments" on segments;
create policy "anon can update segments"
on segments
for update
to anon
using (true)
with check (true);

drop policy if exists "anon can delete segments" on segments;
create policy "anon can delete segments"
on segments
for delete
to anon
using (true);

drop policy if exists "anon can read story audio" on storage.objects;
create policy "anon can read story audio"
on storage.objects
for select
to anon
using (bucket_id = 'story-audio');

drop policy if exists "anon can upload story audio" on storage.objects;
create policy "anon can upload story audio"
on storage.objects
for insert
to anon
with check (bucket_id = 'story-audio');

drop policy if exists "anon can update story audio" on storage.objects;
create policy "anon can update story audio"
on storage.objects
for update
to anon
using (bucket_id = 'story-audio')
with check (bucket_id = 'story-audio');

drop policy if exists "anon can delete story audio" on storage.objects;
create policy "anon can delete story audio"
on storage.objects
for delete
to anon
using (bucket_id = 'story-audio');

drop policy if exists "anon can read story covers" on storage.objects;
create policy "anon can read story covers"
on storage.objects
for select
to anon
using (bucket_id = 'story-covers');

drop policy if exists "anon can upload story covers" on storage.objects;
create policy "anon can upload story covers"
on storage.objects
for insert
to anon
with check (bucket_id = 'story-covers');

drop policy if exists "anon can update story covers" on storage.objects;
create policy "anon can update story covers"
on storage.objects
for update
to anon
using (bucket_id = 'story-covers')
with check (bucket_id = 'story-covers');

drop policy if exists "anon can delete story covers" on storage.objects;
create policy "anon can delete story covers"
on storage.objects
for delete
to anon
using (bucket_id = 'story-covers');
```

## Ejecutar la app

```bash
npm run dev
```

Luego abre la URL local de Vite, normalmente:

[`http://localhost:5173`](http://localhost:5173)

## Scripts disponibles

```bash
npm run dev
```

Inicia el servidor de desarrollo.

```bash
npm run build
```

Genera la build de produccion en `dist/`.

```bash
npm run preview
```

Sirve localmente la build de produccion.

```bash
npm run lint
```

Ejecuta ESLint.

## Estructura del proyecto

```text
src/
  components/
    AppShell.jsx
    StoryCover.jsx
  contexts/
    AdminModeContext.jsx
    useAdminMode.js
  lib/
    storyApi.js
    supabase.js
  pages/
    HomePage.jsx
    UploadPage.jsx
    EditorPage.jsx
    PlayerPage.jsx
  utils/
    editorTiming.js
    sentenceSplit.js
  App.jsx
  main.jsx
```

## Notas de implementacion

### Separacion en frases

La app usa una separacion basica por `.`, `!` y `?`.

### Audio

Editor y reproductor usan Howler y actualizan el tiempo con `requestAnimationFrame`.

### Logica de sincronizacion

Se asume flujo secuencial:

- hacer clic en la frase `N` define `start_time`
- la frase `N - 1` recibe el mismo tiempo como `end_time`
- una frase activa cumple:
  - `start_time <= currentTime < end_time`
  - si `end_time` es `null`, se trata como infinito

### Guardado

Los tiempos de segmentos se guardan con un loop simple de updates. Para este MVP es suficiente.

### Contador de escuchas

El reproductor incrementa `listen_count` al iniciar reproduccion por primera vez en esa sesion de visita a la pagina.

## Uso sugerido

1. Inicia la app con `npm run dev`
2. Activa `Modo admin`
3. Ve a `Subir cuento`
4. Carga titulo, audio, portada opcional y texto
5. Guarda el cuento
6. Entra al editor y sincroniza frases
7. Corrige texto o titulo si hace falta
8. Guarda los tiempos
9. Cambia a `Modo lectura`
10. Abre el reproductor y prueba la experiencia final

## Solucion de problemas

### "Supabase no esta configurado"

Verifica que `.env` exista y tenga:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Luego reinicia el servidor de desarrollo.

### Error de RLS al insertar o actualizar

Suele significar que:

- faltan tablas o columnas
- faltan policies
- el rol `anon` no tiene permiso sobre `stories`, `segments` o `storage.objects`

Usa el bloque SQL completo de esta documentacion.

### La portada no aparece

Revisa:

- que exista `stories.cover_image_url`
- que `story-covers` sea publico
- que `VITE_SUPABASE_COVER_BUCKET` coincida con el nombre real del bucket

### No puedo guardar titulo, portada, texto o escuchas

Eso casi siempre indica que falta una policy `UPDATE` en `stories` o `segments`.

### No puedo borrar cuentos

Agrega policy `DELETE` para `stories`. Como `segments.story_id` usa `on delete cascade`, al borrar un cuento se borran tambien sus segmentos.

### El reproductor no muestra texto destacado

Comprueba:

- que existan `start_time` en los segmentos
- que hayas guardado los tiempos desde el editor

## Estado actual

Implementado:

- biblioteca de cuentos
- modo lectura y modo admin
- subida de cuentos
- subida y edicion de portada
- edicion de titulo
- borrado de cuentos
- separacion de frases
- sincronizacion de segmentos
- edicion de texto de segmentos
- reproductor con experiencia de lectura
- contador de escuchas
- persistencia basica de posicion

No implementado:

- recorte o edicion avanzada de imagenes
- autenticacion
