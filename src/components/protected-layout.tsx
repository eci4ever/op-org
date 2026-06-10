import React, { type ReactNode } from "react";
import { toast } from "sonner";
import { AppSidebar } from "#/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth-client";

interface Crumb {
	label: string;
	href?: string;
}

export function ProtectedLayout({
	breadcrumbs,
	children,
}: {
	breadcrumbs?: Crumb[];
	children: ReactNode;
}) {
	const { data: session } = authClient.useSession();
	const isImpersonating = !!session?.session?.impersonatedBy;

	const handleStopImpersonating = async () => {
		const { error } = await authClient.admin.stopImpersonating();
		if (error) {
			toast.error(error.message ?? "Failed to stop impersonating");
		} else {
			toast.success("Stopped impersonating");
			window.location.href = "/dashboard";
		}
	};

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						{breadcrumbs && breadcrumbs.length > 0 && (
							<Breadcrumb>
								<BreadcrumbList>
									{breadcrumbs.map((crumb, i) => (
										<React.Fragment key={crumb.label}>
											{i > 0 && (
												<BreadcrumbSeparator className="hidden md:block" />
											)}
											<BreadcrumbItem
												className={
													i < breadcrumbs.length - 1 ? "hidden md:block" : ""
												}
											>
												{crumb.href ? (
													<BreadcrumbLink href={crumb.href}>
														{crumb.label}
													</BreadcrumbLink>
												) : (
													<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
												)}
											</BreadcrumbItem>
										</React.Fragment>
									))}
								</BreadcrumbList>
							</Breadcrumb>
						)}
					</div>
				</header>
				{isImpersonating && (
					<div className="mx-4 mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
						<div className="flex items-center gap-2 text-sm font-medium text-amber-800">
							<span className="flex size-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold">
								!
							</span>
							You are impersonating{" "}
							<span className="font-semibold">{session?.user?.name}</span>
						</div>
						<Button
							variant="outline"
							size="xs"
							className="border-amber-300 text-amber-800 hover:bg-amber-100"
							onClick={handleStopImpersonating}
						>
							Stop impersonating
						</Button>
					</div>
				)}
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
