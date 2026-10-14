"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, FileText, Mic, Users } from "lucide-react";
import { Candidates } from "@/components/hr/candidates";
import { Interview } from "@/components/hr/interview";
import { Vacancies } from "@/components/hr/vacancies";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function HrInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "candidates");
  const [candidateId, setCandidateId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="HR и найм" description="Вакансии, скоринг резюме и первичные собеседования — агент закрывает рутину найма." icon={<Briefcase className="h-4 w-4" />} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="candidates" className="flex-1 sm:flex-none">
            <Users /> Кандидаты
          </TabsTrigger>
          <TabsTrigger value="vacancies" className="flex-1 sm:flex-none">
            <FileText /> Вакансии
          </TabsTrigger>
          <TabsTrigger value="interview" className="flex-1 sm:flex-none">
            <Mic /> <span className="sm:hidden">Интервью</span><span className="hidden sm:inline">ИИ-собеседование</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="candidates">
          <Candidates
            onInterview={(id) => {
              setCandidateId(id);
              setTab("interview");
            }}
          />
        </TabsContent>
        <TabsContent value="vacancies">
          <Vacancies />
        </TabsContent>
        <TabsContent value="interview">
          <Interview candidateId={candidateId} onCandidateChange={setCandidateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function HrPage() {
  return (
    <Suspense>
      <HrInner />
    </Suspense>
  );
}
