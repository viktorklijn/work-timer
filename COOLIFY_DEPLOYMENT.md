# Coolify Deployment Guide 🚀

Deploying the **Work Timer** app to your Coolify instance using Docker is fully supported. I've configured a multi-stage `Dockerfile` optimized for Next.js standalone mode and Prisma SQLite.

## Prerequisites
1. Push your repository to GitHub/GitLab.
2. Ensure you have your Coolify instance running and connected to your repository.

## Deployment Steps

1. In your Coolify dashboard, create a **New Resource** -> **Application** -> choose your Git repository.
2. For the Build Pack, select **Docker** (Coolify will automatically detect the `Dockerfile` at the root of the project).
3. In the configuration settings for the app, navigate to the **Storage / Volumes** section.
4. Since we are using an SQLite database, we must persist the database file so it survives rebuilds.
   - Add a new volume mount.
   - **Host Path**: Leave blank or set to a host location (e.g. `/data/coolify/work-timer/data`).
   - **Container Path**: `/app/data` (This is critical: our `Dockerfile` expects the persistent volume to be mapped here!).
5. In the **Environment Variables** section, check that no conflicting variables exist. The `Dockerfile` natively sets:
   - `DATABASE_URL="file:/app/data/dev.db"`
   - `PORT=3000`
6. Click **Deploy**.

## How the Database Works
- When the Docker container boots up for the very first time, it runs `npx prisma db push`.
- This command reads your Prisma schema and automatically creates the `dev.db` SQLite database file inside the `/app/data/` volume.
- All your timer entries will be safely written to this volume, meaning if you deploy a new version of the app later, your data won't be lost!

---
*Happy tracking! Let me know if you run into any permission issues on the volume!*
