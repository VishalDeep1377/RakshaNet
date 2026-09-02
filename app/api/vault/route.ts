import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get("id");

    if (!incidentId) {
      return NextResponse.json({ error: "Missing incident ID" }, { status: 400 });
    }

    // Use service role to delete the incident (cascades to evidence_chunks)
    const { error } = await supabase
      .from("incidents")
      .delete()
      .eq("id", incidentId);

    if (error) {
      console.error("Delete incident error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get("id");

    if (!incidentId) {
      return NextResponse.json({ error: "Missing incident ID" }, { status: 400 });
    }

    // Fetch full report
    const { data: incident, error: incidentErr } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    if (incidentErr) throw incidentErr;

    const { data: chunks, error: chunksErr } = await supabase
      .from("evidence_chunks")
      .select("*")
      .eq("incident_id", incidentId)
      .order("chunk_index");

    if (chunksErr) throw chunksErr;

    return NextResponse.json({
      incident,
      evidence_chunks: chunks,
      exported_at: new Date().toISOString(),
      verified: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
