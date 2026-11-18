import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    return NextResponse.json({ status: "ok", database: "connected", serverTime: result.rows[0].server_time });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    return NextResponse.json({ status: "error", database: "disconnected" }, { status: 500 });
  }
}