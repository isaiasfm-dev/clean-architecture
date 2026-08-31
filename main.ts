import { createContainer } from "#composition/container";
import { buildServer } from "#infrastructure/http/server";

const server = buildServer(createContainer());

const address = await server.listen({ port: 3000 });

console.log(`Server listening at ${address}`);
