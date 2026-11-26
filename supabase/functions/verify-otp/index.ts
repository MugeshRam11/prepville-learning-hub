import {guardianHandler} from '../_shared/guardian.ts';
Deno.serve(guardianHandler(true));
