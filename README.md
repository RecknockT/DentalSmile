# DentalSmile

Aplicación web para gestión de clínica dental, construida con React, Vite y Supabase.

## Stack

- **React 19** + **React Router** para la interfaz y navegación
- **Vite** como bundler y servidor de desarrollo
- **Supabase** como backend (base de datos, autenticación, storage)

## Requisitos previos

- Node.js 20.19+ o 22.12+
- Una cuenta y proyecto de [Supabase](https://supabase.com)

## Configuración

1. Instalá las dependencias:
   ```bash
   npm install
   ```

2. Creá un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase (este archivo está excluido del repositorio, nunca lo subas a git):
   ```
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

3. Iniciá el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | Corre ESLint sobre el proyecto |

## Estructura del proyecto

```
├── public/       # Archivos estáticos
├── src/          # Código fuente de la aplicación
├── supabase/     # Configuración/migraciones de Supabase
```
