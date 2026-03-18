export default function Solution() {
    return (
        <section className='py-32 space-y-16 text-center bg-primary/5 rounded-[4rem] px-8 border border-primary/10'>
            <div className="space-y-4">
                <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm">Introducing Deft</span>
                <h2 className="text-4xl md:text-7xl font-bold font-alan-sans tracking-tight">One System. <br className="md:hidden" /> Every Step. <br /> <span className="text-muted-foreground italic">Zero Guesswork.</span></h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
                <p className="text-xl md:text-2xl font-lexend-deca text-muted-foreground leading-relaxed">
                    Deft isn&apos;t another AI writing tool. It&apos;s your always-on content operator{" "}
                    — automating the planning, scripting,{" "}
                    and optimization work that eats your time and stalls your growth.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold font-alan-sans underline decoration-primary decoration-4">Personalized DNA</h3>
                        <p className="font-lexend-deca text-muted-foreground">It builds a strategy based on your niche, goals, and voice—getting sharper the longer you use it.</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold font-alan-sans underline decoration-primary decoration-4">Automated Pipeline</h3>
                        <p className="font-lexend-deca text-muted-foreground">Generates a 30-day multi-platform pipeline and writes scripts tuned specifically for retention.</p>
                    </div>
                </div>

                <div className="pt-8">
                    <p className="text-xl md:text-2xl font-bold font-alan-sans text-primary">
                        You stay in your zone of genius. Deft handles the rest.
                    </p>
                </div>
            </div>
        </section>
    )
}