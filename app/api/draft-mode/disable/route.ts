import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

// Exit live preview and return to the published site.
export async function GET(request: Request) {
  (await draftMode()).disable();
  return NextResponse.redirect(new URL("/", request.url));
}
