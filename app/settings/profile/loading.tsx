import { AppLayout } from '@/components/app-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileLoading() {
    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto space-y-8 py-6 px-4 md:px-6">
                {/* Header Skeleton - Layout components only */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-64 md:w-80 rounded-xl" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-32 rounded-xl" />
                        <Skeleton className="h-10 w-32 rounded-xl" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main Card Shell */}
                        <Card className="border-none shadow-md bg-card/50 overflow-hidden">
                            <Skeleton className="h-1.5 w-full" />
                            <CardHeader className="pb-6 border-b border-border/40">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-40 rounded-lg" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                </div>
                                <Skeleton className="h-32 w-full rounded-2xl" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pillars Shell */}
                        <Card className="border-none shadow-md bg-card/50">
                            <CardHeader className="pb-6 border-b border-border/40">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <Skeleton className="h-6 w-48 rounded-lg" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Card className="border-none shadow-md bg-card/50">
                            <CardHeader className="pb-6 border-b border-border/40">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <Skeleton className="h-6 w-32 rounded-lg" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-6">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                ))}
                            </CardContent>
                        </Card>

                        <Skeleton className="h-56 w-full rounded-[2rem]" />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
