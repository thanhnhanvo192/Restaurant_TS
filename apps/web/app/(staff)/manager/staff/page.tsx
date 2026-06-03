"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Plus, 
  Edit, 
  UserCheck, 
  UserX, 
  Search, 
  Mail, 
  Phone, 
  Key, 
  Shield 
} from "lucide-react";
import { toast } from "sonner";
import { Staff, StaffRole } from "@/types";

export default function ManagerStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null); // null means "Create" mode
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("receptionist");

  // Fetch staff list
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/auth/staff");
      setStaffList(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách nhân viên.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenCreateDialog = () => {
    setEditingStaff(null);
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffPassword("");
    setStaffRole("receptionist");
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (staff: Staff) => {
    setEditingStaff(staff);
    setStaffName(staff.name);
    setStaffEmail(staff.email);
    setStaffPhone(staff.phone || "");
    setStaffPassword(""); // Empty means keep current password
    setStaffRole(staff.role);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffName.trim() || !staffEmail.trim() || (!editingStaff && !staffPassword)) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: staffName,
        email: staffEmail,
        phone: staffPhone || null,
        role: staffRole,
      };

      if (staffPassword) {
        payload.password = staffPassword;
      }

      if (editingStaff) {
        // Edit mode
        const res = await api.patch(`/api/auth/staff/${editingStaff.id}`, payload);
        setStaffList(staffList.map((s) => (s.id === editingStaff.id ? res.data.data : s)));
        toast.success("Cập nhật thông tin nhân viên thành công!");
      } else {
        // Create mode
        const res = await api.post("/api/auth/staff", payload);
        setStaffList([...staffList, res.data.data]);
        toast.success("Thêm nhân viên mới thành công!");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "Lỗi thao tác trên tài khoản nhân viên.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    const nextStatus = !staff.isActive;
    const confirmMsg = nextStatus
      ? `Bạn có muốn kích hoạt lại tài khoản của ${staff.name}?`
      : `Bạn có muốn vô hiệu hoá (soft-delete) tài khoản của ${staff.name}? Nhân viên này sẽ không thể đăng nhập hệ thống.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.patch(`/api/auth/staff/${staff.id}`, {
        isActive: nextStatus,
      });
      setStaffList(staffList.map((s) => (s.id === staff.id ? { ...s, isActive: res.data.data.isActive } : s)));
      toast.success(
        nextStatus
          ? `Đã kích hoạt lại tài khoản cho ${staff.name}!`
          : `Đã vô hiệu hoá tài khoản của ${staff.name}!`
      );
    } catch (error) {
      console.error(error);
      toast.error("Không thể thay đổi trạng thái tài khoản nhân viên.");
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery));
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case "manager":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold px-2 py-0.5">
            Quản lý
          </Badge>
        );
      case "receptionist":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold px-2 py-0.5">
            Lễ tân
          </Badge>
        );
      case "warehouse":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-xs font-semibold px-2 py-0.5">
            Thủ kho
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-10 focus:border-amber-500 transition w-full h-10"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 px-3 text-zinc-100 text-sm h-10 w-full sm:w-48 outline-none focus:border-amber-500 transition"
          >
            <option value="all">Tất cả chức vụ</option>
            <option value="manager">Quản lý</option>
            <option value="receptionist">Lễ tân</option>
            <option value="warehouse">Thủ kho</option>
          </select>
        </div>

        {/* Add Staff Button */}
        <Button
          onClick={handleOpenCreateDialog}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl h-10 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Thêm nhân viên mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm text-zinc-400">Đang tải danh sách nhân viên...</p>
          </div>
        </div>
      ) : (
        /* Staff Table */
        <Card className="border-zinc-800 bg-zinc-900 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <th className="p-4 pl-6">Họ và tên</th>
                  <th className="p-4">Chức vụ</th>
                  <th className="p-4">Thông tin liên lạc</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Ngày tạo</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-zinc-500">
                      Không tìm thấy nhân viên nào phù hợp.
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className={`hover:bg-zinc-850/20 transition-colors ${!staff.isActive ? "opacity-50" : ""}`}>
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex w-9 h-9 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-750 text-amber-500 font-bold text-sm">
                            {staff.name[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{staff.name}</span>
                            <span className="text-[10px] text-zinc-500">Mã NV: #{staff.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(staff.role)}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                          <Mail className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{staff.email}</span>
                        </div>
                        {staff.phone && (
                          <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="secondary"
                          className={`px-2 py-0.5 text-[10px] font-bold border capitalize ${
                            staff.isActive
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {staff.isActive ? "Hoạt động" : "Ngưng hoạt động"}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-400 text-xs">
                        {new Date(staff.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(staff)}
                            className="border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 h-8 w-8 rounded-lg cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(staff)}
                            className={`border-zinc-800 hover:bg-zinc-800/60 h-8 w-8 rounded-lg cursor-pointer ${
                              staff.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"
                            }`}
                            title={staff.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Staff Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white font-heading">
              {editingStaff ? `Cập nhật nhân viên: ${editingStaff.name}` : "Thêm nhân viên mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Cung cấp các thông tin tài khoản nhân viên dưới đây.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium block">Họ và tên <span className="text-red-500">*</span></label>
              <Input
                placeholder="Nhập họ và tên..."
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white rounded-xl focus:border-amber-500 transition"
                required
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Email đăng nhập <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="name@restaurant.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-9 focus:border-amber-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="09xxxxxxxx"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-9 focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Role & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">Chức vụ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 pl-9 text-zinc-100 text-sm h-10 w-full outline-none focus:border-amber-500 transition"
                    required
                  >
                    <option value="receptionist">Lễ tân</option>
                    <option value="warehouse">Thủ kho</option>
                    <option value="manager">Quản lý</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium block">
                  Mật khẩu {editingStaff ? <span className="text-zinc-500 text-[10px] italic">(Để trống nếu giữ nguyên)</span> : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder={editingStaff ? "••••••••" : "Tối thiểu 6 ký tự"}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl pl-9 focus:border-amber-500 transition"
                    minLength={6}
                    required={!editingStaff}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-zinc-800 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-zinc-800 hover:bg-zinc-800 text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs h-10 w-full sm:w-auto cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingStaff ? (
                  "Lưu thay đổi"
                ) : (
                  "Tạo tài khoản"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
