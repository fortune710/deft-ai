"use client";

import {
  createElement,
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentType,
} from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  FileText,
  Info,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useContentProfile } from "@/hooks/use-content-profile";
import { useChatSessions, useDeleteSession } from "@/hooks/use-script-chats";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilmScriptFill } from "@/components/icons/script";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-clerk-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Platform } from "@/types/content-engine";
import type { ScriptDuration } from "@/types/script-chat";
import { YoutubeLine } from "@/components/icons/youtube";
import { Instagram } from "@/components/icons/instagram";
import { BaselineTiktok } from "@/components/icons/tiktok";
import { Twitter } from "@/components/icons/twitter";
import { Linkedin } from "@/components/icons/linkedin";
import { BaselineFacebook } from "@/components/icons/facebook";

const log = logger.child({ file: "app/scripts/page.tsx" });

const primaryCtaClassName =
  "rounded-lg border border-primary/70 bg-primary gap-2.5 px-2 py-1 text-[13px] font-semibold shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.16),0_1px_3px_hsl(var(--primary)/0.2)] hover:bg-primary/90";

const toolbarButtonClassName =
  "h-8 gap-1.5 rounded-lg border-border/80 bg-background px-2 py-1 text-[13px] font-medium shadow-none hover:bg-muted";

const filterMenuItemClassName = "h-8 rounded px-2 text-xs";

const scriptPlatformOptions = [
  { value: "youtube", label: "YouTube", icon: YoutubeLine },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: BaselineTiktok },
  { value: "twitter", label: "X", icon: Twitter },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "facebook", label: "Facebook", icon: BaselineFacebook },
] satisfies Array<{
  value: Platform;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}>;

const scriptDurationLabels: Record<ScriptDuration, string> = {
  really_short: "Really short",
  medium: "Medium",
  long: "Long",
};

