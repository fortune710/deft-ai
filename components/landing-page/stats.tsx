export default function Stats() {
    const stats = [
        {
            value: "10+ hours",
            label: "saved per week"
        },
        {
            value: "3x increase",
            label: "consistent posting"
        },
        {
            value: "30-day plans",
            label: "generated in minutes"
        }
    ];

    return (
        <section id='stats' className="py-24">
            <div className="mb-20 text-center">
                <h2 className="font-alan-sans text-4xl md:text-5xl font-bold tracking-tight">
                    Join hundreds of creators reclaiming <br className="hidden md:block" /> hours of work back
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className='bg-muted/20 backdrop-blur-sm px-8 py-10 rounded-2xl border border-border/40 text-center flex flex-col justify-center min-h-[180px] space-y-2 hover:bg-muted/30 transition-colors shadow-sm'
                    >
                        <p className='font-bold font-lexend-deca text-4xl lg:text-5xl text-primary'>{stat.value}</p>
                        <p className='uppercase font-alan-sans text-xs tracking-widest font-bold text-muted-foreground'>{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
