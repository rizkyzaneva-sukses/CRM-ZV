import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Data dianggap fresh selama 5 menit — tidak di-refetch ulang saat itu
			staleTime: 5 * 60 * 1000,
			// Cache dibersihkan dari memori setelah 10 menit tidak digunakan
			// Ini mencegah akumulasi data besar yang menyebabkan OOM crash
			gcTime: 10 * 60 * 1000,
		},
	},
});