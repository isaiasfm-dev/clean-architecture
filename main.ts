import { getHealthStatus } from "./src/shared/health.js";

console.log(`Status ${getHealthStatus()}, Timestamp: ${new Date().toISOString()}`);
