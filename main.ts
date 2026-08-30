import { buildServer } from "#infrastructure/http/server";

const server = buildServer();

const address = await server.listen({ port: 3000 });

console.log(`Server listening at ${address}`);
