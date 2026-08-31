import { buildAppContext, createContainer } from "#composition/container";
import { config } from "#composition/config";
import { buildServer } from "#infrastructure/http/server";

const context = buildAppContext(config);
const container = createContainer(context);
const server = buildServer(container);

const address = await server.listen({ port: config.PORT });

console.log(`Server listening at ${address}`);
