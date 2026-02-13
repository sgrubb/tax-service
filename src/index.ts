import { createApp } from "./app";
import { createStore } from "./store/store";
import { logger } from "./logger";

const PORT = process.env.PORT ?? 3000;
const store = createStore();
const app = createApp(store);

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
