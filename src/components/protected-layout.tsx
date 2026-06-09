import React, { type ReactNode } from "react";
import { AppSidebar } from "#/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Separator } from "#/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";

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
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
