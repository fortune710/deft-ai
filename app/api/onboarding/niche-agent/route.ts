import { NextRequest, NextResponse } from "next/server";
import { nicheDiscoveryWorkflow } from "@/lib/ai/agents/niche-discovery-graph";
import { getCheckpointer } from "@/lib/ai/agents/checkpointer";
import { Command } from "@langchain/langgraph";
import { NicheAgentStreamEvent } from "@/types/niche-agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const { action, niche, answers, threadId: existingThreadId } = await req.json();
    const threadId = existingThreadId || crypto.randomUUID();
    const config = { configurable: { thread_id: threadId } };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: NicheAgentStreamEvent) => {
                controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`));
            };

            try {
                const checkpointer = await getCheckpointer();
                const compiledGraph = nicheDiscoveryWorkflow.compile({ checkpointer });

                let input: any = null;
                if (action === "start") {
                    input = { initialNiche: niche };
                } else if (action === "resume") {
                    // Resume with user answers
                    input = new Command({ resume: answers });
                }

                // Stream the graph execution
                const eventStream = compiledGraph.stream(input, {
                    ...config,
                    streamMode: "updates",
                });

                for await (const update of await eventStream) {
                    // Extract updates from the "analyze" node or "awaitUser" node
                    if (update.analyze) {
                        const { reasoningSteps, questions, isComplete, finalNicheDescription } = update.analyze;

                        if (reasoningSteps) {
                            for (const step of reasoningSteps) {
                                sendEvent({
                                    type: 'reasoning_step',
                                    data: { content: step, id: crypto.randomUUID() }
                                });
                            }
                        }

                        if (isComplete) {
                            sendEvent({
                                type: 'final_result',
                                data: {
                                    detailedNiche: finalNicheDescription || "",
                                    reasoningSummary: reasoningSteps?.join(" ") || "",
                                }
                            });
                        } else if (questions && questions.length > 0) {
                            sendEvent({
                                type: 'questions',
                                data: { questions, threadId }
                            });
                        }
                    }
                }
            } catch (error: any) {
                console.error("Agent Error:", error);
                sendEvent({ type: 'error', data: { message: error.message } });
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
