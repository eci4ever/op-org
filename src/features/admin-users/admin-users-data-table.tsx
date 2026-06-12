import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type {
	AdminUser,
	AdminUsersSearch,
} from "#/features/admin-users/admin-users.types";

type RoleFilter = AdminUsersSearch["role"];

type AdminUsersDataTableProps = {
	users: AdminUser[];
	total: number;
	currentUserId: string;
	search: string;
	roleFilter: RoleFilter;
	page: number;
	pageSize: number;
	totalPages: number;
	setRolePending: boolean;
	unbanPending: boolean;
	impersonatePending: boolean;
	onSearchChange: (value: string) => void;
	onRoleFilterChange: (value: RoleFilter) => void;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	onSetRole: (userId: string, role: "user" | "admin") => void;
	onOpenBan: (userId: string) => void;
	onUnban: (userId: string) => void;
	onListSessions: (user: AdminUser) => void;
	onImpersonate: (userId: string) => void;
	onOpenDelete: (userId: string) => void;
};

export function AdminUsersDataTable({
	users,
	total,
	currentUserId,
	search,
	roleFilter,
	page,
	pageSize,
	totalPages,
	setRolePending,
	unbanPending,
	impersonatePending,
	onSearchChange,
	onRoleFilterChange,
	onPageChange,
	onPageSizeChange,
	onSetRole,
	onOpenBan,
	onUnban,
	onListSessions,
	onImpersonate,
	onOpenDelete,
}: AdminUsersDataTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const pagination: PaginationState = {
		pageIndex: page - 1,
		pageSize,
	};

	const columns = useMemo<ColumnDef<AdminUser>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Name
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => {
					const user = row.original;
					return (
						<div className="flex items-center gap-2">
							{user.image ? (
								<img
									src={user.image}
									alt=""
									className="size-7 rounded-full object-cover"
								/>
							) : (
								<div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
									{user.name.charAt(0).toUpperCase()}
								</div>
							)}
							<span className="font-medium">{user.name}</span>
						</div>
					);
				},
			},
			{
				accessorKey: "email",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Email
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground">{row.original.email}</span>
				),
			},
			{
				accessorKey: "role",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Role
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => {
					const user = row.original;
					const isSelf = user.id === currentUserId;
					return (
						<Select
							value={user.role ?? "user"}
							disabled={isSelf || setRolePending}
							onValueChange={(role) =>
								onSetRole(user.id, role as "user" | "admin")
							}
						>
							<SelectTrigger className="h-8 w-24">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
					);
				},
			},
			{
				accessorKey: "banned",
				header: "Status",
				cell: ({ row }) =>
					row.original.banned ? (
						<Badge variant="destructive">Banned</Badge>
					) : (
						<Badge variant="default">Active</Badge>
					),
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => {
					const user = row.original;
					const isSelf = user.id === currentUserId;
					return (
						<div className="flex flex-wrap gap-1.5">
							{user.banned ? (
								<Button
									variant="outline"
									size="xs"
									disabled={isSelf || unbanPending}
									onClick={() => onUnban(user.id)}
								>
									Unban
								</Button>
							) : (
								<Button
									variant="outline"
									size="xs"
									disabled={isSelf}
									onClick={() => onOpenBan(user.id)}
								>
									Ban
								</Button>
							)}
							<Button
								variant="outline"
								size="xs"
								onClick={() => onListSessions(user)}
							>
								Sessions
							</Button>
							<Button
								variant="outline"
								size="xs"
								disabled={isSelf || impersonatePending}
								onClick={() => onImpersonate(user.id)}
							>
								Impersonate
							</Button>
							<Button
								variant="destructive"
								size="xs"
								disabled={isSelf}
								onClick={() => onOpenDelete(user.id)}
							>
								Delete
							</Button>
						</div>
					);
				},
			},
		],
		[
			currentUserId,
			impersonatePending,
			onImpersonate,
			onListSessions,
			onOpenBan,
			onOpenDelete,
			onSetRole,
			onUnban,
			setRolePending,
			unbanPending,
		],
	);

	const table = useReactTable({
		data: users,
		columns,
		state: {
			pagination,
			sorting,
		},
		manualPagination: true,
		pageCount: totalPages,
		onPaginationChange: (updater) => {
			const next =
				typeof updater === "function" ? updater(pagination) : updater;

			if (next.pageSize !== pageSize) {
				onPageSizeChange(next.pageSize);
				return;
			}

			onPageChange(next.pageIndex + 1);
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const currentPage = totalPages === 0 ? 0 : page;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Users</CardTitle>
				<CardDescription>
					Manage all registered users. Search, filter, and perform admin
					actions.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search by name or email..."
							value={search}
							onChange={(event) => onSearchChange(event.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={roleFilter} onValueChange={onRoleFilterChange}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="Role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All roles</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="user">User</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{users.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No users found.
					</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableHead key={header.id}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows.map((row) => (
										<TableRow key={row.id}>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Rows per page
								</span>
								<Select
									value={String(pageSize)}
									onValueChange={(value) => {
										const nextPageSize = Number(value);
										onPageSizeChange(nextPageSize);
									}}
								>
									<SelectTrigger className="h-8 w-16">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="25">25</SelectItem>
										<SelectItem value="50">50</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Page {currentPage} of {totalPages}
								</span>
								<span className="text-sm text-muted-foreground">
									{total} total
								</span>
								<div className="flex gap-1">
									<Button
										variant="outline"
										size="xs"
										onClick={() => table.previousPage()}
										disabled={!table.getCanPreviousPage()}
									>
										<ChevronLeft className="size-4" />
									</Button>
									<Button
										variant="outline"
										size="xs"
										onClick={() => table.nextPage()}
										disabled={!table.getCanNextPage()}
									>
										<ChevronRight className="size-4" />
									</Button>
								</div>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
