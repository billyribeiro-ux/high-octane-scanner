import type { PageServerLoad } from './$types';
import { getForwardPositions } from '$lib/server/services/forward.service';

export const load: PageServerLoad = async () => {
	return getForwardPositions({ limit: 2000 });
};
