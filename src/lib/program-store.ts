import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  ProgramStatusSchema,
  ProgramTimelineSchema,
  READY_LEAD_TIME_MS,
  RequestSchema,
  type ListenerRequest,
  type ProgramStatus,
  type ProgramTimeline,
} from "@/lib/domain";

export interface ProgramRecord {
  id: string;
  request: ListenerRequest;
  status: ProgramStatus;
  createdAt: number;
  updatedAt: number;
  readyAt: number | null;
  startsAt: number | null;
  timeline: ProgramTimeline | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface TransitionPatch {
  readyAt?: number;
  startsAt?: number;
  timeline?: ProgramTimeline;
  errorCode?: string;
  errorMessage?: string;
}

interface ProgramRow {
  id: string;
  radio_name: string;
  message: string;
  status: string;
  created_at: number;
  updated_at: number;
  ready_at: number | null;
  starts_at: number | null;
  timeline_json: string | null;
  error_code: string | null;
  error_message: string | null;
}

export class ProgramStore {
  readonly #database: DatabaseSync;
  readonly #now: () => number;
  readonly #createId: () => string;

  constructor(
    filename = "data/crowdfm.sqlite",
    now: () => number = Date.now,
    createId: () => string = randomUUID,
  ) {
    if (filename !== ":memory:") {
      mkdirSync(dirname(filename), { recursive: true });
    }
    this.#database = new DatabaseSync(filename);
    this.#now = now;
    this.#createId = createId;
    this.#migrate();
  }

  #migrate(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        radio_name TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        ready_at INTEGER,
        starts_at INTEGER,
        timeline_json TEXT,
        error_code TEXT,
        error_message TEXT
      ) STRICT;
    `);
  }

  create(input: ListenerRequest): ProgramRecord {
    const request = RequestSchema.parse(input);
    const id = this.#createId();
    const now = this.#now();
    this.#database
      .prepare(
        `INSERT INTO programs (
          id, radio_name, message, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'QUEUED', ?, ?)`,
      )
      .run(id, request.radioName, request.message, now, now);
    return this.get(id) as ProgramRecord;
  }

  get(id: string): ProgramRecord | null {
    const row = this.#database.prepare("SELECT * FROM programs WHERE id = ?").get(id) as
      | ProgramRow
      | undefined;
    return row ? this.#fromRow(row) : null;
  }

  transition(
    id: string,
    expectedStatus: ProgramStatus,
    nextStatus: ProgramStatus,
    patch: TransitionPatch = {},
  ): ProgramRecord | null {
    ProgramStatusSchema.parse(expectedStatus);
    ProgramStatusSchema.parse(nextStatus);
    const current = this.get(id);
    if (!current || current.status !== expectedStatus) {
      return null;
    }

    const nextReadyAt = patch.readyAt ?? current.readyAt;
    const nextStartsAt = patch.startsAt ?? current.startsAt;
    const nextTimeline = patch.timeline ?? current.timeline;
    if (
      nextStatus === "READY" &&
      (nextReadyAt === null ||
        nextStartsAt !== nextReadyAt + READY_LEAD_TIME_MS ||
        nextTimeline === null)
    ) {
      throw new Error("READY requires a timeline and a start exactly 15 seconds after readyAt");
    }

    const result = this.#database
      .prepare(
        `UPDATE programs
         SET status = ?, updated_at = ?, ready_at = ?, starts_at = ?, timeline_json = ?,
             error_code = ?, error_message = ?
         WHERE id = ? AND status = ?`,
      )
      .run(
        nextStatus,
        this.#now(),
        nextReadyAt,
        nextStartsAt,
        nextTimeline ? JSON.stringify(ProgramTimelineSchema.parse(nextTimeline)) : null,
        patch.errorCode ?? current.errorCode,
        patch.errorMessage ?? current.errorMessage,
        id,
        expectedStatus,
      );

    return result.changes === 1 ? this.get(id) : null;
  }

  close(): void {
    this.#database.close();
  }

  #fromRow(row: ProgramRow): ProgramRecord {
    return {
      id: row.id,
      request: RequestSchema.parse({ radioName: row.radio_name, message: row.message }),
      status: ProgramStatusSchema.parse(row.status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readyAt: row.ready_at,
      startsAt: row.starts_at,
      timeline: row.timeline_json ? ProgramTimelineSchema.parse(JSON.parse(row.timeline_json)) : null,
      errorCode: row.error_code,
      errorMessage: row.error_message,
    };
  }
}

declare global {
  var crowdFmProgramStore: ProgramStore | undefined;
}

export function getProgramStore(): ProgramStore {
  globalThis.crowdFmProgramStore ??= new ProgramStore(process.env.CROWDFM_DATABASE_PATH);
  return globalThis.crowdFmProgramStore;
}
