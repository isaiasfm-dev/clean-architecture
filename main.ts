// main.ts
import { buildAppContext, createContainer } from "#composition/container";
import { toPinoLoggerOptions } from "#composition/adapterOptions";
import { config } from "#composition/config";
import { buildServer } from "#infrastructure/http/server";
import { LoggerFactory } from "#infrastructure/observability/LoggerFactory";

const logger = LoggerFactory.createLogger(toPinoLoggerOptions(config));
const context = buildAppContext(config, logger);
const container = createContainer(context);
const server = buildServer(container, logger.child({ operation: "http.server" }));

const address = await server.listen({ port: config.PORT });

logger.info("server listening", { operation: "http.server.listen", address });
