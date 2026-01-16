import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentAnalytics } from '@/types/content-analytics';
import { SimpleProgress } from '@/components/content-analytics/simple-progress';

function scoreColor(score: number) {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
}
  
export function AnalysisPanel({ item }: { item: ContentAnalytics }) {
    const feedback = item.analysis_results || item.ai_feedback;
  
    if (!feedback) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No analysis results yet (still processing or failed).
          </CardContent>
        </Card>
      );
    }
  
    const hookExcerpt = feedback.hook_analysis?.transcript_excerpt || feedback.hook_analysis?.text_excerpt;
  
    return (
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hook">Hook</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="tips">Tips</TabsTrigger>
        </TabsList>
  
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Score</span>
                  <span className={`text-2xl font-bold ${scoreColor(feedback.overall_score ?? 0)}`}>
                    {feedback.overall_score ?? 0}/10
                  </span>
                </div>
                <SimpleProgress value={(feedback.overall_score ?? 0) * 10} className="h-2" />
              </div>
  
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Hook</span>
                    <span className={`font-semibold ${scoreColor(feedback.hook_analysis?.score ?? 0)}`}>
                      {feedback.hook_analysis?.score ?? 0}/10
                    </span>
                  </div>
                  <SimpleProgress value={(feedback.hook_analysis?.score ?? 0) * 10} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Content</span>
                    <span className={`font-semibold ${scoreColor(feedback.content_quality?.score ?? 0)}`}>
                      {feedback.content_quality?.score ?? 0}/10
                    </span>
                  </div>
                  <SimpleProgress value={(feedback.content_quality?.score ?? 0) * 10} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
  
        <TabsContent value="hook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hook Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hookExcerpt ? (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    {item.content_type === 'video' ? 'Opening (First seconds)' : 'Opening Lines'}
                  </p>
                  <p className="text-sm italic">"{hookExcerpt}"</p>
                </div>
              ) : null}
  
              {feedback.hook_analysis?.strengths?.length ? (
                <div>
                  <p className="font-medium mb-2">Strengths</p>
                  <ul className="space-y-1 text-sm">
                    {feedback.hook_analysis.strengths.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
  
              {feedback.hook_analysis?.improvements?.length ? (
                <div>
                  <p className="font-medium mb-2">Improvements</p>
                  <ul className="space-y-1.5 text-sm">
                    {feedback.hook_analysis.improvements.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch w-1 rounded-sm bg-red-500'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
  
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.content_quality?.highlights?.length ? (
                <div>
                  <p className="font-medium mb-2">Highlights</p>
                  <ul className="space-y-1 text-sm">
                    {feedback.content_quality.highlights.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
  
              {feedback.content_quality?.issues?.length ? (
                <div>
                  <p className="font-medium mb-2">Issues</p>
                  <ul className="space-y-1.5 text-sm">
                    {feedback.content_quality.issues.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch w-1 rounded-sm bg-red-500'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
  
              {feedback.content_quality?.pacing_notes ? (
                <div className="border-t pt-4">
                  <p className="font-medium mb-2">Pacing Notes</p>
                  <p className="text-sm text-muted-foreground">{feedback.content_quality.pacing_notes}</p>
                </div>
              ) : null}
  
              {feedback.content_quality?.structure_notes ? (
                <div className="border-t pt-4">
                  <p className="font-medium mb-2">Structure Notes</p>
                  <p className="text-sm text-muted-foreground">{feedback.content_quality.structure_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
  
        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedback.retention_tips?.suggestions?.length ? (
                <div>
                  <p className="font-medium mb-2">Suggestions</p>
                  <ul className="space-y-1 text-sm">
                    {feedback.retention_tips.suggestions.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
  
              {feedback.next_video_recommendations?.length ? (
                <div className="border-t pt-4">
                  <p className="font-medium mb-2">Next Content Recommendations</p>
                  <ul className="space-y-1 text-sm">
                    {feedback.next_video_recommendations.map((s, idx) => (
                      <li className='flex items-center gap-2' key={idx}>
                        <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-primary'/>
                        <span className='py-0.5'>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  }