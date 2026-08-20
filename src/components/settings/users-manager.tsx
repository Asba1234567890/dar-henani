"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input, Label, FieldGroup } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createUser, updateUserRole, updateUserLanguage, toggleUserActive, resetUserPassword } from "@/app/(app)/settings/actions";
import type { UserRole, Language } from "@prisma/client";

type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  language: Language;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [language, setLanguage] = useState<Language>("EN");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [resetResult, setResetResult] = useState<{ userId: string; password: string } | null>(null);

  function submitAdd() {
    startTransition(async () => {
      const result = await createUser({ name, username, email, role, language, temporaryPassword });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User created");
      setAddOpen(false);
      setName("");
      setUsername("");
      setEmail("");
      setRole("USER");
      setLanguage("EN");
      setTemporaryPassword("");
      router.refresh();
    });
  }

  function changeRole(id: string, newRole: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(id, newRole);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function changeLanguage(id: string, newLanguage: Language) {
    startTransition(async () => {
      const result = await updateUserLanguage(id, newLanguage);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleUserActive(id, active);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function handleResetPassword(id: string) {
    startTransition(async () => {
      const result = await resetUserPassword(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setResetResult({ userId: id, password: result.temporaryPassword });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users &amp; permissions</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add user</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR><TH>Name</TH><TH>Username</TH><TH>Role</TH><TH>Language</TH><TH>Status</TH><TH>Actions</TH></TR>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">
                    {u.name}
                    {u.id === currentUserId && <Badge variant="info" className="ml-2">You</Badge>}
                  </TD>
                  <TD className="text-text-secondary">{u.username}</TD>
                  <TD>
                    <Select
                      className="h-8 w-36 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      disabled={pending || u.id === currentUserId}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="USER">Normal user</option>
                    </Select>
                  </TD>
                  <TD>
                    <Select
                      className="h-8 w-28 text-xs"
                      value={u.language}
                      onChange={(e) => changeLanguage(u.id, e.target.value as Language)}
                      disabled={pending}
                    >
                      <option value="EN">English</option>
                      <option value="FR">Français</option>
                    </Select>
                  </TD>
                  <TD><Switch checked={u.active} onCheckedChange={(v) => toggleActive(u.id, v)} disabled={pending || u.id === currentUserId} /></TD>
                  <TD>
                    <Button size="sm" variant="outline" onClick={() => handleResetPassword(u.id)} disabled={pending}>
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
          <div className="space-y-4 px-6 py-2">
            <FieldGroup>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. fatima" />
            </FieldGroup>
            <FieldGroup>
              <Label>Email (optional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="ADMIN">Admin</option>
                <option value="USER">Normal user</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option value="EN">English</option>
                <option value="FR">Français</option>
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label>Temporary password</Label>
              <Input value={temporaryPassword} onChange={(e) => setTemporaryPassword(e.target.value)} placeholder="At least 8 characters" />
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={pending || !name || !username || temporaryPassword.length < 8}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetResult} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Temporary password</DialogTitle></DialogHeader>
          <div className="space-y-3 px-6 py-2 text-sm">
            <p className="text-text-secondary">
              Share this password with the user through a secure channel. It will not be shown again — the user should change it after signing in.
            </p>
            <p className="rounded-[var(--radius-sm)] bg-muted px-3 py-2 font-mono text-base tracking-wide">{resetResult?.password}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
