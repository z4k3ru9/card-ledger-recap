import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const openapiPath = path.join(root, 'docs/packtally/openapi.yaml');
const inventoryPath = path.join(root, 'docs/packtally/route-inventory.json');
const openapi = fs.readFileSync(openapiPath, 'utf8');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

const documentedRoutes = [...openapi.matchAll(/^  (\/[^:]+):\s*$/gm)].map((match) => match[1]);
const routeStatuses = inventory.routes ?? {};
const allowedStatuses = new Set(['implemented', 'design-only']);
const failures = [];

for (const route of documentedRoutes) {
  if (!(route in routeStatuses)) {
    failures.push(`Missing inventory status for ${route}`);
    continue;
  }
  if (!allowedStatuses.has(routeStatuses[route])) {
    failures.push(`Invalid inventory status for ${route}: ${routeStatuses[route]}`);
  }
}

for (const route of Object.keys(routeStatuses)) {
  if (!documentedRoutes.includes(route)) {
    failures.push(`Inventory route is absent from OpenAPI: ${route}`);
  }
}

if (failures.length > 0) {
  console.error('PackTally contract guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const implemented = documentedRoutes.filter((route) => routeStatuses[route] === 'implemented');
const designOnly = documentedRoutes.filter((route) => routeStatuses[route] === 'design-only');
console.log(`PackTally contract inventory passed: ${implemented.length} implemented, ${designOnly.length} design-only.`);
