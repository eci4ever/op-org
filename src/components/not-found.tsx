import { Link } from '@tanstack/react-router'

export function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-muted-foreground">The page you are looking for does not exist.</p>
            <Link
                to="/"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
                Back to Home
            </Link>
        </main>
    )
}