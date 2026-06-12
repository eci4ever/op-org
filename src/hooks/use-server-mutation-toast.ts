import {
	type UseMutateFunction,
	type UseMutationResult,
	useMutation,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

type MutationMessage<TData, TVariables> =
	| string
	| ((data: TData, variables: TVariables) => string);

type ErrorMessage<TError> = string | ((error: TError) => string);

type ServerMutationToastOptions<TData, TError, TVariables> = {
	mutationFn: (variables: TVariables) => Promise<TData>;
	successMessage?: MutationMessage<TData, TVariables>;
	errorMessage: ErrorMessage<TError>;
	invalidate?: boolean;
	onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
	onError?: (error: TError, variables: TVariables) => void;
};

type ServerMutationToastResult<TData, TError, TVariables> = UseMutationResult<
	TData,
	TError,
	TVariables
> & {
	mutate: UseMutateFunction<TData, TError, TVariables>;
};

function resolveErrorMessage<TError>(
	error: TError,
	message: ErrorMessage<TError>,
) {
	if (typeof message === "function") {
		return message(error);
	}

	return error instanceof Error ? error.message : message;
}

function resolveSuccessMessage<TData, TVariables>(
	data: TData,
	variables: TVariables,
	message?: MutationMessage<TData, TVariables>,
) {
	if (!message) return null;

	return typeof message === "function" ? message(data, variables) : message;
}

export function useServerMutationToast<
	TData,
	TError = Error,
	TVariables = void,
>({
	mutationFn,
	successMessage,
	errorMessage,
	invalidate = true,
	onSuccess,
	onError,
}: ServerMutationToastOptions<
	TData,
	TError,
	TVariables
>): ServerMutationToastResult<TData, TError, TVariables> {
	const router = useRouter();

	return useMutation<TData, TError, TVariables>({
		mutationFn,
		onSuccess: async (data, variables) => {
			const message = resolveSuccessMessage(data, variables, successMessage);

			if (message) {
				toast.success(message);
			}

			await onSuccess?.(data, variables);

			if (invalidate) {
				await router.invalidate();
			}
		},
		onError: (error, variables) => {
			toast.error(resolveErrorMessage(error, errorMessage));
			onError?.(error, variables);
		},
	});
}
