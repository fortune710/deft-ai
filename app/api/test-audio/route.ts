import { extractAudioFromVideo } from "@/lib/services/video-processor";

export async function GET() {

    const audioResult = await extractAudioFromVideo("f7017200-e556-4e59-9a8f-f0fb16903dea");
    return Response.json(audioResult);
}