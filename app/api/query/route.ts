// TEE query route — proxies a vault question to the 0G Compute Router.
//
// The Router is OpenAI-compatible. The `sk-` API key stays server-side; the
// browser never sees it. Retrieval over the decrypted vault happens client-
// side and is passed in as `context`; the Router runs only the attested LLM
// step and returns a TEE attestation in `x_0g_trace`.

const ROUTER_URL = "https://router-api.0g.ai/v1/chat/completions";
const DEFAULT_MODEL = "zai-org/GLM-5-FP8";

type QueryBody = {
  question?: unknown;
  context?: unknown;
  model?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.OG_ROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OG_ROUTER_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: QueryBody;
  try {
    body = (await request.json()) as QueryBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json({ error: "`question` is required" }, { status: 400 });
  }
  const context = typeof body.context === "string" ? body.context : "";
  const model = typeof body.model === "string" ? body.model : DEFAULT_MODEL;

  const messages = [
    {
      role: "system",
      content:
        "You answer strictly from the provided vault context. If the answer is not in the context, say you cannot find it.",
    },
    {
      role: "user",
      content: context
        ? `Vault context:\n${context}\n\nQuestion: ${question}`
        : question,
    },
  ];

  let res: Response;
  try {
    res = await fetch(ROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, verify_tee: true }),
    });
  } catch (err) {
    return Response.json(
      { error: "Could not reach the 0G Compute Router", detail: String(err) },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text();
    return Response.json(
      { error: "Router request failed", status: res.status, detail },
      { status: 502 },
    );
  }

  const data = await res.json();
  const trace = data.x_0g_trace ?? null;

  return Response.json({
    answer: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? model,
    teeVerified: trace?.tee_verified ?? null,
    provider: trace?.provider ?? null,
    requestId: trace?.request_id ?? null,
    // total_cost is in neuron (1e18 neuron = 1 OG)
    costNeuron: trace?.billing?.total_cost ?? null,
  });
}
