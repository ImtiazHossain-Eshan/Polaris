import { NextResponse } from "next/server";
import { scoreProbability, type ProbabilityInputs, type UniversityForModel } from "@/lib/ml/probability";
import universities from "@/data/universities.json";

export const runtime = "nodejs";

type UniversityRaw = {
  id: string;
  tier: UniversityForModel["tier"];
  acceptanceRate: number;
};

export async function POST(req: Request) {
  let body: { universityId?: string; inputs?: ProbabilityInputs };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { universityId, inputs } = body;
  if (!universityId || !inputs) {
    return NextResponse.json({ error: "Missing universityId or inputs" }, { status: 400 });
  }

  const uni = (universities as UniversityRaw[]).find((u) => u.id === universityId);
  if (!uni) {
    return NextResponse.json({ error: "Unknown university" }, { status: 404 });
  }

  const result = scoreProbability(inputs, {
    id: uni.id,
    tier: uni.tier,
    acceptanceRate: uni.acceptanceRate,
  });

  return NextResponse.json(result);
}
