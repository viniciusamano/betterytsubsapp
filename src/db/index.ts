import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Deliberately not throwing here if DATABASE_URL is missing: this module is
// imported at the top of Server Actions, and an error thrown at import time
// surfaces to the user as an opaque framework error page instead of the
// friendly, specific message those actions return. `postgres()` connects
// lazily, so an empty string just fails the first real query — which the
// caller can catch and report.
const client = postgres(connectionString ?? "", { prepare: false });

export const db = drizzle(client, { schema });
