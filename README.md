# Synced Audiobooks MVP

A simple web app for creating read-along audiobooks for children.

The current MVP lets you:

- browse a library of uploaded stories
- upload a story title, audio file, optional cover image, and full story text
- split the story into sentence-based segments
- open a sync editor for assigning sentence timestamps while audio plays
- play a synced story with highlighted read-along text
- save segment timing back to Supabase

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Howler.js for audio playback
- Supabase for database and storage

## Current App Flow

### 1. Library page: `/`

The home page shows all uploaded stories and their sync status.

Each story card includes:

- title
- cover image with fallback placeholder
- created date
- whether the story is fully synced
- synced progress like `3 / 5 segments synced`
- quick actions to open the player or editor

If there are no stories yet, the page shows an empty state with a link to upload the first story.

### 2. Upload page: `/upload`

Use the upload form to:

- enter a story title
- upload a single audio file
- optionally upload a cover image
- paste the full story text

On submit, the app:

1. uploads the audio file to Supabase Storage
2. optionally uploads the cover image to Supabase Storage
3. creates a row in the `stories` table
4. splits the story text into sentences
5. creates one row per sentence in the `segments` table
6. redirects to the sync editor

### 3. Sync editor: `/editor/:storyId`

The editor currently supports:

- loading a story and its segments from Supabase
- audio play / pause via Howler
- live playback time tracking
- clicking a segment while audio is playing to assign `start_time`
- automatically setting the previous segment's `end_time`
- active segment highlighting during playback
- manual editing of `start_time`
- saving segment timings back to Supabase

### 4. Player page: `/player/:storyId`

The player currently supports:

- loading a story and its synced segments from Supabase
- displaying the story cover image at the top with a fallback placeholder
- audio play / pause via Howler
- active sentence highlighting during playback
- smooth auto-scroll to the active sentence
- hiding unsynced segments from the reader view
- showing a "This story is not synced yet" message when timing is missing
- restart control
- last playback position persistence in `localStorage`

## Requirements

Before running the app, make sure you have:

- Node.js 20+ recommended
- npm
- a Supabase project

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your env file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in your Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_AUDIO_BUCKET=story-audio
VITE_SUPABASE_COVER_BUCKET=story-covers
```

Notes:

- `VITE_SUPABASE_AUDIO_BUCKET` defaults to `story-audio` if omitted.
- `VITE_SUPABASE_COVER_BUCKET` defaults to `story-covers` if omitted.
- the app expects a public bucket, because uploaded audio is loaded through a public URL
- the cover image bucket should also be public so the UI can render images directly by URL

## Supabase Setup

You need:

- storage buckets for audio files and optional cover images
- two tables: `stories` and `segments`

### Storage buckets

Create a bucket named `story-audio` or match whatever you set in `VITE_SUPABASE_AUDIO_BUCKET`.
Create a bucket named `story-covers` or match whatever you set in `VITE_SUPABASE_COVER_BUCKET`.

For the current MVP, make both buckets public so the browser can load audio and cover images by URL.

### Database schema

Run this SQL in Supabase SQL Editor:

```sql
create extension if not exists "pgcrypto";

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_url text not null,
  cover_image_url text,
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

create index if not exists segments_story_id_order_idx
  on segments (story_id, "order");
```

### Supabase policies

This app does not use authentication. For a quick local MVP, you can allow public access to the relevant tables and storage bucket.

If you use Row Level Security, make sure anonymous users can:

- insert into `stories`
- insert, update, and read `segments`
- read `stories`
- upload to and read from the audio storage bucket
- upload to and read from the cover image storage bucket

If you prefer speed over strict security while prototyping, you can temporarily disable RLS for these tables in your dev project.

## Running the App

Start the development server:

```bash
npm run dev
```

Then open the local URL shown by Vite, usually:

[`http://localhost:5173`](http://localhost:5173)

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Builds the production bundle into `dist/`.

```bash
npm run preview
```

Serves the production build locally.

```bash
npm run lint
```

Runs ESLint.

## Project Structure

```text
src/
  components/
    AppShell.jsx
    StoryCover.jsx
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

## Important Implementation Notes

### Sentence splitting

The MVP uses a simple regex-based sentence splitter. It is intentionally basic and splits on `.`, `!`, and `?`.

### Audio playback

The editor and player both use Howler and poll playback position with `requestAnimationFrame`.

### Timing logic

The editor assumes segments are sequential:

- clicking segment `N` sets `segment[N].start_time`
- it also sets `segment[N - 1].end_time` to the same value
- an active segment is any segment where:
  - `start_time <= currentTime < end_time`
  - if `end_time` is `null`, it is treated as open-ended

### Saving

Saving is currently done with a simple loop that updates each segment row individually. This is fine for the MVP.

## How To Use The Current MVP

1. Start the dev server with `npm run dev`
2. Open the app in your browser
3. From the library page, go to `/upload`
4. Upload a story title, audio file, optional cover image, and story text
5. Submit the form to create the story and segments
6. On the editor page, press play
7. Click each sentence when that sentence starts in the audio
8. Adjust any `start_time` manually if needed
9. Click `Save timings`
10. Open the player to verify the story highlights in sync

## Troubleshooting

### "Supabase is not configured"

Make sure your `.env` file exists and contains:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then restart the Vite dev server.

### Upload works, but audio will not play

Check:

- the storage bucket is public
- `audio_url` points to a valid public file
- the uploaded file format is supported by the browser

### Cover image does not appear

Check:

- the `stories.cover_image_url` column exists
- the cover image bucket is public
- `VITE_SUPABASE_COVER_BUCKET` matches the actual Supabase bucket name
- the image file uploaded successfully and the saved URL is valid

### Inserts or updates fail

Usually this means one of:

- the database tables do not exist yet
- RLS / policies are blocking anonymous access
- the bucket name in `.env` does not match the actual Supabase bucket

### "new row violates row-level security policy"

Your Supabase project is accepting requests, but Postgres is blocking anonymous inserts or updates.

This app runs in the browser with the low-privilege client key, so your Supabase policies must allow the `anon` role to:

- read `stories`
- insert into `stories`
- read `segments`
- insert into `segments`
- update `segments`
- upload and read from the storage bucket

For quick MVP development, you can either add permissive RLS policies or temporarily disable RLS on the app tables in your dev project.

### "JWS Protected Header is invalid"

This usually means the Supabase key in `.env` is invalid or pasted incorrectly.

Check that:

- `VITE_SUPABASE_URL` matches your project URL
- `VITE_SUPABASE_ANON_KEY` contains a valid client-side key copied from Supabase
- you restarted the dev server after editing `.env`

### The player page looks empty or shows no highlighted text

Usually this means the story has not been synced yet.

Check that:

- the story has segments with `start_time`
- you clicked `Save timings` in the editor
- your `segments` table updates are allowed by RLS

## Status

Implemented:

- home / library page
- upload page
- optional cover image upload
- sentence splitting
- Supabase storage upload
- Supabase story + segment creation
- sync editor with timestamp assignment
- manual start time editing
- timing save back to Supabase
- read-along player
- playback position persistence
- cover images in library and player

Not implemented yet:

- image editing / cropping
