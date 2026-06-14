import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	Building2,
	ChevronLeft,
	ChevronRight,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
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
import type { OrgWithMeta } from "#/features/organizations/organization.functions";

type AdminOrganizationsDataTableProps = {
	organizations: OrgWithMeta[];
	onCreate: () => void;
	onDelete: (organization: OrgWithMeta) => void;
};

export function AdminOrganizationsDataTable({
	organizations,
	onCreate,
	onDelete,
}: AdminOrganizationsDataTableProps) {
	const [search, setSearch] = useState("");
	const [sorting, setSorting] = useState<SortingState>([]);
	const [pageSize, setPageSize] = useState(10);

	const columns = useMemo<ColumnDef<OrgWithMeta>[]>(
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
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<div className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
							<Building2 className="size-4" />
						</div>
						<span className="font-medium">{row.original.name}</span>
					</div>
				),
			},
			{
				accessorKey: "slug",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Slug
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => (
					<span className="font-mono text-sm text-muted-foreground">
						{row.original.slug}
					</span>
				),
			},
			{
				accessorKey: "memberCount",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Members
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => (
					<Badge variant="secondary">{row.original.memberCount}</Badge>
				),
			},
			{
				id: "owner",
				accessorFn: (row) => `${row.ownerName ?? ""} ${row.ownerEmail ?? ""}`,
				header: "Owner",
				cell: ({ row }) =>
					row.original.ownerName ? (
						<div className="text-sm">
							<p className="font-medium">{row.original.ownerName}</p>
							<p className="text-xs text-muted-foreground">
								{row.original.ownerEmail}
							</p>
						</div>
					) : (
						<span className="text-muted-foreground">—</span>
					),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<button
						type="button"
						className="inline-flex items-center gap-1 font-medium"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Created
						<ArrowUpDown className="size-3.5" />
					</button>
				),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{new Date(row.original.createdAt).toLocaleDateString()}
					</span>
				),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<Button
						variant="ghost"
						size="sm"
						className="text-destructive"
						onClick={() => onDelete(row.original)}
					>
						<Trash2 />
					</Button>
				),
			},
		],
		[onDelete],
	);

	const table = useReactTable({
		data: organizations,
		columns,
		state: {
			globalFilter: search,
			sorting,
		},
		onGlobalFilterChange: setSearch,
		onSortingChange: setSorting,
		globalFilterFn: (row, _columnId, filterValue) => {
			const value = String(filterValue).toLowerCase();
			const organization = row.original;

			return (
				organization.name.toLowerCase().includes(value) ||
				organization.slug.toLowerCase().includes(value)
			);
		},
		initialState: {
			pagination: {
				pageSize,
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const rows = table.getRowModel().rows;
	const pageIndex = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();
	const currentPage = pageCount === 0 ? 0 : pageIndex + 1;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Organizations</CardTitle>
						<CardDescription>
							{organizations.length} organization
							{organizations.length !== 1 ? "s" : ""} total
						</CardDescription>
					</div>
					<div className="flex items-center gap-3">
						<div className="relative w-64">
							<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by name or slug..."
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								className="pl-8"
							/>
						</div>
						<Button onClick={onCreate}>
							<Plus data-icon="inline-start" />
							Create
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
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
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="text-center text-muted-foreground"
								>
									{search
										? "No organizations match your search."
										: "No organizations found."}
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
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
							))
						)}
					</TableBody>
				</Table>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Rows per page</span>
						<Select
							value={String(pageSize)}
							onValueChange={(value) => {
								const nextPageSize = Number(value);
								setPageSize(nextPageSize);
								table.setPageSize(nextPageSize);
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
							Page {currentPage} of {pageCount}
						</span>
						<span className="text-sm text-muted-foreground">
							{table.getFilteredRowModel().rows.length} shown
						</span>
						<div className="flex gap-1">
							<Button
								variant="outline"
								size="xs"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft />
							</Button>
							<Button
								variant="outline"
								size="xs"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight />
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
