import "dotenv/config";

import { createApp } from "./app";
import { ENV_CONFIG } from "./shared/config/env-config";
import { logger } from "./shared/config/logger";

const PORT = ENV_CONFIG.PORT;
const app = createApp();

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
