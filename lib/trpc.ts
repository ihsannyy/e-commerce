import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../app/api/[...route]/route'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
})
