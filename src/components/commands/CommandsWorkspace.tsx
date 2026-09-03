import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Terminal, Trash2, Workflow } from "lucide-react";
import type { Command } from "@/types/bot";
import { createCommand } from "@/data/factories";
import { createCommandFlowNodes } from "@/data/flow-factories";
import { useFlowStore } from "@/stores/useFlowStore";
import { uid, slugify } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { usePlan } from "@/hooks/usePlan";
import { PLAN_LABEL, limitLabel } from "@/data/plan-limits";
import { toast } from "sonner";

/** Small pre-step: only name + description, then we jump straight into the flow builder. */
function NewCommandDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("new-command");
  const [description, setDescription] = useState("Describe what this command does");
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New slash command</DialogTitle>
          <DialogDescription>Name it, then design the logic on the visual canvas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-cmd-name">Name</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">/</span>
              <Input id="new-cmd-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-cmd-desc">Description</Label>
            <Input id="new-cmd-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => {
              const slug = slugify(name);
              if (!slug) {
                setError("Command name is required.");
                return;
              }
              onCreate(slug, description);
            }}
          >
            <Workflow className="size-4" /> Open builder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommandsWorkspace({
  commands,
  onChange,
}: {
  commands: Command[];
  onChange: (next: Command[]) => void;
}) {
  const navigate = useNavigate();
  const { plan, limits, canAddCommand } = usePlan();
  const canAdd = canAddCommand(commands.length);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Command | null>(null);
  const [query, setQuery] = useState("");

  const filtered = commands.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()),
  );

  const openBuilder = (flowId: string) => navigate({ to: "/builder/$flowId", params: { flowId } });

  /** Create (or reuse) the flow that implements a command and jump into the builder. */
  const editInBuilder = (command: Command) => {
    const store = useFlowStore.getState();
    if (command.flowId && store.flows[command.flowId]) {
      void openBuilder(command.flowId);
      return;
    }
    const flowId = store.newFlow(`/${command.name}`);
    useFlowStore.getState().setNodes([createCommandFlowNodes(command.name, command.description)]);
    useFlowStore.getState().commit();
    onChange(commands.map((x) => (x.id === command.id ? { ...x, flowId } : x)));
    void openBuilder(flowId);
  };

  const createAndOpen = (name: string, description: string) => {
    const command = createCommand({ name, description });
    const flowId = useFlowStore.getState().newFlow(`/${name}`);
    useFlowStore.getState().setNodes([createCommandFlowNodes(name, description)]);
    useFlowStore.getState().commit();
    onChange([...commands, { ...command, flowId }]);
    setCreating(false);
    toast.success(`/${name} created`);
    void openBuilder(flowId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search commands"
          aria-label="Search commands"
          className="max-w-xs"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {commands.length}/{limitLabel(limits.commands)} · plan {PLAN_LABEL[plan]}
        </span>
        <Button
          className="gap-1.5"
          disabled={!canAdd}
          title={canAdd ? undefined : `Command limit reached on the ${PLAN_LABEL[plan]} plan`}
          onClick={() => {
            if (!canAdd) {
              toast.error(`Limit komend w planie ${PLAN_LABEL[plan]}`, {
                description: "Redeem a code for a higher plan in Plan & billing.",
              });
              return;
            }
            setCreating(true);
          }}
        >
          <Plus className="size-4" /> New command
        </Button>
      </div>


      {commands.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No commands yet."
          description="Create your first slash command and design its logic in the visual builder."
          actionLabel="Create command"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Command</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Description</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Flow</th>
                <th className="px-4 py-2.5 font-medium">Enabled</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-foreground">/{c.name}</span>
                    {c.options.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">{c.options.length} options</span>
                    )}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-muted-foreground md:table-cell">{c.description}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {c.flowId ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Flow ready
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not built yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={c.enabled}
                      aria-label={`Toggle /${c.name}`}
                      onCheckedChange={(v) => onChange(commands.map((x) => (x.id === c.id ? { ...x, enabled: v } : x)))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit /${c.name} in builder`}
                        onClick={() => editInBuilder(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Duplicate /${c.name}`}
                        onClick={() => {
                          const copy = {
                            ...structuredClone(c),
                            id: uid("cmd"),
                            name: `${c.name}-copy`,
                            flowId: null,
                          };
                          onChange([...commands, copy]);
                          toast.success(`/${copy.name} created`);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete /${c.name}`} onClick={() => setDeleting(c)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No commands match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && <NewCommandDialog open onOpenChange={setCreating} onCreate={createAndOpen} />}

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete /{deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the command from your bot configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) {
                  onChange(commands.filter((x) => x.id !== deleting.id));
                  toast.success(`/${deleting.name} deleted`);
                }
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
