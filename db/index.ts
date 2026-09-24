import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

const url = process.env.DATABASE_URL;

// Không throw lúc import (để `next build` chạy được khi chưa có env), chỉ báo lỗi khi thực sự truy vấn.
export const db: DB = url
  ? drizzle(neon(url), { schema })
  : new Proxy({} as DB, {
      get() {
        throw new Error("DATABASE_URL chưa được cấu hình (xem .env.example)");
      },
    });
