import "server-only";
import type { z } from "zod";
import type { worksheetPayloadSchema } from "./validators";
import type { SavedProject } from "./worksheet/types";

type Payload = z.infer<typeof worksheetPayloadSchema>["data"];

/** Các cột tách ra từ payload để liệt kê/tìm kiếm. */
export function worksheetColumns(data: Payload) {
  return {
    title: (data.ws.title || "").trim() || "Untitled worksheet",
    level: data.cfg.level,
    type: data.cfg.type,
    topic: data.cfg.topic,
    data: data as unknown as SavedProject,
  };
}
