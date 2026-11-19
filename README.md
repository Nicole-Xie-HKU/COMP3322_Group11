# HKUPlan — COMP3322 Group 11

HKUPlan lets students build a timetable, save schedules and find walking routes between classes.

HKUPlan is already running on the HKU server.

**Website (HKUVPN required)** · [http://c3322-pg11.cs.hku.hk](http://c3322-pg11.cs.hku.hk)

You only need the instructions below if you want to rebuild the deployment.

## Rebuild on the school server

On the existing server, run these commands in `/home/ubuntu/hkuplan`. This directory contains the deployed source. Using the same directory lets Compose reuse the saved schedules and credentials.

```sh
cd /home/ubuntu/hkuplan
docker compose up -d --build
```

For a fresh installation, the server needs Git and Docker with the Compose plugin. Clone the deployed version from GitHub and start it with Compose.

```sh
cd /home/ubuntu
git clone https://github.com/Nicole-Xie-HKU/COMP3322_Group11.git hkuplan
cd hkuplan
git checkout --detach 4505246
docker compose up -d --build
```

Compose creates the database passwords and signing secret on first start, imports the bundled course data into MySQL and serves the site on port 80. No `.env` file, API key or TLS certificate is required.
