"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input, Label, FieldGroup } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createUser, updateUserRole, toggleUserActive } from "@/app/(app)/settings/actions";
import type { UserRole } from "@prisma/client";

type UserRow = { id: string; name: string; email: string; role: UserRole; active: boolean };

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");

  function submitAdd() {
    startTransition(async () => {
      const result = await createUser({ name, email, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User added");
      setAddOpen(false);
      setName("");
      setEmail("");
      setRole("STAFF");
      router.refresh();
    });
  }

  function changeRole(id: string, newRole: UserRole) {
    startTransition(async () => {
      await updateUserRole(id, newRole);
      router.refresh();
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      await toggleUserActive(id, active);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users & permissions</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add user</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Active</TH></TR>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">{u.name}</TD>
                <TD className="text-text-secondary">{u.email}</TD>
                <TD>
                  <Select className="h-8 w-36 text-xs" value={u.role} onChange={(e) => changeRole(u.id, e.target.value as UserRole)} disabled={pending}>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                  </Select>
                </TD>
                <TD><Switch checked={u.active} onCheckedChange={(v) => toggleActive(u.id, v)} disabled={pending} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
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
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldGroup>
            <FieldGroup>
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </Select>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={pending || !name || !email}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
