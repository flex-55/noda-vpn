import { app } from "./app.js";
import { env } from "./lib/config/env.js";
import { logger } from "./lib/logger/logger.js";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Checkout API listening");
});