export default function ScriptCreatorPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: scripts, isLoading: scriptsLoading } = useChatSessions();
  const deleteScript = useDeleteSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [durationFilter, setDurationFilter] = useState<
    ScriptDuration | "all"
  >("all");
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">(
    "newest",
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredScripts = scripts
    .filter((script) => {
      const platforms = script.editor_content.platforms?.length
        ? script.editor_content.platforms
        : script.editor_content.platform
          ? [script.editor_content.platform as Platform]
          : [];
      return (
        (!normalizedSearchQuery ||
          script.title.toLocaleLowerCase().includes(normalizedSearchQuery) ||
          script.id.toLocaleLowerCase().includes(normalizedSearchQuery)) &&
        (platformFilter === "all" || platforms.includes(platformFilter)) &&
        (durationFilter === "all" ||
          script.editor_content.durationPreset === durationFilter)
      );
    })
    .sort((left, right) => {
      const difference =
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime();
      return sortDirection === "newest" ? difference : -difference;
    });
  const totalPages = Math.max(1, Math.ceil(filteredScripts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleScripts = filteredScripts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  log.debug("Rendering your scripts page", {
    action: "render_your_scripts_page",
    userId: userId || "signed_out",
    scriptCount: scripts.length,
    filteredScriptCount: filteredScripts.length,
    searchQueryLength: searchQuery.length,
    platformFilter,
    durationFilter,
    sortDirection,
    page: currentPage,
  });

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.push("/onboarding");
    }
  }, [profileLoading, profile, router]);

  const handleDeleteScript = async (scriptId: string) => {
    try {
      await deleteScript.mutateAsync(scriptId);
      toast.success("Script deleted");
      log.info("Deleted script record", {
        action: "delete_script_record",
        userId: userId || "signed_out",
        scriptId,
        statusCode: 200,
      });
    } catch (error) {
      toast.error("Failed to delete script");
      log.error("Failed to delete script record", {
        action: "delete_script_record",
        userId: userId || "signed_out",
        scriptId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleOpenScript = (contentItemId: string, scriptId: string) => {
    router.push(`/scripts/edit/${contentItemId}`);
    log.info("Opened script content editor from scripts table", {
      action: "open_script_content_editor",
      userId: userId || "signed_out",
      scriptId,
      contentItemId,
    });
  };

  const handleCreateScript = () => {
    router.push("/scripts/new");
    log.info("Opened the new script creator", {
      action: "open_new_script_creator",
      userId: userId || "signed_out",
    });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1);
    log.debug("Updated the scripts search query", {
      action: "filter_scripts_by_search",
      userId: userId || "signed_out",
      queryLength: event.target.value.length,
    });
  };

  const handlePlatformFilter = (platform: Platform | "all") => {
    setPlatformFilter(platform);
    setPage(1);
    log.debug("Updated the scripts platform filter", {
      action: "filter_scripts_by_platform",
      userId: userId || "signed_out",
      platform,
    });
  };

  const handleDurationFilter = (duration: ScriptDuration | "all") => {
    setDurationFilter(duration);
    setPage(1);
    log.debug("Updated the scripts duration filter", {
      action: "filter_scripts_by_duration",
      userId: userId || "signed_out",
      duration,
    });
  };

  const handleSortDirection = (direction: "newest" | "oldest") => {
    setSortDirection(direction);
    setPage(1);
    log.debug("Updated the scripts sort direction", {
      action: "sort_scripts_by_updated_date",
      userId: userId || "signed_out",
      direction,
    });
  };

  const handlePageChange = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    log.debug("Changed the scripts table page", {
      action: "paginate_scripts_table",
      userId: userId || "signed_out",
      page: safePage,
      totalPages,
    });
  };

  if (profileLoading || scriptsLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile || !profile.completed_at) return null;

  return (
    <AppLayout>
      <div className="-m-6 flex min-h-screen flex-col overflow-hidden border-x border-border/70 bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-5 py-2">
          <div className="flex items-center gap-2">
            <h1 className="font-alan-sans text-base font-semibold tracking-tight text-foreground">
              Your Script
            </h1>
            <Info
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-label="Create and manage your AI-powered scripts"
            />
          </div>
          <Button
            onClick={handleCreateScript}
            className={primaryCtaClassName}
            size="sm"
          >
            <CirclePlus className="h-3.5 w-3.5" />
            New Script
          </Button>
        </header>

        <div className="flex flex-col gap-2 border-b border-border/70 px-5 py-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Filter by ID or name..."
              aria-label="Filter scripts by ID or name"
              className="h-8 rounded-lg border-border/80 bg-background py-1 pl-7 pr-2 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={toolbarButtonClassName}>
                  <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                  {platformFilter === "all"
                    ? "Platform"
                    : scriptPlatformOptions.find(
                        (option) => option.value === platformFilter,
                      )?.label}
                  <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-44 rounded-lg p-1"
              >
                <DropdownMenuItem
                  onSelect={() => handlePlatformFilter("all")}
                  className={filterMenuItemClassName}
                >
                  All platforms
                  {platformFilter === "all" && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {scriptPlatformOptions.map((platform) => (
                  <DropdownMenuItem
                    key={platform.value}
                    onSelect={() => handlePlatformFilter(platform.value)}
                    className={filterMenuItemClassName}
                  >
                    {createElement(platform.icon, {
                      "aria-hidden": true,
                      className: "mr-1.5 h-3.5 w-3.5 shrink-0",
                    })}
                    {platform.label}
                    {platformFilter === platform.value && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={toolbarButtonClassName}>
                  <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                  {durationFilter === "all"
                    ? "Duration"
                    : scriptDurationLabels[durationFilter]}
                  <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-40 rounded-lg p-1"
              >
                <DropdownMenuItem
                  onSelect={() => handleDurationFilter("all")}
                  className={filterMenuItemClassName}
                >
                  All durations
                  {durationFilter === "all" && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(scriptDurationLabels).map(
                  ([duration, label]) => (
                    <DropdownMenuItem
                      key={duration}
                      onSelect={() =>
                        handleDurationFilter(duration as ScriptDuration)
                      }
                      className={filterMenuItemClassName}
                    >
                      {label}
                      {durationFilter === duration && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`${toolbarButtonClassName} lg:ml-auto`}
              >
                <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                Order by{" "}
                {sortDirection === "newest"
                  ? "Newest → Oldest"
                  : "Oldest → Newest"}
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 rounded-lg p-1"
            >
              <DropdownMenuItem
                onSelect={() => handleSortDirection("newest")}
                className={filterMenuItemClassName}
              >
                Newest → Oldest
                {sortDirection === "newest" && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleSortDirection("oldest")}
                className={filterMenuItemClassName}
              >
                Oldest → Newest
                {sortDirection === "oldest" && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-muted/20 ">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[38%] px-5 text-xs font-medium">
                  Title
                </TableHead>
                <TableHead className="w-[20%] px-2 text-xs font-medium">
                  Platform
                </TableHead>
                <TableHead className="w-[17%] px-2 text-xs font-medium">
                  Duration
                </TableHead>
                <TableHead className="px-2 text-xs font-medium">
                  Last Updated
                </TableHead>
                <TableHead className="w-12 px-2">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b">
              {visibleScripts.length > 0 ? (
                visibleScripts.map((script) => {
                  const contentItemId = script.editor_content.contentItemId;
                  const platforms = script.editor_content.platforms?.length
                    ? script.editor_content.platforms
                    : script.editor_content.platform
                      ? [script.editor_content.platform as Platform]
                      : [];
                  const durationPreset = script.editor_content.durationPreset;
                  return (
                    <TableRow
                      key={script.id}
                      className="group h-12 hover:bg-muted/30"
                    >
                      <TableCell className="px-5 py-1.5">
                        <Button
                          variant="ghost"
                          className="h-auto w-content justify-start gap-2 whitespace-normal px-0 py-0.5 text-left text-[13px] font-medium hover:bg-transparent hover:text-primary"
                          disabled={!contentItemId}
                          title={
                            contentItemId
                              ? undefined
                              : "This legacy script is not linked to a content item"
                          }
                          onClick={() => {
                            if (contentItemId) {
                              handleOpenScript(contentItemId, script.id);
                            }
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="line-clamp-1">{script.title}</span>
                        </Button>
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        {platforms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {platforms.map((platform) => {
                              const option = scriptPlatformOptions.find(
                                (item) => item.value === platform,
                              );
                              if (!option) return null;
                              return (
                                <Badge
                                  key={platform}
                                  variant="outline"
                                  className="gap-1 rounded-lg border-border/80 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                                >
                                  {createElement(option.icon, {
                                    "aria-hidden": true,
                                    className: "h-3 w-3 shrink-0",
                                  })}
                                  {option?.label.toUpperCase()}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                        {durationPreset
                          ? scriptDurationLabels[durationPreset]
                          : script.editor_content.estimatedDuration || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-1.5 text-xs text-muted-foreground">
                        {new Date(script.updated_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded text-muted-foreground opacity-100 transition-[background-color,color,opacity] hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 data-[state=open]:bg-muted data-[state=open]:opacity-100"
                              aria-label={`Actions for ${script.title}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 rounded-[10px] p-1"
                          >
                            <DropdownMenuItem
                              disabled={!contentItemId}
                              className="h-8 rounded px-2 text-xs"
                              onSelect={() => {
                                if (contentItemId) {
                                  handleOpenScript(contentItemId, script.id);
                                }
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit script
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="h-8 rounded px-2 text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onSelect={() =>
                                void handleDeleteScript(script.id)
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-56 text-center">
                    <FilmScriptFill
                      className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                    <p className="font-medium text-foreground">
                      {scripts.length === 0
                        ? "No scripts yet"
                        : "No scripts match these filters"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {scripts.length === 0
                        ? "Create your first script to see it here."
                        : "Adjust the search or filters to see more results."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <footer className="flex min-h-14 items-center justify-between gap-3 border-t border-border/70 px-5 py-2.5 text-xs text-muted-foreground">
          <p>
            Page {currentPage} · Viewing{" "}
            <span className="font-medium text-foreground">
              {filteredScripts.length}
            </span>{" "}
            {filteredScripts.length === 1 ? "script" : "scripts"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-border/80"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous scripts page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-border/80"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next scripts page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
