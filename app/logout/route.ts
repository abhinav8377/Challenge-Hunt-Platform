import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/?loggedOut=1", req.url));
}

export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/?loggedOut=1", req.url));
}
