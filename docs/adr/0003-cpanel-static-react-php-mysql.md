---
status: accepted
---

# Use static React with modular PHP and MySQL on cPanel

Production remains a static React PWA plus a modular PHP/MySQL application on a 1 GB RAM cPanel host. Node may build assets or run explicitly supported short jobs, but correctness cannot depend on a permanent Node process; background work uses durable database jobs and cPanel scheduling.
