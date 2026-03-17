import { cn } from "@/lib/utils"

const features = [
    {
        title: "Niche DNA Onboarding",
        body: `Set it once, benefit forever.
        Deft builds a deep profile of your positioning, audience, content pillars, 
        and voice. Every output — scripts, 
        hooks, captions — is calibrated to sound like you, not a robot.`, 
        className: "lg:col-span-3"  
    },
    {
        title: "30-Day Content Pipeline",
        body: `Your entire month, planned in minutes.
        Get a cross-platform content calendar packed with converting hooks, 
        video structures, captions, 
        and CTAs — generated and ready before your week even starts.`,
        className: "lg:col-span-2"
    },
    {
        title: "Script & Creative Generation",
        body: `From blank page to ready-to-record.
        Deft writes full scripts optimized for watch time, retention, 
        and conversion — not just "good writing." 
        Every script is structured around what actually keeps viewers watching.`,
        className: "lg:col-span-2"
    },
    {
        title: "Weekly Performance Debriefs",
        body: `Know exactly what to do next.
        Deft analyzes your content performance and delivers a clear, 
        prescriptive weekly debrief: what worked, what didn't, 
        and exactly what to change. No more guessing why something flopped.`,
        className: "lg:col-span-3"
    }
]


export default function Features() {
    return (
        <section className="py-20">
          <div className="mb-16 text-center">
            <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">Everything you need.</h2>
                <h2 className="text-2xl font-semibold font-alan-sans sm:text-3xl md:text-4xl">Nothing you don&apos;t.</h2>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-lexend-deca text-muted-foreground">
                Built around how creators actually work
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {
                features.map((feature) => (
                    <div 
                        key={feature.title} 
                        className={cn("rounded-lg border border-border/40 bg-muted/30 p-6 transition-all hover:border-primary/40 hover:bg-muted/50", feature.className)}
                    >
                        <h3 className="mb-2 font-bold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {feature.body}
                        </p>
                    </div>
                ))
            }
          </div>
        </section>
    )
}