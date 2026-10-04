// The deployment build generates this bundled module before Vercel packages the function.
// @ts-expect-error generated server bundle has no checked-in declaration file.
import { app } from './server.mjs';

export default app;
