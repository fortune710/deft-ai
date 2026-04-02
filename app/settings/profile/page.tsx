'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentProfile } from '@/hooks/use-content-profile';
import {
  User,
  Target,
  TrendingUp,
  Edit,
  Sparkles,
  Zap,
  Users,
  Compass,
  MessageSquare,
  Globe,
  Radio,
  Layout,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { profile, isLoading } = useContentProfile();

  useEffect(() => {
    if (!isLoading && !profile && router) {
      router.push('/onboarding');
    }
  }, [isLoading, profile, router]);

  const renderSkeletonTextLoading = () => (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4 md:px-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 md:w-80" />
          <Skeleton className="h-6 w-48 shadow-sm" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl bg-card overflow-hidden">
            <div className="h-1.5 w-full bg-muted animate-pulse" />
            <CardHeader className="pb-6 border-b border-border/40">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <Skeleton className="h-3 w-40" />
                <div className="space-y-2.5 p-6 rounded-2xl bg-muted/20 border border-border/20">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-[94%]" />
                  <Skeleton className="h-5 w-[88%]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-3 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card overflow-hidden">
            <CardHeader className="pb-6 border-b border-border/40">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-7 w-56" />
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4 p-5 border border-border/40 rounded-2xl">
                    <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                    <div className="space-y-2.5 flex-1 pt-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-card overflow-hidden">
            <CardHeader className="pb-6 border-b border-border/40">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-2 w-20" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
              <div className="space-y-3">
                <Skeleton className="h-2 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-28 rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          {renderSkeletonTextLoading()}
        </div>
      </AppLayout>
    );
  }

  if (!profile || !profile.completed_at) {
    return null;
  }

  const detailedNiche = typeof profile.question_1_niche === 'string'
    ? { niche: profile.question_1_niche, subNiche: 'N/A', contentPillars: [], targetAudience: 'N/A', tone: 'N/A', doesCurrentAffairs: 'never' as const }
    : profile.question_1_niche;

  const contentPillars = detailedNiche?.contentPillars || (detailedNiche as any)?.content_pillars || [];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 py-6 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight font-alan-sans bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Content Profile
            </h1>
            <p className="text-muted-foreground font-inter text-lg">Your personalized creator DNA and strategy</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/onboarding')}
              variant="default"
              className="rounded-xl shadow-lg shadow-primary/20 font-lexend-deca bg-primary hover:bg-primary/90 h-11"
            >
              <Edit className="w-4 h-4 mr-2" />
              Redefine Niche
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Detailed Niche Strategy Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-none shadow-2xl bg-card overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                  <Sparkles className="w-40 h-40" />
                </div>
                <CardHeader className="pb-6 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                      <Compass className="w-7 h-7" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-lexend-deca tracking-tight">Niche Strategy</CardTitle>
                      <CardDescription className="text-muted-foreground font-inter text-sm">
                        The specific high-potential segment identified for your brand
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] font-lexend-deca flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        Main Niche
                      </div>
                      <div className="text-xl font-semibold font-alan-sans p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 shadow-sm transition-colors hover:bg-primary/[0.05]">
                        {detailedNiche?.niche || 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] font-lexend-deca flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        Sub-Niche
                      </div>
                      <div className="text-xl font-semibold font-alan-sans p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 shadow-sm transition-colors hover:bg-primary/[0.05]">
                        {detailedNiche?.subNiche || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] font-lexend-deca flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Target Audience
                    </div>
                    <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 font-alan-sans leading-relaxed text-foreground/90 italic text-lg shadow-inner">
                      "{detailedNiche?.targetAudience || 'Describe your ideal viewer to get started...'}"
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-lexend-deca flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Tone & Personality
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detailedNiche?.tone?.split(',').map((t: string, i: number) => (
                          <Badge key={i} variant="secondary" className="px-4 py-1.5 rounded-full text-xs font-bold bg-secondary/40 text-secondary-foreground border-none capitalize tracking-wide">
                            {t.trim()}
                          </Badge>
                        )) || <span className="text-sm italic text-muted-foreground">None specified</span>}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-lexend-deca flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        Current Affairs
                      </div>
                      <div className="flex">
                        <Badge variant="outline" className="px-5 py-1.5 rounded-full text-xs font-bold capitalize border-primary/30 text-primary bg-primary/5 tracking-wider">
                          {detailedNiche?.doesCurrentAffairs || 'never'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Content Pillars Section */}
            {contentPillars.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-none shadow-xl bg-card overflow-hidden">
                  <CardHeader className="pb-6 border-b border-border/40 bg-muted/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-inner">
                        <Layout className="w-7 h-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-lexend-deca tracking-tight">Content Pillars</CardTitle>
                        <CardDescription className="text-muted-foreground font-inter text-sm">
                          Themes that will build your authority and resonance
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {contentPillars.map((pillar: string, index: number) => (
                        <div key={index} className="group flex items-start gap-4 p-5 rounded-2xl border border-border/40 bg-background hover:border-primary/40 hover:bg-primary/[0.01] hover:shadow-md transition-all duration-300">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all">
                            {index + 1}
                          </div>
                          <p className="text-[15px] font-medium text-foreground/80 font-alan-sans leading-relaxed pt-1">{pillar}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <div className="space-y-8">
            {/* Creator Overview Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="pb-6 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner">
                      <User className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-lexend-deca tracking-tight">Creator Info</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-lexend-deca">Primary Goal</div>
                      <div className="flex items-center gap-3 text-[15px] font-bold font-alan-sans bg-muted/30 p-3.5 rounded-xl border border-border/30 shadow-sm transition-colors hover:bg-muted/40">
                        <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                        {profile.question_2_goal?.replace(/_/g, ' ') || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-lexend-deca">Experience</div>
                      <div className="flex items-center gap-3 text-[15px] font-bold font-alan-sans bg-muted/30 p-3.5 rounded-xl border border-border/30 shadow-sm capitalize transition-colors hover:bg-muted/40">
                        <TrendingUp className="w-4.5 h-4.5 text-primary" />
                        {profile.question_4_experience?.replace(/_/g, ' ') || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-lexend-deca">Post Frequency</div>
                      <div className="flex items-center gap-3 text-[15px] font-bold font-alan-sans bg-muted/30 p-3.5 rounded-xl border border-border/30 shadow-sm capitalize transition-colors hover:bg-muted/40">
                        <Radio className="w-4.5 h-4.5 text-indigo-400" />
                        {profile.question_5_frequency?.replace(/_/g, ' ') || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-lexend-deca">Platform Stack</div>
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {profile.question_3_platforms.map((platform) => (
                          <Badge
                            key={platform.name}
                            variant={platform.isPrimary ? 'default' : 'secondary'}
                            className={cn(
                              "rounded-lg px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105",
                              platform.isPrimary
                                ? "bg-primary shadow-md shadow-primary/20"
                                : "bg-muted text-muted-foreground border border-border/40"
                            )}
                          >
                            {platform.name}
                            {platform.isPrimary && ' • PRIMARY'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/40" />

                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] mb-4 font-lexend-deca">Profile Stats</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-border/20">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Joined</span>
                        <span className="text-xs font-bold font-alan-sans">{new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-xl bg-muted/20 border border-border/20">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Updated</span>
                        <span className="text-xs font-bold font-alan-sans">{new Date(profile.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Regeneration Promo Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500/15 via-purple-500/5 to-transparent border border-white/10 shadow-xl relative overflow-hidden group cursor-pointer"
              onClick={() => router.push('/regenerate-profile')}
            >
              <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12 group-hover:rotate-[20deg] transition-transform duration-500">
                <Rocket className="w-32 h-32 text-indigo-500" />
              </div>
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(var(--indigo-500),0.5)]" />
                  <h3 className="text-xs font-black font-lexend-deca uppercase tracking-[0.3em] text-indigo-400">Next Evolution</h3>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold font-alan-sans">Global Strategy Refresh</h4>
                  <p className="text-base font-semibold font-alan-sans text-muted-foreground/90 leading-relaxed">
                    A smarter, faster way to pivot your niche is in development. Our next-gen AI model will help you refine your brand identity in real-time.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 font-lexend-deca group-hover:translate-x-1 transition-transform">
                  View Coming Soon <Edit className="w-4 h-4 ml-1" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
