import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import * as pg from "pg";

const { Pool } = pg;

let checkpointer: PostgresSaver | null = null;

export async function getCheckpointer() {
    if (checkpointer) return checkpointer;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }

    const pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000, // Increased for production stability
        ssl: {
            rejectUnauthorized: false, // Required for most hosted Postgres providers like Supabase/Neon
        }
    });

    checkpointer = new PostgresSaver(pool);

    // Create tables if they don't exist
    await checkpointer.setup();

    return checkpointer;
}
