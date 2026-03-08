import { ResumeData } from '@/lib/scrapers/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ResumePreviewProps {
  resumeData: ResumeData;
}

export function ResumePreview({ resumeData }: ResumePreviewProps) {
  return (
    <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
          📄 Extracted Profile
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed">
          {resumeData.summary
            ? resumeData.summary.length > 150
              ? resumeData.summary.slice(0, 150) + '...'
              : resumeData.summary
            : 'No summary found.'}
        </p>
      </div>

      {resumeData.experience && resumeData.experience.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">💼 Experience</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {resumeData.experience.map((exp, i) => (
              <Card
                key={i}
                className="bg-background/50 backdrop-blur-sm border-border/40 hover:border-primary/50 transition-colors"
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-semibold">
                    {exp.company || 'Unknown Company'}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-foreground/80">
                    {exp.role || 'Unknown Role'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground font-mono mb-3">
                    {exp.duration || ''}
                  </p>
                  {exp.skills && exp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.skills.map((s, j) => (
                        <Badge
                          key={j}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-transparent border border-border"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {resumeData.education && resumeData.education.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">🎓 Education</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {resumeData.education.map((edu, i) => (
              <Card
                key={i}
                className="bg-background/50 backdrop-blur-sm border-border/40 hover:border-primary/50 transition-colors"
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-semibold">
                    {edu.institution || 'Unknown Institution'}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-foreground/80">
                    {edu.degree || 'Unknown Degree'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-muted-foreground font-mono">{edu.year || ''}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h3 className="font-semibold mb-2">🎯 Extracted Skills ({resumeData.skills.length})</h3>
      <div className="flex flex-wrap gap-1">
        {resumeData.skills.map((skill, i) => (
          <Badge
            key={i}
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  );
}
